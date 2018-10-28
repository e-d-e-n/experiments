let paused         = false
let resolution     = null
const enviroment   = {stats: new Stats(), gui: new dat.GUI()}
const $webcam      = document.getElementById('_webcam')
const faceDetector = new FaceDetector({fastMode: false, maxDetectedFaces: 1})

class CacheStack {
	constructor(limit = 12){
		this.limit = limit
		this.data = []
	}
	push(value){
		const values = this.data.slice((this.limit -1) * -1)
		this.data = values.concat(value)
	}
	clear(){
		this.data = []
	}
	values(){
		return this.data
	}
}

enviroment.stats && document.body.appendChild(enviroment.stats.dom)
$webcam.addEventListener('dblclick', () => {paused = !paused})

const channel = new BroadcastChannel('frame-faces')

const HEAD_SCALE = {x: 1 + 1/5, y: 1 + 1/2.5}

const _getEyeAngle = boundingBox => ({locations: [eye]}) => {
	const eyeX = (eye.x) - (boundingBox.x + (boundingBox.width / 2))
	const eyeY = (eye.y) - (boundingBox.y + (boundingBox.height / 2))
	return Math.atan2(eyeY, eyeX)
}

const average = values => (values.reduce((a, v) => (a + v), 0) / values.length)

const addRotationZ = (face, {boundingBox, landmarks}) => {
	const getEyeAngle = _getEyeAngle(boundingBox)
	const angles = landmarks.filter(a => a.type === 'eye').map(getEyeAngle)
	const rotationZ = (Math.PI / 2 - average(angles)) - Math.PI
  return {...face, rotationZ}
}

const pickFace = ({boundingBox, landmarks}) => addRotationZ({
	scale: ((boundingBox.width / HEAD_SCALE.x) + (boundingBox.height / HEAD_SCALE.y)) / 2,
	rotationX: 0, rotationY: 0, rotationZ: 0,
	x: resolution.width - (boundingBox.x + (boundingBox.width / 2)),
	y: (boundingBox.y + (boundingBox.height / 2)) * 0.88,
}, {boundingBox, landmarks})

const cache = new CacheStack(8)

const publish = _faces => {
	const newFaces = _faces.map(pickFace)
	newFaces.length ? cache.push(newFaces[0]) : cache.clear()

	const message = cache.values().reduce((acc, object, index, array) => {
		if(!index) return object

		Object.keys(object).forEach(key => {
			acc[key] = (acc[key] * index + object[key]) / (index + 1)
		})

		return acc
	}, {})
	channel.postMessage(newFaces.length ? [message] : [])
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
