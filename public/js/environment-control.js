async function onPageLoad() {
    await fetchInitialTemperature();
    await fetchHeatersEnabled();
    await fetchHeatersActive();

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
            setTemperature(object);
        }
    })

    document.getElementById('btn-mix-resin').addEventListener('click', (e) => {
        mixResin();
    })

    aegisSetup()
}

$(document).ready(function () {
    onPageLoad();
})

async function setTemperature(object) {
    const heaterTemperature = object.targetTemperature;
    if (object.chamberHeaterToggle) {
        runGcode(`SET_CHAMBER_HEATER TARGET=${heaterTemperature}`)
    }

    if (object.vatHeaterToggle) {
        runGcode(`SET_VAT_HEATER TARGET=${heaterTemperature}`)
    }

    await updateMachineCustomValues((customValues) => {
        return {...customValues, HeaterTemperature: heaterTemperature}
    })
}

async function runGcode(gcode) {
    return await fetch('/gcode', {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        method: 'post',
        body: new URLSearchParams({
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
    } else {
        const machineJsonResponse = await fetch('/json/db/machine.json');
        const machineJsonHeater = await machineJsonResponse.json();
        const temp = machineJsonHeater?.CustomValues?.HeaterTemperature;

        if (temp) {
            document.getElementById('temperature').value = Number(temp);
            document.getElementById('heater-value').innerText = `${temp}°C`;
        }

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

            // dashboard layout triggers
            hideElemIfPresent('heater-column')
            if (!document.getElementById('webcam-column')?.offsetParent) {
                setBootstrapElemSizeIfPresent('printer-control-column', 6)
                setBootstrapElemSizeIfPresent('pressure-chart-column', 6)

                console.log('both heater and webcam are gone')
            }
        }
    }
}

async function fetchHeatersActive() {
    const chamberHeaterActive = await fetchHeaterActive(12);
    if (chamberHeaterActive) {
        document.getElementById('chamber-heater-toggle').checked = true;
    }

    const vatHeaterActive = await fetchHeaterActive(19);
    if (vatHeaterActive) {
        document.getElementById('vat-heater-toggle').checked = true;
    }

}

async function fetchHeaterActive(analyticsId) {
    try {
        const response = await fetch(`/analytic/value/${analyticsId}`)
        if (response.ok) {
            const heaterTarget = parseInt(await response.text());
            if (heaterTarget > 1) {
                return true;
            }
        }
    } catch (_e) {
    }

    return false;
}

async function mixResin() {
    const machineJsonResponse = await fetch('/json/db/machine.json');
    const machineJsonHeater = await machineJsonResponse.json();
    const temperature = machineJsonHeater?.CustomValues?.HeaterTemperature;

    await fetch('/athena-iot/control/preheat_and_mix_standalone', {
        method: 'POST',
        body: JSON.stringify({temperature})
    });
}

// AEGIS CODE

const VOC_CRITICAL_THRESHOLD = 40;
const VOC_WARNING_THRESHOLD = 80;

async function setupAegisPolling() {
    setInterval(async () => {
        await getAegisValues();
    }, 1000)
    await getAegisValues();
}

async function getAegisValues() {
    const fanRpm = await updateIdWithAnalytic('aegis-fan-rpm', 21);
    const outletValue = await updateIdWithAnalytic('aegis-fan-voc-outlet', 27);
    const inletValue = await updateIdWithAnalytic('aegis-fan-voc-inlet', 26);

    await setAegisStatus(inletValue);
    await setAegisIndicator(inletValue, 'aegis-fan-voc-inlet-status')
    await setAegisIndicator(outletValue, 'aegis-fan-voc-outlet-status')

    return {
        fanRpm, outletValue, inletValue
    }
}

async function setAegisStatus(inletValue) {

    const automaticMode = await isAutomaticFilteringActive();
    if (automaticMode) {
        if (automaticMode['automatic']) {
            document.getElementById('aegis-status').innerText = 'Filtration Cycle Running';
            return;
        }
    }
    
    const isVocCritical = inletValue <= VOC_CRITICAL_THRESHOLD;

    if (isVocCritical) {
        document.getElementById('aegis-status').innerText = 'VOC Level Critical';
        return;
    }

    const replaceFilter = await doesFilterNeedReplacement();
    if (replaceFilter) {
        if (replaceFilter['filter_needs_replacement']) {
            document.getElementById('aegis-status').innerText = 'Filter needs replacement';
            return;
        }
    }

    document.getElementById('aegis-status').innerText = 'VOC Level Ok';
}

function setAegisIndicator(value, elemId) {
    const element = document.getElementById(elemId);
    if (!element) return;

    element.classList.remove('label-success', 'label-warning', 'label-danger');

    if (value <= VOC_CRITICAL_THRESHOLD) {
        element.classList.add('label-danger');
    } else if (value <= VOC_WARNING_THRESHOLD) {
        element.classList.add('label-warning');
    } else {
        element.classList.add('label-success');
    }
}

async function aegisSetup() {
    const checkbox = document.getElementById('aegis-toggle');
    await setupAegisPolling();

    const { fanRpm } = await getAegisValues();

    checkbox.checked = fanRpm > 0;

    checkbox.addEventListener('change', async () => {
        const endpoint = '/athena-iot/aegis/' + (checkbox.checked ? 'activate' : 'deactivate');

        await fetch(endpoint, {
            method: 'POST',
        });
    });
}