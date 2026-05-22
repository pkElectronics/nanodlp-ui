function onIotControlToggle(post=true){

    var state = document.getElementById('iot-control-toggle').checked;

    if(post){
      fetch('/athena-iot/mqtt/status', {
            headers: {'Content-Type': 'application/json'},
            method: 'post',
            body: JSON.stringify({"status":state}),
        });
    }

    if(state){
        document.getElementById('iot-control-qr').style.display = 'block';
        document.getElementById('iot-control-text').style.display = 'block';
    }else{
        document.getElementById('iot-control-qr').style.display = 'none';
        document.getElementById('iot-control-text').style.display = 'none';
    }
}

function onAssetSyncToggle(post=true){

    let state = document.getElementById('asset-sync-toggle').checked;

    if(post){
        fetch('/athena-iot/asset_sync/status', {
            headers: {'Content-Type': 'application/json'},
            method: 'post',
            body: JSON.stringify({"status":state}),
        });
    }

}

async function fetchIotConnectionData() {
    const response = await fetch('/athena-iot/printer_name', {});
    const data = await response.json();

    if (data) {
        document.getElementById('iot-control-printername').innerText = data["printer_name"];
        document.getElementById('iot-control-printerserial').innerText = data["printer_serial"];
    }
}

async function fetchIotState(){
    const response = await fetch('/athena-iot/mqtt/status', {});
    const data = await response.json();

    if (data) {
        document.getElementById("iot-control").style.display = "block";
        document.getElementById('iot-control-toggle').checked = data["status"];
        onIotControlToggle(post=false);
    }

}


async function fetchAssetSyncState(){
    const response = await fetch('/athena-iot/asset_sync/status', {});
    const data = await response.json();

    if (data) {
        document.getElementById('asset-sync-toggle').checked = data["status"];
        onAssetSyncToggle(post=false);
    }

}


async function onPageLoad() {
    await fetchIotConnectionData();
    await fetchIotState();
    await fetchAssetSyncState();
    document.getElementById("iot-control-toggle").addEventListener("click", onIotControlToggle)
    document.getElementById("asset-sync-toggle").addEventListener("click", onAssetSyncToggle)
}


$(document).ready(function () {
    onPageLoad();
});