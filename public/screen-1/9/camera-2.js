let paused         = false
let resolution     = null
let canvasCtx      = null
const enviroment   = {stats: new Stats(), gui: new dat.GUI()}
const $webcam      = document.getElementById('_webcam')
const $canvas      = document.getElementById('_imageData')
const faceDetector = new FaceDetector()

enviroment.stats && document.body.appendChild(enviroment.stats.dom)
$canvas.addEventListener('dblclick', () => {paused = !paused})
$webcam.addEventListener('dblclick', () => {paused = !paused})

const channel = new BroadcastChannel('frame-faces')

const HEAD_SCALE = {x: 1 + 1/5, y: 1 + 1/2.5}

const pickFace = ({boundingBox, landmarks}) => ({
	scale: ((boundingBox.width / HEAD_SCALE.x) + (boundingBox.height / HEAD_SCALE.y)) / 2,
	rotationX: 0,
	rotationY: 0,
	rotationZ: 0,
	x: boundingBox.x + (boundingBox.width / 2),
	y: boundingBox.y + (boundingBox.height / 2),
	loading: false,
})

const publish = faces => {
	channel.postMessage(faces.map(pickFace))
}

const dimensionsAvailableCb = ($element) => async callback => {
	if($element.videoWidth > 0){
		return callback({width: $element.videoWidth, height: $element.videoHeight})
	}
	setTimeout(() => dimensionsAvailableCb($element)(callback), 100)
}

const dimensionsAvailable = $element => new Promise(dimensionsAvailableCb($element))

async function trackFaces(){
	setTimeout(trackFaces, 1000/10)
	if(paused) return
	enviroment.stats && enviroment.stats.begin()
	canvasCtx.setTransform(-1, 0, 0, 1, resolution.width, 0)
	canvasCtx.drawImage($webcam, 0, 0, resolution.width, resolution.height)

	const faces = await faceDetector.detect(canvasCtx.getImageData(0, 0, resolution.width, resolution.height))
	console.log(faces)
	publish(faces)
	enviroment.stats && enviroment.stats.end()
}

// setup
!(async () => {
	$webcam.srcObject = await window.navigator.mediaDevices.getUserMedia({video: {width: 680, height: 480}})
	$webcam.play()
	resolution = await dimensionsAvailable($webcam)
	$canvas.width = resolution.width
	$canvas.height = resolution.height
	$canvas.style.width = resolution.width + 'px'
	$canvas.style.height = resolution.height + 'px'
	canvasCtx = $canvas.getContext('2d')
	await trackFaces()
})()
