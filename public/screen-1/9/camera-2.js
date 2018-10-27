let paused         = false
let resolution     = null
const enviroment   = {stats: new Stats(), gui: new dat.GUI()}
const $webcam      = document.getElementById('_webcam')
const faceDetector = new FaceDetector()

enviroment.stats && document.body.appendChild(enviroment.stats.dom)
$webcam.addEventListener('dblclick', () => {paused = !paused})

const channel = new BroadcastChannel('frame-faces')

const HEAD_SCALE = {x: 1 + 1/5, y: 1 + 1/2.5}

const pickFace = ({boundingBox, landmarks}) => ({
	scale: ((boundingBox.width / HEAD_SCALE.x) + (boundingBox.height / HEAD_SCALE.y)) / 2,
	rotationX: 0,
	rotationY: 0,
	rotationZ: 0,
	x: resolution.width - (boundingBox.x + (boundingBox.width / 2)),
	y: (boundingBox.y + (boundingBox.height / 2)),
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
	publish(await faceDetector.detect($webcam))
	enviroment.stats && enviroment.stats.end()
}

// setup
!(async () => {
	$webcam.srcObject = await window.navigator.mediaDevices.getUserMedia({video: {width: 680, height: 480}})
	$webcam.play()
	resolution = await dimensionsAvailable($webcam)
	await trackFaces()
})()
