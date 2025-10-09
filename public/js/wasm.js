function markProgress(){
    lastProgressTs = Date.now();
}

function restartWorkers(){
    try { nanodlpCore && nanodlpCore.terminate && nanodlpCore.terminate(); } catch(e){}
    for (var i=0;i<nanodlpWorker.length;i++){
        try { nanodlpWorker[i] && nanodlpWorker[i].terminate && nanodlpWorker[i].terminate(); } catch(e){}
    }
    workerReady = 0;
    createWorkers();
}

var onmessageEvents = function(e) {
    if (e.data[0]=="layerRenderFinished"){
            finishedLayer++;
            update_progress();
            markProgress();
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
        markProgress();
        nanodlpWorker[processLayer%workerCount].postMessage(["WASMRenderLayer",e.data[1]]);
    } else if (e.data[0]=="console"){
        console.log(e.data);
    } else if (e.data[0]=="plateIDUpdate"){
        plateID=e.data[1];
    } else if (e.data[0]=="sliceProgress"){
        layerCount=e.data[1];
        markProgress();
    } else if (e.data[0]=="workerReady"){
        workerReady++;
        update_slice_button(); // Update button state when worker becomes ready
    } else if (e.data[0]=="workerError"){
        reportWasmError(e.data[1]||"Unknown worker error");
    }
}
workerReady = 0;
workerCount = window.navigator.hardwareConcurrency-1;
if (workerCount<1) workerCount=1;
var nanodlpWorker=[];
var nanodlpCore;

function createWorkers(){
    nanodlpCore = new Worker('/s/slicer.js');
    nanodlpCore.onmessage = onmessageEvents;
    nanodlpCore.onerror = function(){ reportWasmError("Core worker error"); };
    nanodlpWorker = [];
    for (var i=0;i<workerCount;i++){
        var w = new Worker('/s/slicer.js');
        w.onmessage = onmessageEvents;
        w.onerror = function(){ reportWasmError("Render worker error"); };
        nanodlpWorker.push(w);
    }
}

createWorkers();
update_slice_button();
var zipFileElement = document.getElementById('ZipFile');
var browserSliceElement = document.getElementById('browser_slice');
if (zipFileElement!==null){
    zipFileElement.addEventListener('change', function() {
        update_slice_button();
    });
    if (browserSliceElement) {
        browserSliceElement.addEventListener('click', function() {
            $("#ZipFile")[0].disabled=true;
            $.post('/api/v1/wasm/plate/add/', $("#browser_slice").parents("form").serialize(), function(data) {
                save_source_file(data["PlateID"]);
                $(".progress").removeClass("hide");
                $("#browser_slice").parents("form").find("input,button").prop("disabled",true);
                var reader = new FileReader();
                reader.onload = function() {
                    // TODO: Prevent possible reallocation
                    var bytes = new Uint8Array(reader.result);
                    nanodlpCore.postMessage(["slice",window.location.origin, JSON.stringify(data), bytes]);
                }
                reader.readAsArrayBuffer(document.getElementById('ZipFile').files[0]);
            });
        });
    }
}
var processLayer = 0;
var finishedLayer = 0;
var layerCount = 0;
var plateID = 0;
nanodlpCore.onmessage = onmessageEvents;
var current_finished_layer=0;
var lastProgressTs = Date.now();
var stallWatchdog = setInterval(function(){
    // If slicing started (layerCount>0) and no progress for 30s, attempt recovery
    if (layerCount>0 && (Date.now()-lastProgressTs)>30000){
        reportWasmError("Slicing stalled");
    }
}, 5000);

function update_progress(){
    // Prevent negative progress
    if (current_finished_layer<finishedLayer)current_finished_layer=finishedLayer;
    $(".progress-bar-main").css("width",current_finished_layer*100/layerCount+"%");
}

function update_slice_button(){
    if (document.getElementById('ZipFile')===null) return;
    var sliceButton = document.getElementById('browser_slice');
    if (!sliceButton) return;
    var filename = document.getElementById('ZipFile').value;
    var ext = filename.substr(filename.length - 3, 3).toLowerCase();
    // Check if file is STL, under size limit, core worker exists, and all workers are ready
    if ( ext == "stl"&&$("#ZipFile")[0].files[0].size<5000000000&&typeof(nanodlpCore)!=="undefined"&&workerReady>=workerCount+1) { // ||  ext == "obj"
        sliceButton.disabled=false;
    } else {
        sliceButton.disabled=true;
    }
}

function reportWasmError(msg){
    try {
        console.error("WASM:", msg);
        $(".progress").addClass("hide");
        $("#browser_slice").parents("form").find("input,button").prop("disabled",false);
        var sliceButton = document.getElementById('browser_slice');
        if (sliceButton) {
            sliceButton.disabled = false;
        }
        // Restart workers to recover
        restartWorkers();
        update_slice_button();
        // Optional: show toast
        if (window.toastr){ toastr.error("Web slicing stalled. Workers restarted."); }
    } catch(e){ console.error(e); }
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
        if (typeof(nanodlpCore)!=="undefined") {
            nanodlpCore.postMessage(["slice",window.location.origin, JSON.stringify($("#wasm").data("options")), bytes]);
        }
      }
    };
    xhr.send();
}

checkRegenerate();
