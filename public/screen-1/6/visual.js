let paused = false
let faceData = []

!((new BroadcastChannel('brfv4-faces')).onmessage = ({data}) => {faceData = data})

const options = {
	radius: 3,
	detail: 7,
	background: new THREE.Color(0xffffff),
	perlin: {
		speed: 0.00050,
		decay: 0.10,
		complexity: 0.30,
		waves: 20.0,
		huediff: 0,
		point: 1.25,
		fragment: true,
	},
	faces: {
		factor: 2.5,
		positionZ: 9.5,
		pointSize: 5,
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

	const {camera, renderer} = createWorld({width, height, domElement})
	const {plasma, material} = createPlasma({options, vertexShader, fragmentShader})
	const {faces} = createFaces({options})
	const {videoZone} = createVideoZone({options})

	scene.add(plasma)
	scene.add(faces)
	scene.add(videoZone)

	const {stats} = createGUI({camera, options})
	animation({scene, plasma, camera, material, renderer, options, start, stats, faces, videoZone})

	const resizeHandler = () => onWindowResize({camera, renderer, window})
	window.addEventListener('resize', resizeHandler)
	domElement.addEventListener('dblclick', () => {paused = !paused})
}

function createWorld({width, height, domElement}){
	const camera = new THREE.PerspectiveCamera(55, width / height, 1, 1000)
	camera.position.z = 12
	camera.up = new THREE.Vector3(0, 0, 1)

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

const createPlasma = ({options, vertexShader, fragmentShader}) => {
	const plasma = new THREE.Object3D()
	const material = new THREE.ShaderMaterial({
		vertexShader, fragmentShader,
		uniforms: {
			time: {type: 'f', value: 0.0},
			decay: {type: 'f', value: 0.0},
			complexity: {type: 'f', value: 0.0},
			waves: {type: 'f', value: 0.0},
			huediff: {type: 'f', value: 0.0},
			pointSize: {type: 'f', value: 0.0},
			fragment: {type: 'i', value: true},
		},
	})

	const geo = new THREE.IcosahedronBufferGeometry(options.radius,options.detail)
	const mesh = new THREE.Points(geo, material)

	plasma.add(mesh)
	return {plasma, material}
}


const createFaces = ({options}) => {
	const material = new THREE.PointsMaterial({color: 0x000000, size: 1, sizeAttenuation: false})
	const faceVertexCount = 68
	const maxFaces = 8
	const facePositions = new Array(maxFaces).fill(new Float32Array(faceVertexCount * 3))

	const faces = new THREE.Group()

	facePositions.forEach(positions => {
		const geo = new THREE.BufferGeometry()
		geo.addAttribute('position', new THREE.BufferAttribute(positions, 3))
		const mesh = new THREE.Points(geo, material)
		mesh.visible = false
		faces.add(mesh)
	})

	return {faces}
}

const createVideoZone = ({options}) => {
	const material = new THREE.LineBasicMaterial({color: 0x0000ff, linewidth: 8})
	const points = new Float32Array(4 * 3)
	const geometry = new THREE.BufferGeometry()
	geometry.addAttribute('position', new THREE.BufferAttribute(points, 3))
	const videoZone = new THREE.LineLoop(geometry, material)
	return {videoZone}
}

function createGUI({options, camera}){
	const stats = new Stats()
	document.body.appendChild(stats.dom)

	const gui = new dat.GUI()

	const sceneGUI = gui.addFolder('Scene')
	sceneGUI.addThreeColor(options, 'background').name('Background')
	// sceneGUI.open()

	const camGUI = gui.addFolder('Camera')
	camGUI.add(camera.position, 'z', 1, 20).name('Distance')
	// camGUI.open()

	const perlinGUI = gui.addFolder('Shader Options')
	perlinGUI.add(options.perlin, 'speed', 0.00000, 0.00050).name('Speed')
	perlinGUI.add(options.perlin, 'decay', 0.0, 1.00).name('Decay')
	perlinGUI.add(options.perlin, 'waves', 0.0, 20.00).name('Waves')
	perlinGUI.add(options.perlin, 'point', 1, 2).name('Point Size')
	perlinGUI.add(options.perlin, 'fragment', true).name('Fragment')
	perlinGUI.add(options.perlin, 'complexity', 0.1, 1.00).name('Complexity')
	perlinGUI.add(options.perlin, 'huediff', 0.0, 15.0).name('Hue')
	// perlinGUI.open()

	const facesGUI = gui.addFolder('Faces options')
	facesGUI.add(options.faces, 'factor', -10, 10)
	facesGUI.add(options.faces, 'positionZ', 0, 13)
	facesGUI.add(options.faces, 'pointSize', 0.1, 10)

	facesGUI.open()

	return {stats, gui}
}

function animation(enviroment){
	requestAnimationFrame(() => {animation(enviroment)})
	if(paused) return

	enviroment.stats && enviroment.stats.begin()

	const {
		camera, renderer, options, start,
		scene, material, faces, videoZone,
	} = enviroment

	const now = Date.now()

	scene.background = options.background

	material.uniforms.time.value = options.perlin.speed * (now - start)
	material.uniforms.decay.value = options.perlin.decay
	material.uniforms.complexity.value = options.perlin.complexity
	material.uniforms.waves.value = options.perlin.waves
	material.uniforms.huediff.value = options.perlin.huediff
	material.uniforms.pointSize.value = options.perlin.point
	material.uniforms.fragment.value = options.perlin.fragment

	camera.lookAt(scene.position)
	renderer.render(scene, camera)

	faces.children.forEach((face, index) => {
		const {factor, positionZ, pointSize} = options.faces
		const points2d = (faceData[index] && faceData[index].vertices) || []
		const visible = typeof points2d[0] === 'number'
		face.visible = visible
		if(!visible) return

		var positions = face.material.size = pointSize
		var positions = face.geometry.attributes.position.array
		let index3d = 0

		for(let index2d = 0; index2d < points2d.length; index2d++){
			index3d += 1
			if(index2d % 2 === 0){
				positions[index3d] = ((points2d[index2d] / 640) * factor) + (factor / -2)
			}else{
				positions[index3d] = ((points2d[index2d] / 480) * factor) + (factor / -2)
			}
			if(index2d % 2 === 0){
				index3d += 1
				positions[index3d] = positionZ
			}
		}

		face.geometry.attributes.position.needsUpdate = true
	})

	!(() => {
		const {factor, positionZ} = options.faces

		videoZone.geometry.attributes.position.array[0] = factor / -2
		videoZone.geometry.attributes.position.array[1] = factor / -2
		videoZone.geometry.attributes.position.array[2] = positionZ

		videoZone.geometry.attributes.position.array[3] = factor + (factor / -2)
		videoZone.geometry.attributes.position.array[4] = factor / -2
		videoZone.geometry.attributes.position.array[5] = positionZ

		videoZone.geometry.attributes.position.array[6] = factor + (factor / -2)
		videoZone.geometry.attributes.position.array[7] = factor + (factor / -2)
		videoZone.geometry.attributes.position.array[8] = positionZ

		videoZone.geometry.attributes.position.array[9]  = factor / -2
		videoZone.geometry.attributes.position.array[10] = factor + (factor / -2)
		videoZone.geometry.attributes.position.array[11] = positionZ

		videoZone.geometry.attributes.position.needsUpdate = true
	})()




	enviroment.stats && enviroment.stats.end()
}
