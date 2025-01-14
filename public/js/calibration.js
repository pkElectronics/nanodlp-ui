const multicureConfig = {
    1: {
        name: "J3D Calibration Model 1",
        models: 6
    }
}

$(document).ready(function () {
    setUpCalibrationSelection();
    populateExposurePreview(0.2, 1.5, 1)
    setUpProfiles()
    const calibrationForm = document.getElementById('calibration-form');
    calibrationForm.addEventListener('input', (e) => {
        const form = e.target.form;  // Get the form element
        const values = formDataToObject(form);

        const {exposureIncrement, startExposure, calibrationModelId} = values;
        populateExposurePreview(exposureIncrement, startExposure, calibrationModelId)
    })
    calibrationForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const button = document.getElementById('calibration-form-button-submit');
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...`;


        // refetch the latest form reference
        const form = document.getElementById('calibration-form');
        const data = formDataToObject(form);
        submitForm(data, button);
    })

    document.getElementById("calibration-form-confirm").addEventListener('click', (e) => {
        // Calibration started workflow
        document.querySelector('#calibration-confirm').style.display = 'none';
        document.querySelector('#calibration-progress').style.display = 'block';
        document.querySelector('.modal-footer').style.display = 'none';
        document.querySelector('#modalLabel').textContent = "Slicing calibration file..."
    })
})

function setUpCalibrationSelection() {
    const $calibrationSelect = document.getElementById('calibration-model');

    for (const key in multicureConfig) {
        const option = document.createElement("option");
        option.value = key;
        const configItem = multicureConfig[key];
        option.textContent = configItem.name;
        $calibrationSelect.appendChild(option);
    }
}

/**
 * Hack to populate a profile dropdown as NanoDLP does not expose profiles to this endpoint yet
 */
async function setUpProfiles() {
    const $profileSelect = document.getElementById('profile-id');

    const profilesResponse = await fetch('/json/db/profiles.json');
    const profiles = await profilesResponse.json();

    profiles.forEach(profile => {
        const option = document.createElement("option");
        option.value = profile['ProfileID'];
        option.textContent = `${profile['Title']} (${profile['Depth']}um)`;
        $profileSelect.appendChild(option);
    })

}

function populateExposurePreview(increment, startTime, modelId) {
    const previewElem = document.getElementById('exposure-value-preview');
    let secondValues = Array(multicureConfig[modelId].models).fill(0)
        .map((value, index) => (index * increment + startTime).toFixed(1));

    previewElem.textContent = `Generating model exposures at: ${secondValues.map(i => i + "s").join(", ")}`
}

function formDataToObject(form) {
    const formData = new FormData(form);
    const object = Object.fromEntries(formData.entries());
    return {
        startExposure: Number(object['start-exposure']),
        exposureIncrement: Number(object['exposure-increment']),
        calibrationModelId: object['calibration-model'],
        profileID: object['profile-id'],
    }
}

async function submitForm(form, $button) {
    const {calibrationModelId, exposureIncrement, startExposure, profileID} = form;

    const multicureValues = Array(multicureConfig[calibrationModelId].models)
        .fill(0)
        .map((value, index) => (index * exposureIncrement + startExposure).toFixed(1))
        .join(',');


    const body = {
        curetimes: multicureValues,
        ProfileID: profileID
    }

    const response = fetch(`/api/v1/athena/calibration/add/${calibrationModelId}`, {
        method: 'POST',
        body: new URLSearchParams(body),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    });

    setUpSlicerPoller();

    if (!(await response).ok) {
        toastr.error("Failed to submit calibration")
        $button.disabled = false;
        $button.innerHTML = 'Submit and Print';
    }

}

async function setUpSlicerPoller() {
    const pollFunc = async () => {
        const response = await fetch('/slicer');
        const {percentage} = await response.json();


        if (percentage === "100") window.location.href = "/";
        document.getElementById('calibration-modal-progress-bar').style.width = `${percentage}%`
    }

    setInterval(pollFunc, 500)
}

