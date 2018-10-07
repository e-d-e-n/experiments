let paused = false
const frameRate = 60
const enviroment = {stats: new Stats()}
enviroment.stats && document.body.appendChild(enviroment.stats.dom)

const channel = new BroadcastChannel('brfv4-faces')
const validFace = ({state} = {}) => {
	 if(state === 'state_face_tracking') return true
	// if(state === 'state_face_tracking_start') return true
	return false
}

const pickFace = face => ({
	vertices: face.vertices,
	scale: face.scale,
	points: face.points,
	rotationX: face.rotationX,
	rotationY: face.rotationY,
	rotationZ: face.rotationZ,
})

const publish = (brfv4, faces) => {
	channel.postMessage(JSON.stringify(faces.filter(validFace).map(pickFace)))
}

const isWebAssemblySupported = (function() {
	const supported = (typeof WebAssembly === 'object')
	if(!supported) return false
	return (() => {
		var bin = new Uint8Array([0,97,115,109,1,0,0,0,1,6,1,96,1,127,1,127,3,2,1,0,5,3,1,0,1,7,8,1,4,116,101,115,116,0,0,10,16,1,14,0,32,0,65,1,54,2,0,32,0,40,2,0,11])
		var mod = new WebAssembly.Module(bin)
		var inst = new WebAssembly.Instance(mod, {})
		return (inst.exports.test(4) !== 0)
	})()
})()

function readWASMBinary(url, onload, onerror, onprogress){
	var xhr = new XMLHttpRequest()
	xhr.open('GET', url, true)
	xhr.responseType = 'arraybuffer'
	xhr.onload = function xhr_onload(){
		if (xhr.status === 200 || xhr.status === 0 && xhr.response){
			return onload(xhr.response)
		}
		onerror()
	}
	xhr.onerror = onerror
	xhr.onprogress = onprogress
	xhr.send(null)
}

function addBRFScript() {
	var script = document.createElement('script')

	script.setAttribute('type', 'text/javascript')
	script.setAttribute('async', true)
	script.setAttribute('src', brfv4BaseURL + brfv4SDKName + '.js')

	document.getElementsByTagName('head')[0].appendChild(script)
}

var brfv4BaseURL = isWebAssemblySupported ? '/vendor/brfv4/brf_wasm/' : '/vendor/brfv4/brf_asmjs/'
var brfv4SDKName = 'BRFv4_JS_TK110718_v4.1.0_trial' // the currently available library
var brfv4WASMBuffer = null

function initExample(){

	// This function is called after the BRFv4 script was added.

	// BRFv4 needs the correct input image data size for initialization.
	// That's why we need to start the camera stream first and get the correct
	// video stream dimension. (startCamera, onStreamFetched, onStreamDimensionsAvailable)

	// Once the dimension of the video stream is known we need to wait for
	// BRFv4 to be ready to be initialized (waitForSDK, initSDK)

	// Once BRFv4 was initialized, we can track faces (trackFaces)

	var webcam        = document.getElementById('_webcam')     // our webcam video
	var imageData     = document.getElementById('_imageData')  // image data for BRFv4
	var imageDataCtx  = null                                   // only fetch the context once

	var brfv4         = null // the library namespace
	var brfManager    = null // the API
	var resolution    = null // the video stream resolution (usually 640x480)

	imageData.addEventListener('dblclick', () => {paused = !paused})

	startCamera()

	function startCamera() {
		console.log('startCamera')
		// Start video playback once the camera was fetched to get the actual stream dimension.
		function onStreamFetched(mediaStream){
			console.log('onStreamFetched')
			webcam.srcObject = mediaStream
			webcam.play()

			// Check whether we know the stream dimension yet, if so, start BRFv4.
			function onStreamDimensionsAvailable () {
				console.log('onStreamDimensionsAvailable: ' + (webcam.videoWidth !== 0))
				if(webcam.videoWidth === 0) {
					setTimeout(onStreamDimensionsAvailable, 100)
				} else {
					// Resize the canvas to match the webcam video size.
					imageData.width = webcam.videoWidth
					imageData.height = webcam.videoHeight
					imageData.style.width = webcam.videoWidth + 'px'
					imageData.style.height = webcam.videoHeight + 'px'
					imageDataCtx = imageData.getContext('2d')
					waitForSDK()
				}
			}

			 // [TODO]: understand what the hell
			 if(imageDataCtx === null){
					console.log('wtf1')
				 onStreamDimensionsAvailable()
			 } else {
					console.log('wtf2')
				 trackFaces()
			 }
		}

		window.navigator.mediaDevices.getUserMedia({video: {width: 640, height: 480, frameRate}})
			.then(onStreamFetched, () => alert('No camera available.'))
	}

	function waitForSDK() {
		if(brfv4 === null && window.hasOwnProperty('initializeBRF')){
			brfv4 = {
				locateFile: fileName => brfv4BaseURL + fileName,
				wasmBinary: brfv4WASMBuffer,
			}
			initializeBRF(brfv4)
		}

		if(brfv4 && brfv4.sdkReady){
			initSDK()
		} else {
			setTimeout(waitForSDK, 250)
		}
	}

	function initSDK(){
		resolution = new brfv4.Rectangle(0, 0, imageData.width, imageData.height)
		brfManager = new brfv4.BRFManager()
		brfManager.init(resolution, resolution, 'com.tastenkunst.brfv4.js.examples.minimal.webcam')
		trackFaces()
	}

	function trackFaces(){
		// setTimeout(trackFaces, 1000/frameRate)
		requestAnimationFrame(trackFaces)
		if(paused) return
		enviroment.stats && enviroment.stats.begin()
		imageDataCtx.setTransform(-1, 0, 0, 1, resolution.width, 0)
		imageDataCtx.drawImage(webcam, 0, 0, resolution.width, resolution.height)
		const {data} = imageDataCtx.getImageData(0, 0, resolution.width, resolution.height)
		brfManager.update(data)
		publish(brfv4, brfManager.getFaces())

		enviroment.stats && enviroment.stats.end()
	}
}

!(function() {
	const version = isWebAssemblySupported ? 'WASM' : 'ASM [legacy]'
	console.log(`loading ${version}`)
	const done = () => (addBRFScript(), initExample())

	if(!isWebAssemblySupported) return done()

	readWASMBinary(`${brfv4BaseURL}${brfv4SDKName}.wasm`,
		r => {
			brfv4WASMBuffer = r
			done()
		},
		e => console.error(e),
		({loaded = 0, total = 1}) => console.log((loaded / total)*100 + '%'),
	)
})()
