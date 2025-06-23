var streamer = null;

$(document).ready(function () {

    if(document.location.pathname.endsWith("webcam")) {
        document.getElementById('camera-led-on').addEventListener('click', (e) => {
            runGcode('CAMERA_LED_ON')
        })

        document.getElementById('camera-led-off').addEventListener('click', (e) => {
            runGcode('CAMERA_LED_OFF')
        })
    }

    if(document.getElementById('livestream-container') != null) {

        if (streamer == null) {
            streamer = new Mjpegstreamer();
        }
        //url = "http://192.168.178.147/athena-camera/stream";
        const url = (DEV_MODE ? BASE_URL : document.location.origin) + "/athena-camera/stream";
        streamer.url = url;

        buildCameraStream(url);
    }
})

async function isCameraEnabled(src) {
    try {
        const response = await fetch(src, {method: 'HEAD'});
        if (response.status >= 400) {
            return false;
        }
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function buildCameraStream(url = null) {
    let src = url ?? `/athena-camera/video.mp4`;
    const cameraEnabled = await isCameraEnabled(src);

    let style;
    if (cameraEnabled) {
        const img = document.createElement('img');

        const livestreamContainer = document.getElementById('livestream-container');
        livestreamContainer.appendChild(img);

        style = streamer.webcamStyle;

        img.style.aspectRatio = style.aspectRatio;
        img.style.maxHeight = livestreamContainer.style.height;
        img.style.transform = style.transform;
        img.style.maxWidth = style.maxWidth;
        img.style.width = 'auto';
        img.style.height = '56%';


        streamer.image = img;

        livestreamContainer.style.display = 'flex';

        await streamer.startStream(true);


    } else {
        hideElemIfPresent('webcam-preview')
        setBootstrapElemSizeIfPresent('print-preview', 12)

        // Dashboard views
        hideElemIfPresent('webcam-column')
        setBootstrapElemSizeIfPresent('control-column', 12)
        setBootstrapElemSizeIfPresent('heater-column', 6)
        setBootstrapElemSizeIfPresent('printer-control-column', 6)
    }

}

class Mjpegstreamer {

    CONTENT_LENGTH = 'content-length';
    SOI = new Uint8Array(2);


    // current read stream frames counter
    frames = 0;
    // current displayed fps
    currentFPS = 0;
    status = 'connecting';
    statusMessage = '';
    streamState = false;
    aspectRatio = null;
    timerFPS = null;
    timerRestart = null;
    url = "";
    reader = null;
    image = null;
    connectedAtLeastOnce = false;

    constructor() {
        this.reader = null;
        this.SOI[0] = 0xff;
        this.SOI[1] = 0xd8;
    }

    set url(url) {
        this.url=url;
    }

    set image(image) {
        this.image=image;
    }

    get fpsOutput() {
        return this.currentFPS.toString().padStart(2, '0')
    }

    log(msg, obj) {
        if (obj) {
            window.console.log(`[MJPEG streamer] ${msg}`, obj)
            return
        }

        window.console.log(`[MJPEG streamer] ${msg}`)
    }

    generateTransform(flip_horizontal, flip_vertical, rotation) {
        let transforms = ''
        if (flip_horizontal) transforms += ' scaleX(-1)'
        if (flip_vertical) transforms += ' scaleY(-1)'
        if (rotation !== 0) transforms += ' rotate('+rotation+'deg)'

        // return transform when exist
        if (transforms.trimStart().length) return transforms.trimStart()

        // return none as fallback
        return 'none'
    }

    get webcamStyle() {
        const output = {
            transform: this.generateTransform(
                false,
                 false,
                90
            ),
            aspectRatio: 16 / 9,
            maxHeight: window.innerHeight - 155 + 'px',
            maxWidth: 'auto',
        }

        if (this.aspectRatio) {
            output.aspectRatio = this.aspectRatio
            output.maxWidth = (window.innerHeight - 155) * this.aspectRatio + 'px'
        }

        return output
    }


    getLength(headers) {
        let contentLength = -1
        headers.split('\n').forEach((header) => {
            const pair = header.split(':')
            if (pair[0].toLowerCase() === this.CONTENT_LENGTH) {
                // Fix for issue https://github.com/aruntj/mjpeg-readable-stream/issues/3 suggested by martapanc
                contentLength = pair[1]
            }
        })
        return contentLength
    }

    async startStream(skipStatus = false) {
        if (this.streamState) {
            return
        }
        this.streamState = true

        if (!skipStatus) {
            this.status = 'connecting'
        }

        // reset counter and timeout/interval
        this.clearTimeouts()

        try {
            //readable stream credit to from https://github.com/aruntj/mjpeg-readable-stream

            const url = new URL(this.url)
            url.searchParams.append('timestamp', new Date().getTime().toString())

            let response = await fetch(url.toString(), {mode: 'cors'})

            if (!response.ok) {
                this.log(`${response.status}: ${response.statusText}`)
                await this.stopStream()
                if(response.status === 502 && this.connectedAtLeastOnce){
                    throw new Error("Temporary stream failure");
                }
                return
            }

            if (!response.body) {
                this.log('ReadableStream not yet supported in this browser.')
                await this.stopStream()
                return
            }

            this.timerFPS = window.setInterval(() => {
                this.currentFPS = this.frames
                this.frames = 0
            }, 1000)

            this.timerRestart = window.setTimeout(() => {
                this.restartStream(true)
            }, 10000)

            this.reader = response.body?.getReader()

            await this.readStream()

            // cleanup
            this.reader = null
            response = null
        } catch (error) {
            this.log(error.message)

            this.timerRestart = window.setTimeout(() => {
                this.restartStream()
            }, 5000)
        }
    }

    async readStream() {
        // stop if the stream is not ready
        if (!this.reader) return

        try {
            // variables to read the stream
            let headers = ''
            let contentLength = -1
            let imageBuffer = new Uint8Array(0)
            let bytesRead = 0
            let skipFrame = false

            let done = null
            let value

            do {
                ;({done, value} = await this.reader.read())

                if (done || !value) continue

                for (let index = 0; index < value.length; index++) {
                    // we've found the start of the frame. Everything we've read till now is the header.
                    if (value[index] === this.SOI[0] && value[index + 1] === this.SOI[1]) {
                        contentLength = this.getLength(headers)
                        imageBuffer = new Uint8Array(new ArrayBuffer(contentLength))
                    }

                    // we're still reading the header.
                    if (contentLength <= 0) {
                        headers += String.fromCharCode(value[index])
                        continue
                    }

                    // we're now reading the jpeg.
                    if (bytesRead < contentLength) {
                        imageBuffer[bytesRead++] = value[index]
                        continue
                    }

                    // we're done reading the jpeg. Time to render it.
                    if (this.image && !skipFrame) {
                        const objectURL = URL.createObjectURL(new Blob([imageBuffer], {type: 'image/jpeg'}))
                        this.image.src = objectURL
                        skipFrame = true

                        // update status to 'connected' if the first frame is received
                        if (this.status !== 'connected') {
                            this.status = 'connected'
                            this.connectedAtLeastOnce = true;
                            this.statusMessage = ''
                        }

                        this.image.onload = () => {
                            URL.revokeObjectURL(objectURL)
                            skipFrame = false
                        }
                    }
                    this.frames++
                    contentLength = 0
                    bytesRead = 0
                    headers = ''
                }
            } while (!done)
        } catch (error) {
            this.log(`readStream error: ${error.message ?? ''}`, error)
        } finally {
            this.reader?.releaseLock()
        }
    }


    clearTimeouts() {
        this.frames = 0
        if (this.timerFPS) {
            window.clearInterval(this.timerFPS)
            this.timerFPS = null
        }
        if (this.timerRestart) {
            window.clearTimeout(this.timerRestart)
            this.timerRestart = null
        }
    }

    async stopStream(skipStatus = false) {
        this.streamState = false

        if (!skipStatus) {
            this.status = 'disconnected'
        }
        this.clearTimeouts()

        try {
            await this.reader?.cancel()
            this.reader?.releaseLock()
            this.reader = null
        } catch (error) {
            this.log('Error cancelling reader:', error)
        }
    }

    async restartStream(skipStatus = false) {
        await this.stopStream(skipStatus)
        await this.startStream(skipStatus)
    }

}

const hideElemIfPresent = (id) => {
    const $elem = document.getElementById(id);
    if ($elem)
        $elem.hidden = true;
}

const showElemIfPresent = (id) => {
    const $elem = document.getElementById(id);
    if ($elem)
        $elem.hidden = false;
}

const setBootstrapElemSizeIfPresent = (id, size) => {
    const element = document.getElementById(id);
    if (element) {

        element.classList.forEach(className => {
            if (className.startsWith('col-md-')) {
                element.classList.remove(className);
            }
        });

        element.classList.add(`col-md-${size}`);
    }
}

/*
<style scoped>
    .webcamImage {
    width: 100%;
    background: lightgray;
}

    .webcamFpsOutput {
    display: inline-block;
    position: absolute;
    bottom: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.8);
    padding: 3px 10px;
    border-top-left-radius: 5px;
}

    html.theme--light .webcamFpsOutput {
    background: rgba(255, 255, 255, 0.7);
}

    ._webcam_mjpegstreamer_output {
    aspect-ratio: calc(3 / 2);
}
</style>
*/


$(document).ready(() => {

})