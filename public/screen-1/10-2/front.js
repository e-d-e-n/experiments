let paused = false

const options = {
	maxFaces: 8,
	radius: 3,
	detail: 6,
	fps: 10,
	raf: true,
	background: new THREE.Color(0x0a0a0a),
	pixelRatio: 2,
	perlin: {
		speed: 0.00050,
		decay: 0.10,
		complexity: 0.30,
		waves: 20.0,
		saturation: 0,
		huediff: 11.0,
		point: 1.5,
		fragment: true,
		opacity: 0.75,
	},
	plasma: {
		scale2d: 1.5,
		translateX: 0,
		translateY: 0,
		translateZ: 0,
	},
}

dat.GUI.prototype.addThreeColor = function(obj, name){
	var cache = {}
	cache[name] = obj[name].getStyle()
	return this.addColor(cache, name).onChange(value => obj[name].setStyle(value))
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
	const {textContent: fragmentShader} = $('#fragmentShader')

	const scene = new THREE.Scene()

	const {camera, renderer} = createWorld({width, height, domElement, options})
	const {plasma} = createPlasma({options, vertexShader, fragmentShader})

	scene.add(plasma)

	// const {stats} = createGUI({camera, options, renderer, domElement})
	animation({scene, plasma, camera, renderer, options, start, stats: false})

	const resizeHandler = () => onWindowResize({camera, renderer, window})
	window.addEventListener('resize', resizeHandler)
	domElement.addEventListener('dblclick', () => {paused = !paused})
}

function createWorld({width, height, domElement, options: {pixelRatio}}){
	const camera = new THREE.PerspectiveCamera(55, width / height, 1, 64)
	camera.position.z = 12

	const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false})
	renderer.setSize(width, height)
	renderer.setPixelRatio(pixelRatio)
	domElement.appendChild(renderer.domElement)
	return {camera, renderer}
}

const onWindowResize = ({camera, renderer, window}) => {
	const {width, height} = getWindowDimensions(window)
	renderer.setSize(width, height)
	camera.aspect = width / height
	camera.updateProjectionMatrix()
}

const createPlasma = ({options, vertexShader, fragmentShader}) => {
	const material = new THREE.ShaderMaterial({
		vertexShader, fragmentShader, transparent: true,
		uniforms: {
			time: {type: 'f', value: 0.0},
			decay: {type: 'f', value: 0.0},
			complexity: {type: 'f', value: 0.0},
			waves: {type: 'f', value: 0.0},
			huediff: {type: 'f', value: 0.0},
			saturation: {type: 'f', value: 1.0},
			pointSize: {type: 'f', value: 0.0},
			fragment: {type: 'i', value: true},
			opacity: {type: 'f', value: 0.01},
		},
	})

	const geo = new THREE.IcosahedronBufferGeometry(options.radius,options.detail)
	const plasma = new THREE.Points(geo, material)
	plasma.matrixAutoUpdate = false

	return {plasma}
}



function createGUI({options, camera, renderer, domElement}){
	const stats = new Stats()
	document.body.appendChild(stats.dom)
	window._enterFullScreen = () => screenfull.request(domElement)
	window._setupFullScreen = () => screenfull.request(document.body)

	const gui = new dat.GUI()
	gui.add(window, '_enterFullScreen').name('enter fullscreen')
	gui.add(window, '_setupFullScreen').name('setup fullscreen')
	gui.add(options, 'fps', 0, 60, 1).name('fps')
	gui.add(options, 'pixelRatio', 1, 2, 1).onChange(value => {
		renderer.setPixelRatio(value)
	})
	gui.add(options, 'raf').name('animationFrame')
	// gui.close()

	const sceneGUI = gui.addFolder('Scene Options')
	sceneGUI.addThreeColor(options, 'background').name('Background')
	// sceneGUI.open()

	const camGUI = gui.addFolder('Camera Options')
	camGUI.add(camera.position, 'z', 1, 20).name('Distance')
	// camGUI.open()

	const plasmaGUI = gui.addFolder('Plasma Options')
	plasmaGUI.add(options.plasma, 'scale2d', 0.25, 5)
	plasmaGUI.add(options.plasma, 'translateX', -12, 12)
	plasmaGUI.add(options.plasma, 'translateY', -12, 12)
	plasmaGUI.add(options.plasma, 'translateZ', -24, 24)
	// plasmaGUI.open()

	const perlinGUI = gui.addFolder('Shader Options')
	perlinGUI.add(options.perlin, 'speed', 0.00000, 0.00050).name('Speed')
	perlinGUI.add(options.perlin, 'decay', 0.0, 1.00).name('Decay')
	perlinGUI.add(options.perlin, 'waves', 0, 60).name('Waves')
	perlinGUI.add(options.perlin, 'point', 1, 2).name('Point Size')
	perlinGUI.add(options.perlin, 'fragment', true).name('Fragment')
	perlinGUI.add(options.perlin, 'complexity', 0.1, 1.00).name('Complexity')
	perlinGUI.add(options.perlin, 'huediff', 0.0, 15.0).name('Hue')
	perlinGUI.add(options.perlin, 'saturation', 0.0, 1.0).name('Saturation')
	perlinGUI.add(options.perlin, 'opacity', 0.0, 1.0).name('Opacity')
	// perlinGUI.open()

	return {stats, gui}
}


function animation(enviroment){
	const loopFn = enviroment.options.raf ? requestAnimationFrame : setTimeout
	loopFn(() => animation(enviroment), 1000 / enviroment.options.fps)
	if(paused) return

	enviroment.stats && enviroment.stats.begin()

	const {
		camera, renderer, options, start,
		scene, plasma,
	} = enviroment

	const now = Date.now()

	scene.background = options.background

	plasma.material.uniforms.time.value = options.perlin.speed * (now - start)
	plasma.material.uniforms.decay.value = options.perlin.decay
	plasma.material.uniforms.complexity.value = options.perlin.complexity
	plasma.material.uniforms.waves.value = options.perlin.waves
	plasma.material.uniforms.huediff.value = options.perlin.huediff
	plasma.material.uniforms.saturation.value = options.perlin.saturation
	plasma.material.uniforms.pointSize.value = options.perlin.point
	plasma.material.uniforms.fragment.value = options.perlin.fragment
	plasma.material.uniforms.opacity.value = options.perlin.opacity

	const plasmaScale = options.plasma.scale2d
	plasma.matrix.set(
		plasmaScale, 0, 0, options.plasma.translateX,
		0, plasmaScale, 0, options.plasma.translateY * -1,
		0, 0, 1, options.plasma.translateZ,
		0,0,0,1,
	)

	renderer.render(scene, camera)

	enviroment.stats && enviroment.stats.end()
}
