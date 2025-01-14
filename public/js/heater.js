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
            if (object.chamberHeaterToggle) {
                runGcode(`SET_CHAMBER_HEATER TARGET=${object.targetTemperature}`)
            }

            if (object.vatHeaterToggle) {
                runGcode(`SET_VAT_HEATER TARGET=${object.targetTemperature}`)
            }
        }
    })

    document.getElementById('btn-mix-resin').addEventListener('click', (e) => {
        mixResin()
    })
}

$(document).ready(function () {
    onPageLoad();
})

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
    const mixConfig = await getMachineMixGcodeConfig();

    const mixGcode = MIX_GCODE
        .replaceAll("$POSITION", mixConfig.toString())
        .replaceAll("$POSITIONDOWN", (mixConfig - 5).toString())

    await runGcode(mixGcode)

}

async function getMachineMixGcodeConfig() {
    const response = await fetch("/static/printer_type", { method: 'GET' });
    const machineType = await response.text();

    if (machineType.startsWith("AthenaPro")) {
        return 235;
    } else if (machineType.startsWith("Athena2")) {
        return 235;
    } else if (machineType.startsWith("Athena-")) {
        return 245;
    } else {
        throw new Error("Unknown machine type for mixing gcode")
    }

}

const MIX_GCODE = `
[[StatusUpdate Resin Mixing Started]]
[[Blank]]
AEGIS_FAN_OFF
[[MoveCounterSet 0]]
[[StatusUpdate Homing Z Axis]]
HOME_AXIS ;Home Z
[[MoveWait 1]]
[[StatusUpdate Resin Mixing Started]]
[[PressureWrite 1]]
[[PositionSet $POSITION]]
G90 ;Absolute Positioning
[[GPIOHigh 10]]
[[CrashDetectionStart]]
ATHENA_PROBE_DOWNWARDS Z=$POSITIONDOWN F=480
ATHENA_PROBE_DOWNWARDS Z=4 F=10
[[MoveWait 3]]
DWELL P=2000
[[MoveWait 4]]
[[CrashDetectionStop]]


[[StatusUpdate Moving Plate to Start Position]]
MOVE_PLATE Z=35 F=100
[[PositionSet 35]]
[[MoveWait 5]]


[[ResinLevelDetectionStart]]
[[StatusUpdate Resin Level Detection Started]]
ATHENA_PROBE_RESINLEVEL Z=34 F=150


[[MoveWait 6]]
[[ResinLevelDetectionStop]]
[[Delay 1]]
[[Split]]

SET_RESIN_HEATER TARGET=28 EN_CHAMBER=[[_ChamberHeaterPresent]] EN_VAT=[[_VatHeaterPresent]] NANO=1
[[StatusUpdate Preheating Resin+Mixing - Please Wait]]

DWELL P=2000
[[MoveWait 7]]
[[MoveCounterSet 0]]


[JS]
var nano = nanodlpContext();
var resinLevel = nano["Status"]["ResinLevelMm"]; // Retrieve resin level from context

var waitTimeAfterMixing = 30000; // Time to wait after mixing in milliseconds
var cyclesPerRoutine = 5;       // Number of raise/lower cycles for each stirring routine
var maxLiftHeight = 2;          // Maximum height the plate can rise above the resin level (mm)

// Utility function to generate GCode for a stirring routine
function generateStirringRoutine(name, minHeightFactor, maxHeightFactor) {
    var minHeight = resinLevel * minHeightFactor;
    var maxHeight = resinLevel * maxHeightFactor;
    var gcode = "[[StatusUpdate " + name + "]]\\n" +
                "[[MoveCounterSet 0]]\\n";
    for (var i = 0; i < cyclesPerRoutine; i++) {
        gcode += "G1 Z" + maxHeight.toFixed(2) + " F600\\n" +
                 "G1 Z" + Math.max(minHeight, 0.5).toFixed(2) + " F600\\n";
    }
    gcode += "DWELL P=500\\n[[MoveWait 1]]\\n";
    return gcode;
}


// Deep Stir - Full range of resin level
var deepStirMaxFactor = 1;
var deepStirMinFactor = 0;
output += generateStirringRoutine("Deep Stir", deepStirMinFactor, deepStirMaxFactor);

// Low Vibe Stir - Bottom section
var lowVibeMaxFactor = 0.15;
var lowVibeMinFactor = 0;
output += generateStirringRoutine("Low Vibe Stir", lowVibeMinFactor, lowVibeMaxFactor);

// Mid Low Vibe Stir - Lower middle section
var midLowVibeMaxFactor = 0.45;
var midLowVibeMinFactor = 0.3;
output += generateStirringRoutine("Mid Low Vibe Stir", midLowVibeMinFactor, midLowVibeMaxFactor);

// Mid Vibe Stir - Middle section
var midVibeMaxFactor = 0.7;
var midVibeMinFactor = 0.5;
output += generateStirringRoutine("Mid Vibe Stir", midVibeMinFactor, midVibeMaxFactor);

// Mid High Vibe Stir - Upper middle section
var midHighVibeMaxFactor = 0.9;
var midHighVibeMinFactor = 0.75;
output += generateStirringRoutine("Mid High Vibe Stir", midHighVibeMinFactor, midHighVibeMaxFactor);

// High Vibe Stir - Near top section
var highVibeMaxFactor = 1;
var highVibeMinFactor = 0.85;
output += generateStirringRoutine("High Vibe Stir", highVibeMinFactor, highVibeMaxFactor);

// Resin Shake/Drain Stir
var shakeDrainLiftHeight = resinLevel + maxLiftHeight + 5; // Add 5mm for full lift above resin level
var shakeDrainMinHeight = shakeDrainLiftHeight - 5; // Ensure all moves are above resin level

output += (
    "[[StatusUpdate Resin Shake/Drain Stir]]\\n" +
    "[[MoveCounterSet 0]]\\n"
);
for (var j = 0; j < cyclesPerRoutine; j++) {
    output += "G1 Z" + shakeDrainLiftHeight.toFixed(2) + " F600\\n" +
             "G1 Z" + shakeDrainMinHeight.toFixed(2) + " F600\\n";
}
output += "G1 Z50 F600\\nDWELL P=500\\n[[MoveWait 1]]\\n";

// Wait for draining
output += (
    "[[MoveCounterSet 0]]\\n" +
    "DWELL P=" + waitTimeAfterMixing + "\\n" +
    "[[StatusUpdate Waiting " + (waitTimeAfterMixing / 1000) + "s for Draining]]\\n" +
    "[[MoveWait 1]]\\n" +
    "HOME_AXIS ;Home Z\\n" +
    "[[StatusUpdate Resin Mixing Complete]]\\n"
);
[/JS]
`;