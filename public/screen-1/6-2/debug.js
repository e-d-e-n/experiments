const enviroment = {stats: new Stats()}
enviroment.stats && document.body.appendChild(enviroment.stats.dom)
let faces = []
let paused = false

!((new BroadcastChannel('brfv4-faces')).onmessage = ({data}) => animate(faces = data))

const webcam = {
	videoWidth: 640,
	videoHeight: 480,
}

const circleRadians = 2 * Math.PI
const imageData = document.getElementById('_imageData')
const debugData = document.getElementById('_debugData')
imageData.width = webcam.videoWidth
imageData.height = webcam.videoHeight
imageData.style.width = webcam.videoWidth + 'px'
imageData.style.height = webcam.videoHeight + 'px'
imageData.addEventListener('dblclick', () => {paused = !paused})
const imageDataCtx = imageData.getContext('2d')

const formatFloat = float => (Math.sign(float) !== -1 ? '+' : '') + (+float).toFixed(10)
const formatIndex = index => `#00${index}`
const animate = () => {

	if(paused) return
	enviroment.stats && enviroment.stats.begin()
	imageDataCtx.clearRect(0, 0, imageData.width, imageData.height)
	for(var i = 0; i < faces.length; i++){
		var face = faces[i]

		imageDataCtx.fillStyle = '#0af'
		for(var k = 0; k < face.vertices.length; k += 2){
			imageDataCtx.fillRect(face.vertices[k]-1, face.vertices[k + 1]-1, 2, 2)
		}
	}
	debugData.innerHTML = faces.map((face, index) => ([
		`face ${formatIndex(index)}:`,
		`| scale(${formatFloat(face.scale)})`,
		`| rotation(${formatFloat(face.rotationX)}, ${formatFloat(face.rotationY)}, ${formatFloat(face.rotationZ)})`,
		`'`,
	].join('\n'))).join('\n')
	enviroment.stats && enviroment.stats.end()
}

animate()
