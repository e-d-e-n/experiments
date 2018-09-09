const options = {
	perlin: {
		vel: 0.002,
		speed: 0.00050,
		pointsize: 1.0,
		decay: 0.10,
		complex: 0.30,
		waves: 20.0,
		eqcolor: 11.0,
		fragment: true,
	},
	spin: {
		sinVel: 0.0,
		ampVel: 80.0,
	}
}

window.addEventListener('load', () => init({
	window: window,
	document: document,
	start: new Date(),
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

	const {camera, renderer} = createWorld({width, height, domElement})
	const {object, material} = createObject({vertexShader, fragmentShader})

	scene.add(object)

	const gui = createGUI({camera, options})
	animation({scene, object, camera, material, renderer, options, start})

	const resizeHandler = () => onWindowResize({camera, renderer, window})
	window.addEventListener('resize', resizeHandler)
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

const createObject = ({vertexShader, fragmentShader}) => {
	const object = new THREE.Object3D()
	const material = new THREE.ShaderMaterial({
		vertexShader, fragmentShader,
		wireframe: false, fog: true,
		uniforms: {
			time: {type: 'f', value: 0.0},
			pointsize: {type: 'f', value: 0.0},
			decay: {type: 'f', value: 0.0},
			complex: {type: 'f', value: 0.0},
			waves: {type: 'f', value: 0.0},
			eqcolor: {type: 'f', value: 0.0},
			fragment: {type: 'i', value: true},
		},
	})

	const geo = new THREE.IcosahedronBufferGeometry(3, 7)
	const mesh = new THREE.Points(geo, material)

	object.add(mesh)
	return {object, material}
}

function createGUI({camera, options}){
	const gui = new dat.GUI()
	const camGUI = gui.addFolder('Camera')
	camGUI.add(camera.position, 'z', 3, 20).name('Zoom').listen()
	camGUI.add(options.perlin, 'vel', 0.000, 0.02).name('Velocity').listen()

	const mathGUI = gui.addFolder('Math Options')
	mathGUI.add(options.spin, 'sinVel', 0.0, 0.50).name('Sine').listen()
	mathGUI.add(options.spin, 'ampVel', 0.0, 90.00).name('Amplitude').listen()

	const perlinGUI = gui.addFolder('Setup Perlin Noise')
	perlinGUI.add(options.perlin, 'pointsize', 1.0, 5.0).name('Size').step(1)
	perlinGUI.add(options.perlin, 'speed', 0.00000, 0.00050).name('Speed').listen()
	perlinGUI.add(options.perlin, 'decay', 0.0, 1.00).name('Decay').listen()
	perlinGUI.add(options.perlin, 'waves', 0.0, 20.00).name('Waves').listen()
	perlinGUI.add(options.perlin, 'fragment', true).name('Fragment')
	perlinGUI.add(options.perlin, 'complex', 0.1, 1.00).name('Complex').listen()
	perlinGUI.add(options.perlin, 'eqcolor', 0.0, 15.0).name('Hue').listen()

	return gui
}

function animation(enviroment){
	requestAnimationFrame(() => {animation(enviroment)})

	const {object, camera, renderer, options, start, scene, material} = enviroment
	const now = Date.now()

	object.rotation.y += options.perlin.vel
	object.rotation.x = (Math.sin(now * 0.003 * options.spin.sinVel) * options.spin.ampVel) * Math.PI / 180

	material.uniforms.time.value = options.perlin.speed * (now - start)
	material.uniforms.pointsize.value = options.perlin.pointsize
	material.uniforms.decay.value = options.perlin.decay
	material.uniforms.complex.value = options.perlin.complex
	material.uniforms.waves.value = options.perlin.waves
	material.uniforms.eqcolor.value = options.perlin.eqcolor
	material.uniforms.fragment.value = options.perlin.fragment

	camera.lookAt(scene.position)
	renderer.render(scene, camera)
}
