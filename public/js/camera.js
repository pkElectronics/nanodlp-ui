$(document).ready(() => {
    document.getElementById('camera-led-on').addEventListener('click', (e) => {
        runGcode('CAMERA_LED_ON')
    })

    document.getElementById('camera-led-off').addEventListener('click', (e) => {
        runGcode('CAMERA_LED_OFF')
    })
})