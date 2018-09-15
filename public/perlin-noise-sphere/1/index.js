let paused = false
const options = {
	radius: 4.5,
	detail: 7,
}

window.addEventListener('load', () => init({
	window: window,
	document: document,
	start: Date.now(),
	options: options,
}))

const getWindowDimensions = ({innerWidth: width, innerHeight: height}) => ({width, height})

function init({window, document, options, start}){
	const $ = selector => document.querySelector(selector)
	const {width, height} = getWindowDimensions(window)

	const domElement = $('#container')

	const scene = new THREE.Scene()

	const {camera, renderer} = createWorld({width, height, domElement})
	const {object, material} = createObject({options})

	scene.add(object)

	const {stats} = createGUI({camera, options})
	animation({scene, object, camera, material, renderer, options, start, stats})

	const resizeHandler = () => onWindowResize({camera, renderer, window})
	window.addEventListener('resize', resizeHandler)
	domElement.addEventListener('dblclick', () => {paused = !paused})
}

function createWorld({width, height, domElement}){
	const camera = new THREE.PerspectiveCamera(55, width / height, 1, 1000)
	camera.position.z = 12

	const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false})
	renderer.setSize(width, height)
	domElement.appendChild(renderer.domElement)
	return {camera, renderer}
}

const onWindowResize = ({camera, renderer, window}) => {
	const {width, height} = getWindowDimensions(window)
	renderer.setSize(width, height)
	camera.aspect = width / height
	camera.updateProjectionMatrix()
}

const createObject = ({options}) => {
	const object = new THREE.Object3D()
	const material = new THREE.ShaderMaterial(THREE.ShaderLib.basic)
	const geo = new THREE.IcosahedronBufferGeometry(options.radius,options.detail)
	const mesh = new THREE.Points(geo, material)
	object.add(mesh)
	return {object, material}
}

function createGUI(){
	const stats = new Stats()
	document.body.appendChild(stats.dom)

	return {stats}
}


function animation(enviroment){
	requestAnimationFrame(() => {animation(enviroment)})
	if(paused) return

	enviroment.stats && enviroment.stats.begin()

	const {camera, renderer, scene} = enviroment

	camera.lookAt(scene.position)
	renderer.render(scene, camera)

	enviroment.stats && enviroment.stats.end()
}
