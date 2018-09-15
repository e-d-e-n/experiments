let paused = false
const options = {
	radius: 3,
	detail: 7,
	perlin: {
		speed: 0.00050,
		decay: 0.10,
		waves: 20.0,
	},
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
	const {textContent: vertexShader} = $('#vertexShader')

	const scene = new THREE.Scene()

	const {camera, renderer} = createWorld({width, height, domElement})
	const {object, material} = createObject({options, vertexShader})

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

const createObject = ({options, vertexShader}) => {
	const object = new THREE.Object3D()
	const {fragmentShader, uniforms} = THREE.ShaderLib.basic
	const material = new THREE.ShaderMaterial({
		vertexShader, fragmentShader,
		uniforms: {
			...uniforms,
			time: {type: 'f', value: 0.0},
			decay: {type: 'f', value: 0.0},
			waves: {type: 'f', value: 0.0},
		},
	})
	material.defaultAttributeValues = {
		color: [1, 1, 1],
	}

	const geo = new THREE.IcosahedronBufferGeometry(options.radius,options.detail)
	const mesh = new THREE.Points(geo, material)

	object.add(mesh)
	return {object, material}
}

function createGUI({options, camera}){
	const stats = new Stats()
	document.body.appendChild(stats.dom)

	const gui = new dat.GUI()
	const camGUI = gui.addFolder('Camera')
	camGUI.add(camera.position, 'z', 1, 20).name('Distance')
	camGUI.open()

	const perlinGUI = gui.addFolder('Shader Options')
	perlinGUI.add(options.perlin, 'speed', 0.00000, 0.00050).name('Speed')
	perlinGUI.add(options.perlin, 'decay', 0.0, 1.00).name('Decay')
	perlinGUI.add(options.perlin, 'waves', 0.0, 20.00).name('Waves')
	perlinGUI.open()

	return {stats, gui}
}

function animation(enviroment){
	requestAnimationFrame(() => {animation(enviroment)})
	if(paused) return

	enviroment.stats && enviroment.stats.begin()

	const {camera, renderer, options, start, scene, material} = enviroment
	const now = Date.now()

	material.uniforms.time.value = options.perlin.speed * (now - start)
	material.uniforms.decay.value = options.perlin.decay
	material.uniforms.waves.value = options.perlin.waves

	camera.lookAt(scene.position)
	renderer.render(scene, camera)

	enviroment.stats && enviroment.stats.end()
}
