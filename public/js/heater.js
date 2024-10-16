async function onPageLoad() {
    await fetchInitialTemperature();
    await fetchHeatersEnabled();

    document.getElementById('heater-form').addEventListener('input', (e) => {
        const formData = new FormData(e.target.form);
        const object = Object.fromEntries(formData.entries());

        document.getElementById('heater-value').innerText = `${object.targetTemperature}°C`;

        if (e.target.id === 'chamber-heater-toggle') {
            if (object.chamberHeaterToggle) {
                runGcode(`SET_CHAMBER_HEATER TARGET=${object.targetTemperature}`)
            } else {
                runGcode('SET_CHAMBER_HEATER TARGET=0')
            }
        }

        if (e.target.id === 'vat-heater-toggle') {
            if (object.vatHeaterToggle) {
                runGcode(`SET_VAT_HEATER TARGET=${object.targetTemperature}`)
            } else {
                runGcode('SET_VAT_HEATER TARGET=0')
            }
        }

        if (e.target.id === 'temperature') {
            if (object.chamberHeaterToggle) {
                runGcode(`SET_CHAMBER_HEATER TARGET=${object.targetTemperature}`)
            }

            if (object.vatHeaterToggle) {
                runGcode(`SET_VAT_HEATER TARGET=${object.targetTemperature}`)
            }
        }
    })
}

$(document).ready(function () {
    onPageLoad();
})

async function runGcode(gcode) {
    return await fetch('/gcode', {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        method: 'POST',
        data: new URLSearchParams({
            'gcode': `${gcode}`
        }).toString(),

    });
}

async function fetchInitialTemperature() {
    const response = await fetch('/analytic/value/12', {});
    const currentHeaterTarget = await response.text();

    if (currentHeaterTarget > 0) {
        document.getElementById('temperature').value = Number(currentHeaterTarget);
        document.getElementById('heater-value').innerText = `${currentHeaterTarget.trim()}°C`;

    }
}

async function fetchHeatersEnabled() {
    const response = await fetch('/json/db/machine.json');
    if (response.ok) {

        const machineDetails = await response.json();
        const customValues = machineDetails['CustomValues'];
        const vatHeaterPresent = customValues['VatHeaterPresent'];
        if (vatHeaterPresent === "0") {
            document.getElementById('vat-heater-row').style.display = "block";
        }
        const chamberHeaterPresent = customValues['ChamberHeaterPresent'];
        if (chamberHeaterPresent === "0") {
            document.getElementById('chamber-heater-row').style.display = "block";
        }

        if (vatHeaterPresent !== "0" && chamberHeaterPresent !== "0") {
            document.getElementById('heater-form').style.display = "none";
            document.getElementById('no-heaters-found').style.display = "block"
        }
    }
}