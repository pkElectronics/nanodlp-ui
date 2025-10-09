importScripts("wasm_exec.js")

const CACHE_KEY = 'nanodlp-wasm-cache';
const DOWNLOAD_LOCK_KEY = 'nanodlp-wasm-download-lock';
const WASM_URL = '/s/nanodlp.wasm?1';
const DOWNLOAD_TIMEOUT = 30000; // 30 seconds

// Helper function for IndexedDB operations
async function dbOperation(operation) {
  return new Promise((resolve) => {
    const request = indexedDB.open('WASMCache', 1);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['wasm'], 'readwrite');
      const store = transaction.objectStore('wasm');
      operation(store, resolve);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('wasm')) {
        db.createObjectStore('wasm');
      }
    };
  });
}

async function loadWASM() {
  try {
    const cached = await getCachedWASM();
    if (cached) { return cached; }
    
    const lockAcquired = await acquireDownloadLock();
    if (lockAcquired) {
      try {
        // Double-check cache after acquiring lock
        const cachedAfterLock = await getCachedWASM();
        if (cachedAfterLock) { return cachedAfterLock; }
        
        const response = await fetch(WASM_URL);
        const wasmBytes = await response.arrayBuffer();
        await cacheWASM(wasmBytes);
        return wasmBytes;
      } finally {
        await releaseDownloadLock();
      }
    } else {
      console.log('WASM download in progress, waiting...');
      await waitForDownload();
      const cached = await getCachedWASM();
      return cached || await loadWASM();
    }
  } catch (error) {
    console.error('Failed to load WASM:', error);
    await releaseDownloadLock();
    throw error;
  }
}

async function acquireDownloadLock() {
  return await dbOperation((store, resolve) => {
    const getRequest = store.get(DOWNLOAD_LOCK_KEY);
    getRequest.onsuccess = () => {
      const lockData = getRequest.result;
      const now = Date.now();
      
      if (lockData && lockData.timestamp && (now - lockData.timestamp) < DOWNLOAD_TIMEOUT) {
        resolve(false);
        return;
      }
      
      store.put({ timestamp: now }, DOWNLOAD_LOCK_KEY);
      resolve(true);
    };
    getRequest.onerror = () => resolve(false);
  });
}

async function releaseDownloadLock() {
  await dbOperation((store, resolve) => {
    store.delete(DOWNLOAD_LOCK_KEY);
    resolve();
  });
}

async function waitForDownload() {
  const maxWaitTime = DOWNLOAD_TIMEOUT + 5000;
  const startTime = Date.now();
  
  while ((Date.now() - startTime) < maxWaitTime) {
    const cached = await getCachedWASM();
    if (cached) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function getCachedWASM() {
  return await dbOperation((store, resolve) => {
    const getRequest = store.get(CACHE_KEY);
    getRequest.onsuccess = () => resolve(getRequest.result?.data || null);
    getRequest.onerror = () => resolve(null);
  });
}

async function cacheWASM(wasmBytes) {
  await dbOperation((store, resolve) => {
    store.put({ data: wasmBytes }, CACHE_KEY);
    resolve();
  });
}

// Load WASM and initialize: single path with one simple retry
(async function initWasm(){
  const runFromBytes = async (bytes) => {
    const go = new Go();
    const res = await WebAssembly.instantiate(bytes, go.importObject);
    go.run(res.instance);
  };

  try {
    const bytes = await loadWASM();
    await runFromBytes(bytes);
    return;
  } catch (e) { /* fallthrough to retry */ }

  // Retry once: clear cache/lock and fetch fresh bytes (no-store)
  await dbOperation((store, resolve) => {
    try { store.delete(CACHE_KEY); } catch(_){ }
    try { store.delete(DOWNLOAD_LOCK_KEY); } catch(_){ }
    resolve();
  });
  try {
    const resp = await fetch(WASM_URL, { cache: 'no-store' });
    const bytes = await resp.arrayBuffer();
    await cacheWASM(bytes);
    await runFromBytes(bytes);
    return;
  } catch (e) { /* final fallback */ }

  // Final fallback: streaming without cache
  try {
    const go = new Go();
    const res = await WebAssembly.instantiateStreaming(fetch(WASM_URL, { cache: 'no-store' }), go.importObject);
    go.run(res.instance);
  } catch (_e) {
    postMessage(["workerError","WASM init failed"]);
  }
})();

// Report uncaught errors from the worker to the main thread
self.addEventListener('error', function(e){
  try { postMessage(["workerError", String(e && (e.message || e.filename) || "Worker error")]); } catch(_) {}
});

self.addEventListener('unhandledrejection', function(e){
  try { postMessage(["workerError", String(e && (e.reason && e.reason.message) || "Unhandled rejection")]); } catch(_) {}
});

function updatePlateID(plateID){
	postMessage(["plateIDUpdate",plateID]);
}

function post_render(data){
	postMessage(["renderLayer",data]);
}

function WASMIsReady(){
	postMessage(["workerReady"]);
}

onmessage = function(e) {
	if (e.data[0]=="slice"){
		// window.location.origin, JSON.stringify(data), bytes
		BrowserSliceUpload(e.data[1], e.data[2], e.data[3]);
		postMessage(["sliceFinished"]);
	} else if (e.data[0]=="WASMRenderLayer"){
		WASMRenderLayer(e.data[1]);
		postMessage(["layerRenderFinished"]);
	}
}
