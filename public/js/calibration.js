const MODEL_LIMIT = 5;


$(document).ready(function () {
    populateExposurePreview(0.2, 1.5)

    const calibrationForm = document.getElementById('calibration-form');
    calibrationForm.addEventListener('input', (e) => {
        const form = e.target.form;  // Get the form element
        const values = formDataToObject(form);

        const { exposureIncrement, startExposure} = values;
        populateExposurePreview(exposureIncrement, startExposure)
    })
    calibrationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // refetch the latest form reference
        const form = document.getElementById('calibration-form');
        const data = formDataToObject(form);
        submitForm(data);
    })
})

function populateExposurePreview(increment, startTime) {
    const previewElem = document.getElementById('exposure-value-preview');
    let secondValues = Array(MODEL_LIMIT).fill(0)
        .map((value, index) => (index * increment + startTime).toFixed(1));

    console.log(secondValues)

    previewElem.textContent = `Generating model exposures at: ${secondValues.map(i => i + "s").join(", ")}`
}

function formDataToObject(form) {
    const formData = new FormData(form);
    const object = Object.fromEntries(formData.entries());
    return {
        startExposure: Number(object['start-exposure']),
        exposureIncrement: Number(object['exposure-increment']),
        calibrationModelId: object['calibration-model']
    }
}

async function submitForm(form) {
    const formData = new FormData();

    formData.append('ProfileID', '1');
    const multicureValues = Array(MODEL_LIMIT).fill(0)
        .map((value, index) => (index * form.exposureIncrement + form.startExposure).toFixed(1))
        .join(',');

    console.log(form)

    formData.append('MultiCure', multicureValues); // eg. 1.0,1.2,1.4,1.6 etc, I will generate this on the fly
    // formData.append('Path', ????);
    // formData.append('ZipFile', ????); // Not sure how to handle these too for a file that's on the device

    // default stuff from the form that's not used for calibration but I assume needs to be tehre
    formData.append('AutoCenter', 0);
    formData.append('Offset', 0.00);
    formData.append('LowQualityLayerNumber', 0);
    formData.append('MaskEffect', 0.00);
    formData.append('ImageRotate', 0);

    await fetch('/plate/add', {
        method: 'POST',
        body: formData,
    });
}