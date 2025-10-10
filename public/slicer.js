importScripts("wasm_exec.js")

var wasmInitialized = false;
var wasmInitPromise = null;

function initWasmFromBytes(wasmBytes) {
    if (wasmInitialized) {
        return Promise.resolve();
    }
    
    if (wasmInitPromise) {
        return wasmInitPromise;
    }
    
    wasmInitPromise = new Promise((resolve, reject) => {
        const go = new Go();
        WebAssembly.instantiate(wasmBytes, go.importObject)
            .then(result => {
                go.run(result.instance);
                wasmInitialized = true;
                resolve();
            })
            .catch(reject);
    });
    
    return wasmInitPromise;
}

function updatePlateID(plateID){
	postMessage(["plateIDUpdate",plateID]);
}

function post_render(data){
	postMessage(["renderLayer",data]);
}

function WASMIsReady(){
	postMessage(["workerReady"]);
}

// Store worker index for tracking
var workerIndex = null;

onmessage = function(e) {
	if (e.data[0]=="initWasm") {
		initWasmFromBytes(e.data[1]).then(() => {
			postMessage(["workerReady"]);
		}).catch(error => {
			postMessage(["workerError", "WASM initialization failed: " + error.message]);
		});
	} else if (e.data[0]=="slice"){
		BrowserSliceUpload(e.data[1], e.data[2], e.data[3]);
		postMessage(["sliceFinished"]);
	} else if (e.data[0]=="WASMRenderLayer"){
		// Store the worker index from the message if provided
		if (e.data.length > 2) {
			workerIndex = e.data[2];
		}
		WASMRenderLayer(e.data[1]);
		postMessage(["layerRenderFinished", null, workerIndex]);
	} else if (e.data[0]=="setWorkerIndex") {
		workerIndex = e.data[1];
	}
}
