let paused = false
const enviroment = {stats: new Stats(), gui: new dat.GUI()}
enviroment.stats && document.body.appendChild(enviroment.stats.dom)

const options = {
	faces: 8,
	frameRate: 10,
	stepSize: 12,
	minMergeNeighbors: 8,
	start: {
		minWidth: 96,
		maxWidth: 480,
		rotationX: 32,
		rotationY: 35,
		rotationZ: 32,
	},
	reset: {
		minWidth: 72,
		maxWidth: 480,
		rotationX: 40,
		rotationY: 55,
		rotationZ: 32,
	},
}

const channel = new BroadcastChannel('brfv4-faces')
const validFace = ({state} = {}) => {
	if(state === 'state_face_tracking') return true
	if(state === 'state_face_tracking_start') return true
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

const publish = faces => {
	channel.postMessage(faces.map(pickFace))
}

const updateSettings = ({brfManager, stepSize, minMergeNeighbors, start, reset}) => {
	with(start){
		brfManager.setFaceDetectionParams(minWidth, maxWidth, stepSize, minMergeNeighbors)
		brfManager.setFaceTrackingStartParams(minWidth, maxWidth, rotationX, rotationY, rotationZ)
	}
	with(reset){
		brfManager.setFaceTrackingResetParams(minWidth, maxWidth, rotationX, rotationY, rotationZ)
	}
}

const createGUI = ({brfManager}) => {
	const gui = enviroment.gui
	const handleChange = () => updateSettings({brfManager, ...options})

	gui.add(options, 'faces', 1, 16, 1).name('number of faces').onFinishChange(faces => {
		brfManager.setNumFacesToTrack(faces)
	})

	gui.add(options, 'frameRate', 1, 30, 1).name('fps')

	gui.add(options, 'stepSize', 12, 16, 1).name('step size').onFinishChange(handleChange)
	gui.add(options, 'minMergeNeighbors', 4, 32, 1).onFinishChange(handleChange)

	const startGUI = gui.addFolder('Start Tracking')
	startGUI.add(options.start, 'minWidth', 24, 480, 12).onFinishChange(handleChange)
	startGUI.add(options.start, 'maxWidth', 24, 480, 12).onFinishChange(handleChange)
	startGUI.add(options.start, 'rotationX', 0, 90).onFinishChange(handleChange)
	startGUI.add(options.start, 'rotationY', 0, 90).onFinishChange(handleChange)
	startGUI.add(options.start, 'rotationZ', 0, 90).onFinishChange(handleChange)
	startGUI.open()


	const resetGUI = gui.addFolder('Stop Tracking')
	resetGUI.add(options.reset, 'minWidth', 24, 480, 12).onFinishChange(handleChange)
	resetGUI.add(options.reset, 'maxWidth', 24, 480, 12).onFinishChange(handleChange)
	resetGUI.add(options.reset, 'rotationX', 0, 90).onFinishChange(handleChange)
	resetGUI.add(options.reset, 'rotationY', 0, 90).onFinishChange(handleChange)
	resetGUI.add(options.reset, 'rotationZ', 0, 90).onFinishChange(handleChange)
	resetGUI.open()
}

const drawFeedback = (faces, resolution, imageDataCtx, imageData) => {
	// reset orientation
	imageDataCtx.setTransform(1, 0, 0, 1, 0, 0)
	imageDataCtx.drawImage(imageData, 0, 0, resolution.width, resolution.height)
	// draw faces vertices
	for(var i = 0; i < faces.length; i++){
		var face = faces[i]
		imageDataCtx.strokeStyle = face.state === 'state_face_tracking' ? '#0af' : '#fa0'
		for(var k = 0; k < face.vertices.length; k += 2){
			imageDataCtx.beginPath()
			imageDataCtx.arc(face.vertices[k], face.vertices[k + 1], 1.5, 0, 2 * Math.PI)
			imageDataCtx.stroke()
		}
	}
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

			if(imageDataCtx === null){
				onStreamDimensionsAvailable()
			}else{
				trackFaces()
			}
		}

		window.navigator.mediaDevices.getUserMedia({video: {width: 640, height: 480}})
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
		brfManager.setNumFacesToTrack(options.faces)
		trackFaces()
		createGUI({brfManager})
	}

	function trackFaces(){
		setTimeout(trackFaces, 1000/options.frameRate)
		if(paused) return
		enviroment.stats && enviroment.stats.begin()

		// mirror input data
		imageDataCtx.setTransform(-1, 0, 0, 1, resolution.width, 0)
		imageDataCtx.drawImage(webcam, 0, 0, resolution.width, resolution.height)

		const {data} = imageDataCtx.getImageData(0, 0, resolution.width, resolution.height)
		brfManager.update(data)

		const faces = brfManager.getFaces().filter(validFace)
		publish(faces)
		drawFeedback(faces, resolution, imageDataCtx, imageData)
		enviroment.stats && enviroment.stats.end()
	}
}

!(function() {
	const version = isWebAssemblySupported ? 'WASM' : 'ASM [legacy]'
	console.log(`loading ${version}`)
	const done = () => (addBRFScript(), initExample())

	if(!isWebAssemblySupported){
		alert('running slow ASM.js code')
		return done()
	}

	readWASMBinary(`${brfv4BaseURL}${brfv4SDKName}.wasm`,
		r => {
			brfv4WASMBuffer = r
			done()
		},
		e => console.error(e),
		({loaded = 0, total = 1}) => console.log((loaded / total)*100 + '%'),
	)
})()
