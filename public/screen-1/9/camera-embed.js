let resolution     = null
const $webcam      = document.getElementById('webcam')
const MAX_DISTANCE = 64
const MAX_FACES    = 6
const CACHE_DEPTH  = 7
const faceDetector = new FaceDetector({fastMode: true, maxDetectedFaces: MAX_FACES})

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
	const keys = Object.keys(values[0])
	return values.reduce((acc, object, index) => {
		if(!index) return object

		keys.forEach(key => {
			acc[key] = (acc[key] * index + object[key]) / (index + 1)
		})
		acc.loading = cacheDepth !== values.length
		acc.progress = values.length / cacheDepth
		return acc
	}, {})
}

const ascendingValues = ([key1, value1], [key2, value2]) => value1 - value2
const getKey = (([key]) => key)
const getKeysOrderedByValue = object => (
	Object.entries(object).sort(ascendingValues).map(getKey)
)

class TrackedFacesList {
	constructor(maxLength = 20, maxDistance = 32, limit = 12){
		this._reset(maxLength, maxDistance, limit)
	}
	_reset(maxLength, maxDistance, limit){
		this.maxLength = maxLength
		this.maxDistance = maxDistance
		this.limit = limit
		this.length = 0
		this.data = {}
		this.access = {}
	}
	_removeFace(key){
		this.length -= 1
		delete this.data[key]
		delete this.access[key]
	}
	_saveNewFace(newFace){
		const now = Date.now()
		const key = `${now}§${Math.random()}`
		const stack = new CacheStack(this.limit)
		stack.push(newFace)

		this.length += 1
		this.data[key] = stack
		this.access[key] = now

		this._resize()
	}
	_pushToFace(key, face){
		this.data[key].push(face)
		this.access[key] = Date.now()
	}
	_resize(maxLength = this.maxLength){
		this.maxLength = maxLength
		if(maxLength > this.length) return
		const LRU = getKeysOrderedByValue(this.access)
		while(this.length > maxLength) this._removeFace(LRU.shift())
	}
	updateWith(rawFaces = []){
		if(rawFaces.length === 0) return this._reset(this.maxLength, this.maxDistance, this.limit)
		const entries = Object.entries(this.data)
		const oldDoneSet = new Set()
		const newDoneSet = new Set()
		const newFaces = rawFaces.map(pickFace)

		const distances = newFaces
			.reduce((allDistances, newFace) => {
					const thisFaceDistances = entries.map(([key, value]) => {
						return [key, newFace, getDistance(value.getLast(), newFace)]
					})
					return allDistances.concat(thisFaceDistances)
				},
				[],
			)
			.sort((a, b) => a[2] - b[2])
		distances
			.forEach(([key, newFace, distance]) => {
				const oldDone = oldDoneSet.has(key)
				const newDone = newDoneSet.has(newFace)

				if(oldDone && newDone) return

				if(distance < this.maxDistance && !newDone && !oldDone){
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

		newFaces.forEach(newFace => {
			if(newDoneSet.has(newFace)) return
			this._saveNewFace(newFace)
			newDoneSet.add(newFace)
		})
	}
	values(){
		return Object.values(this.data).map(smoosh(this.limit))
	}
}

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

const cache = new TrackedFacesList(MAX_FACES, MAX_DISTANCE, CACHE_DEPTH)
const publish = rawFaces => {
	cache.updateWith(rawFaces)
	// some buggy code ends up throwing invalid values, needs to filter them.
	const message = cache.values().filter(a => typeof a.loading === 'boolean')
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
	publish(await faceDetector.detect($webcam))
}

// setup
!(async () => {
	$webcam.srcObject = await window.navigator.mediaDevices.getUserMedia({video: {width: 680, height: 480}})
	$webcam.play()
	resolution = await dimensionsAvailable($webcam)
	await trackFaces()
})()
