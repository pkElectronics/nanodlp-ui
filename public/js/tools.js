const HMI_API_BASE = '/athena-iot/control/hmi_type';

$(document).ready(() => {
    setupOrionButton()
})

async function setupOrionButton() {
    const hmi = await getOrionStatus()

    const $toggleButton = $('#orion-toggle');
    $toggleButton.text(hmi === 'nanodlp' ? 'Enable Orion HMI' : 'Disable Orion HMI');
    $toggleButton.show()
}

async function getOrionStatus() {
    const response = await fetch(HMI_API_BASE);
    const { hmi } = await response.json();
    return hmi;
}

async function onOrionToggle() {
    const hmi = await getOrionStatus()

    await fetch(HMI_API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hmi: hmi === 'nanodlp' ? 'orion' : 'nanodlp' })
    });

    window.location.href = '/printer/hmi/restart';
}