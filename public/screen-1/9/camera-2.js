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
	getLast(){
		return this.data[this.data.length - 1]
	}
	values(){
		return this.data
	}
}

const smoosh = (cacheDepth = 1) => face => {
	const values = face.values()
	const keys = Object.keys(values[0] || {})
	return values.reduce((acc, object, index) => {
		if(!index) return object
		for(key in keys){
			if(key === 'loading') continue
			acc[key] = (acc[key] * index + object[key]) / (index + 1)
		}
		return acc
	}, {loading: values.length !== cacheDepth})
}

const ascendingValues = ([key1, value1], [key2, value2]) => value1 - value2
const getKey = (([key]) => key)
const getKeysOrderedByValue = object => (
	Object.entries(object).sort(ascendingValues).map(getKey)
)

class TrackedFacesList {
	constructor(maxLength = 20, limit = 12){
		console.log('constructor')
		this._reset(maxLength, limit)
	}
	_reset(maxLength, limit){
		console.log('_reset')
		this.maxLength = maxLength
		this.length = 0
		this.limit = limit
		this.data = {}
		this.access = {}
	}
	_removeFace(key){
		console.log('_removeFace')
		this.length -= 1
		delete this.data[key]
		delete this.access[key]
	}
	_saveNewFace(face){
		console.log('_saveNewFace')
		const now = Date.now()
		const key = `${now}§${Math.random()}`
		const stack = new CacheStack(this.limit)
		stack.push(pickFace(face))

		this.length += 1
		this.data[key] = stack
		this.access[key] = now

		this._resize()
	}
	_pushToFace(key, face){
		console.log('_pushToFace')
		this.data[key].push(face)
		this.access[key] = Date.now()
	}
	_resize(maxLength = this.maxLength){
		console.log('_resize')
		this.maxLength = maxLength
		if(maxLength > this.length) return
		const LRU = getKeysOrderedByValue(this.access)
		while(this.length > maxLength) this._removeFace(LRU.shift())
	}
	updateWith(newValues = []){
		console.log('updateWith', newValues)
		if(newValues.length === 0) return this._reset(this.maxLength, this.limit)
		const entries = Object.entries(this.data)
		const oldDoneSet = new Set()
		const newDoneSet = new Set()
		const maxDistance = 64

		const distances = newValues
			.reduce((allDistances, rawFace) => {
					const newFace = pickFace(rawFace)
					const thisFaceDistances = entries.map(([key, value]) => {
						return [key, newFace, getDistance(value.getLast(), newFace)]
					})
					return [...allDistances, ...thisFaceDistances]
				},
				[],
			)
			.sort((a, b) => a[2] - b[2])
		console.log('distances:', distances)
		distances
			.forEach(([key, newFace, distance]) => {
				const oldDone = oldDoneSet.has(key)
				const newDone = newDoneSet.has(newFace)

				if(oldDone && newDone) return

				if(distance < maxDistance){
					this._pushToFace(key, newFace)
					oldDoneSet.add(key)
					newDoneSet.add(newFace)
					return
				}

				if(!oldDone){
					this._removeFace(key)
					oldDoneSet.add(key)
				}

				if(!newDone){
					this._saveNewFace(newFace)
					newDoneSet.add(newFace)
				}
			})
		newValues.forEach(newFace => {
			if(newDoneSet.has(newFace)) return
			this._saveNewFace(newFace)
			newDoneSet.add(newFace)
		})
	}
	values(){
		return Object.values(this.data).map(smoosh(this.limit))
	}
}

enviroment.stats && document.body.appendChild(enviroment.stats.dom)
$webcam.addEventListener('dblclick', () => {paused = !paused})

const channel = new BroadcastChannel('frame-faces')

const HEAD_SCALE = {x: 1 + 1/5, y: 1 + 1/2.5}

const getDistanceSquared = (v1, v2) => (v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2
const getDistance = (v1, v2) => Math.sqrt(getDistanceSquared(v1, v2))
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

const cache = new TrackedFacesList()
const publish = newFaces => {
	cache.updateWith(newFaces)
	const message = cache.values()
	console.log('output:', message)
	channel.postMessage(message)
}

const dimensionsAvailableCb = ($element) => async callback => {
	if($element.videoWidth > 0){
		return callback({width: $element.videoWidth, height: $element.videoHeight})
	}
	setTimeout(() => dimensionsAvailableCb($element)(callback), 100)
}

const dimensionsAvailable = $element => new Promise(dimensionsAvailableCb($element))

const trackFaces = async () => {
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
