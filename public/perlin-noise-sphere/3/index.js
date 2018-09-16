let paused = false
const options = {
	radius: 3,
	detail: 7,
	background: new THREE.Color(0x000000),
	perlin: {
		speed: 0.00050,
		decay: 0.10,
		waves: 20.0,
		color: new THREE.Color(0xffffff),
		point: 1.25,
	},
}

dat.GUI.prototype.addThreeColor = function(obj, name){
	var cache = {}
	cache[name] = obj[name].getStyle()
	return this.addColor(cache, name).onChange(value => obj[name].setStyle(value))
}

const getRandomColor = () => {
	const hex = Math.floor(Math.random() * 16777215).toString(16)
	const pad = '000000'
	return '#' + (pad + hex).slice(-pad.length)
}

/* globals hello */
const getRandomColors = () => hello(getRandomColor(), {contrast: 4, hues: 0})


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
			pointSize: {type: 'f', value: 0.0},
		},
	})

	const geo = new THREE.IcosahedronBufferGeometry(options.radius,options.detail)
	const mesh = new THREE.Points(geo, material)

	object.add(mesh)
	return {object, material}
}

function createGUI({options, camera}){
	const stats = new Stats()
	document.body.appendChild(stats.dom)

	const gui = new dat.GUI()

	const sceneGUI = gui.addFolder('Scene')
	const bgControl = sceneGUI.addThreeColor(options, 'background').name('Background')
	sceneGUI.open()

	const camGUI = gui.addFolder('Camera')
	camGUI.add(camera.position, 'z', 1, 20).name('Distance')
	camGUI.open()

	const perlinGUI = gui.addFolder('Shader Options')
	perlinGUI.add(options.perlin, 'speed', 0.00000, 0.00050).name('Speed')
	perlinGUI.add(options.perlin, 'decay', 0.0, 1.00).name('Decay')
	perlinGUI.add(options.perlin, 'waves', 0.0, 20.00).name('Waves')
	perlinGUI.add(options.perlin, 'point', 1, 2).name('Point Size')
	const fgControl = perlinGUI.addThreeColor(options.perlin, 'color').name('Color')
	perlinGUI.open()

	const actions = {
		ramdomizeColors: () => {
			const {base, color} = getRandomColors()
			bgControl.setValue(base)
			fgControl.setValue(color)
		},
	}

	gui.add(actions, 'ramdomizeColors').name('RamdomColor')
	actions.ramdomizeColors()

	return {stats, gui}
}

function animation(enviroment){
	requestAnimationFrame(() => {animation(enviroment)})
	if(paused) return

	enviroment.stats && enviroment.stats.begin()

	const {camera, renderer, options, start, scene, material} = enviroment
	const now = Date.now()

	scene.background = options.background

	material.uniforms.time.value = options.perlin.speed * (now - start)
	material.uniforms.decay.value = options.perlin.decay
	material.uniforms.waves.value = options.perlin.waves
	material.uniforms.diffuse.value = options.perlin.color
	material.uniforms.pointSize.value = options.perlin.point

	camera.lookAt(scene.position)
	renderer.render(scene, camera)

	enviroment.stats && enviroment.stats.end()
}
