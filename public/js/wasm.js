// Worker tracking and queue system
var workerBusy = []; // Track which workers are busy
var workQueue = []; // Queue of pending work items

var onmessageEvents = function(e) {
    if (e.data[0]=="layerRenderFinished"){
            finishedLayer++;
            update_progress();
            // Mark worker as available and process next item in queue
            var workerIndex = e.data[2]; // Get worker index from message
            if (workerIndex !== undefined) {
                workerBusy[workerIndex] = false;
                processWorkQueue();
            }
    } else if (e.data[0]=="sliceFinished"){
        nanodlpCore.terminate();
        setInterval(function(){
            if (processLayer!=finishedLayer){
                update_progress();
                return;
            }
            $.get('/api/v1/wasm/plate/'+plateID+'/verify',function(){
                window.location.href = "/plates";
            });
        }, 1000);
    } else if (e.data[0]=="renderLayer"){
        processLayer++;
        update_progress();
        // Queue the work instead of immediately dispatching
        queueWork(["WASMRenderLayer", e.data[1]]);
    } else if (e.data[0]=="console"){
        console.log(e.data);
    } else if (e.data[0]=="plateIDUpdate"){
        plateID=e.data[1];
    } else if (e.data[0]=="sliceProgress"){
        layerCount=e.data[1];
    } else if (e.data[0]=="workerReady"){
        workerReady++;
        update_slice_button();
    }
}

// Function to add work to the queue
function queueWork(workData) {
    workQueue.push(workData);
    processWorkQueue();
}

// Function to process work from queue when workers are available
function processWorkQueue() {
    if (workQueue.length === 0) return;
    
    // Find an available worker
    var availableWorker = -1;
    for (var i = 0; i < workerCount; i++) {
        if (!workerBusy[i]) {
            availableWorker = i;
            break;
        }
    }
    
    // If no worker is available, wait for one to finish
    if (availableWorker === -1) {
        return;
    }
    
    // Get the next work item
    var workItem = workQueue.shift();
    
    // Mark worker as busy and dispatch work
    workerBusy[availableWorker] = true;
    
    // Special handling for WASMRenderLayer to track which worker is processing it
    if (workItem[0] === "WASMRenderLayer") {
        // Send the work with the worker index
        nanodlpWorker[availableWorker].postMessage([workItem[0], workItem[1], availableWorker]);
    } else {
        nanodlpWorker[availableWorker].postMessage(workItem);
    }
}
workerReady = 0;
update_slice_button();
var nanodlpCore = new Worker('/s/slicer.js');
update_slice_button();
workerCount = window.navigator.hardwareConcurrency-1;
if (workerCount<1)workerCount=1;
var nanodlpWorker=[];

// Initialize worker tracking arrays
for (var i=0;i<workerCount;i++){
    workerBusy[i] = false; // Initialize all workers as available
}

for (var i=0;i<workerCount;i++){
    nanodlpWorker.push(new Worker('/s/slicer.js'));
    nanodlpWorker[i].onmessage = onmessageEvents;
    // Set worker index for tracking
    nanodlpWorker[i].postMessage(["setWorkerIndex", i]);
}

// Download WASM once and share with all workers
var wasmDownloadPromise = null;
var sharedWasmBytes = null;

function downloadWasmOnce() {
    if (wasmDownloadPromise) {
        return wasmDownloadPromise;
    }
    
    wasmDownloadPromise = fetch("/s/nanodlp.wasm?1")
        .then(response => response.arrayBuffer())
        .then(bytes => {
            sharedWasmBytes = bytes;
            return bytes;
        })
        .catch(error => {
            console.error('Failed to download WASM:', error);
            wasmDownloadPromise = null;
            throw error;
        });
    
    return wasmDownloadPromise;
}

// Initialize all workers with shared WASM
function initializeAllWorkers() {
    downloadWasmOnce().then(wasmBytes => {
        // Send WASM bytes to all render workers
        nanodlpWorker.forEach(function(worker) {
            worker.postMessage(["initWasm", wasmBytes]);
        });
        // Also send to core worker
        nanodlpCore.postMessage(["initWasm", wasmBytes]);
    }).catch(error => {
        console.error("Failed to download and distribute WASM:", error);
    });
}

// Initialize workers when page loads
setTimeout(initializeAllWorkers, 100);

if (document.getElementById('ZipFile')!==null){
    document.getElementById('ZipFile').addEventListener('change', function() {
        update_slice_button();
    });
    document.getElementById('browser_slice').addEventListener('click', function() {
        $("#ZipFile")[0].disabled=true;
        $.post('/api/v1/wasm/plate/add/', $("#browser_slice").parents("form").serialize(), function(data) {
            save_source_file(data["PlateID"]);
            $(".progress").removeClass("hide");
            $("#browser_slice").parents("form").find("input,button").prop("disabled",true);
            var reader = new FileReader();
            reader.onload = function() {
                var bytes = new Uint8Array(reader.result);
                nanodlpCore.postMessage(["slice",window.location.origin, JSON.stringify(data), bytes]);
            }
            reader.readAsArrayBuffer(document.getElementById('ZipFile').files[0]);
        });		
    });
}
var processLayer = 0;
var finishedLayer = 0;
var layerCount = 0;
var plateID = 0;
nanodlpCore.onmessage = onmessageEvents;
var current_finished_layer=0;
function update_progress(){
    if (current_finished_layer<finishedLayer)current_finished_layer=finishedLayer;
    $(".progress-bar-main").css("width",current_finished_layer*100/layerCount+"%");
}

function update_slice_button(){
    if (document.getElementById('ZipFile')===null) return;
    var filename = document.getElementById('ZipFile').value;
    var ext = filename.substr(filename.length - 3, 3).toLowerCase();
    if ( ext == "stl"&&$("#ZipFile")[0].files[0].size<5000000000&&typeof(nanodlpCore)!=="undefined"&&workerReady>=workerCount+1) {
        document.getElementById('browser_slice').disabled=false;
    } else {
        document.getElementById('browser_slice').disabled=true;
    }
}

function save_source_file(plateID){
    $("#ZipFile")[0].disabled=false;
    var form_data = new FormData($("#browser_slice").parents("form")[0]);
    $.ajax({
        method: 'post',
        processData: false,
        contentType: false,
        cache: false,
        data: form_data,
        enctype: 'multipart/form-data',
        url: "/api/v1/wasm/plate/add/source/"+plateID
    });
}

function checkRegenerate(){
    if (document.getElementById('wasm')===null) return;
    if (!window.jQuery || workerReady<workerCount+1 || typeof(nanodlpCore)==="undefined") {
        setTimeout(function() { checkRegenerate() }, 50);
        return
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', $("#wasm").data("source"), true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      if (this.status == 200) {
        var bytes = new Uint8Array(this.response);
        nanodlpCore.postMessage(["slice",window.location.origin, JSON.stringify($("#wasm").data("options")), bytes]);
      }
    };    
    xhr.send();
}

checkRegenerate();
