const enviroment = {stats: new Stats()}
enviroment.stats && document.body.appendChild(enviroment.stats.dom)
let faces = []
paused = false

!((new BroadcastChannel('brfv4-faces')).onmessage = ({data}) => animate(faces = data))

const webcam = {videoWidth: 640, videoHeight: 480}

const circleRadians = 2 * Math.PI
const imageData = document.getElementById('_imageData')
const debugData = document.getElementById('_debugData')
imageData.width = webcam.videoWidth
imageData.height = webcam.videoHeight
imageData.style.width = webcam.videoWidth + 'px'
imageData.style.height = webcam.videoHeight + 'px'
imageData.addEventListener('dblclick', () => {paused = !paused})
const imageDataCtx = imageData.getContext('2d')

const HEAD_SCALE = {x: 1 + 1/5, y: 1 + 1/2.5}

const getFaceRect = ({x, y, scale, rotationZ}) => {
	const width = scale * HEAD_SCALE.x
	const height = scale * HEAD_SCALE.y
	const centerX = x
	const centerY = y
	const originX = (width/-2)
	const originY = (height/-2) + (height / 3.5)
	const destX = (width/2) - originX
	const destY = (height/2) - originY + (height / 3.5)
	return {
		originX, originY,
		centerX, centerY,
		destX, destY,
		width, height,
		rotation2d: rotationZ,
	}
}


const formatFloat = float => (Math.sign(float) !== -1 ? '+' : '') + (+float).toFixed(10)
const formatIndex = index => `#00${index}`
const animate = () => {

	if(paused) return
	enviroment.stats && enviroment.stats.begin()
	imageDataCtx.clearRect(0, 0, imageData.width, imageData.height)
	for(var i = 0; i < faces.length; i++){
		var face = faces[i]
		face.points = face.points || []
		face.vertices = face.vertices || []
		var nosePoint = face.points[27] || {x: face.x, y: face.y}

		imageDataCtx.fillStyle = '#0af'
		for(var k = 0; k < face.vertices.length; k += 2){
			imageDataCtx.fillRect(face.vertices[k]-1, face.vertices[k + 1]-1, 2, 2)
		}

		imageDataCtx.strokeStyle = '#660'
		imageDataCtx.strokeRect(
			(nosePoint.x - face.scale / 2) -1,
			(nosePoint.y - face.scale / 2) -1,
			face.scale, face.scale,
		)

		imageDataCtx.strokeStyle = '#060'
		imageDataCtx.strokeRect(
			(nosePoint.x - face.scale / 2) -1,
			(nosePoint.y - face.scale ) -1,
			face.scale, face.scale * 2,
		)


		imageDataCtx.strokeStyle = '#0f0'
		imageDataCtx.strokeRect(face.x -4.5, face.y -4.5, 9, 9)

		const faceRect = getFaceRect({...face, ...nosePoint})
		imageDataCtx.strokeStyle = '#f0f'
		imageDataCtx.strokeRect(faceRect.centerX -2.5, faceRect.centerY -2.5, 5, 5)

		imageDataCtx.save()
		imageDataCtx.strokeStyle = '#ccc'
		imageDataCtx.translate(faceRect.centerX, faceRect.centerY)
		imageDataCtx.rotate(faceRect.rotation2d)
		imageDataCtx.strokeRect(
			faceRect.originX -1, faceRect.originY -1,
			faceRect.destX, faceRect.destY,
		)
		imageDataCtx.restore()

	}
	if(debugData){
		debugData.innerHTML = faces.map((face, index) => ([
			`face ${formatIndex(index)}:`,
			`| position(${nosePoint.x}, ${nosePoint.y})`,
			`| scale(${formatFloat(face.scale)})`,
			`| rotation(${formatFloat(face.rotationX)}, ${formatFloat(face.rotationY)}, ${formatFloat(face.rotationZ)})`,
			`'`,
		].join('\n'))).join('\n')
	}
	enviroment.stats && enviroment.stats.end()
}

animate()
