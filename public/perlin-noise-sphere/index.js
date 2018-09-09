const $ = selector => document.querySelector(selector)

window.addEventListener('load', init, false)

function init(){
	createWorld()
	createPrimitive()
	createGUI()
	animation()
}

var scene, camera, renderer
const start = Date.now()

function createWorld(){
	const width  = window.innerWidth
	const height = window.innerHeight

	scene = new THREE.Scene()

	camera = new THREE.PerspectiveCamera(55, width/height, 1, 1000)
	camera.position.z = 12

	renderer = new THREE.WebGLRenderer({antialias: true, alpha: false})
	renderer.setSize(width, height)

	$('#container').appendChild(renderer.domElement)
	window.addEventListener('resize', onWindowResize, false)
}

function onWindowResize(){
	const width = window.innerWidth
	const height = window.innerHeight
	renderer.setSize(width, height)
	camera.aspect = width / height
	camera.updateProjectionMatrix()
}

var material
var primitiveElement = function(){
	this.mesh = new THREE.Object3D()
	material = new THREE.ShaderMaterial({
		wireframe: false,
		fog: true,
		uniforms: {
			time: {type: 'f', value: 0.0},
			pointsize: {type: 'f', value: 0.0},
			decay: {type: 'f', value: 0.0},
			complex: {type: 'f', value: 0.0},
			waves: {type: 'f', value: 0.0},
			eqcolor: {type: 'f', value: 0.0},
			fragment: {type: 'i', value: true},
		},
		vertexShader: $('#vertexShader').textContent,
		fragmentShader: $('#fragmentShader').textContent,
	})
	var geo = new THREE.IcosahedronBufferGeometry(3, 7)
	var mesh = new THREE.Points(geo, material)

	this.mesh.add(mesh)
}

var _primitive
function createPrimitive() {
	_primitive = new primitiveElement()
	scene.add(_primitive.mesh)
}

var options = {
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

function createGUI(){
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

function animation(){
	requestAnimationFrame(animation)
	var performance = Date.now() * 0.003

	_primitive.mesh.rotation.y += options.perlin.vel
	_primitive.mesh.rotation.x = (Math.sin(performance * options.spin.sinVel) * options.spin.ampVel )* Math.PI / 180

	material.uniforms['time'].value = options.perlin.speed * (Date.now() - start)
	material.uniforms['pointsize'].value = options.perlin.pointsize
	material.uniforms['decay'].value = options.perlin.decay
	material.uniforms['complex'].value = options.perlin.complex
	material.uniforms['waves'].value = options.perlin.waves
	material.uniforms['eqcolor'].value = options.perlin.eqcolor
	material.uniforms['fragment'].value = options.perlin.fragment

	camera.lookAt(scene.position)
	renderer.render(scene, camera)
}
