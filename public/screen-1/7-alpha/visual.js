const faceVertexCount = 68
let paused = false
let faceData = []

const texture = new THREE.TextureLoader().load('post.png')


!((new BroadcastChannel('brfv4-faces')).onmessage = ({data}) => {faceData = data})

const options = {
	maxFaces: 8,
	radius: 3,
	detail: 7,
	background: new THREE.Color(0xffffff),
	perlin: {
		speed: 0.00050,
		decay: 0.10,
		complexity: 0.30,
		waves: 20.0,
		huediff: 11.0,
		point: 1,
		fragment: true,
		opacity: 0.05,
	},
	faces: {
		factor: (640 / 480) * 2, // 2.66
		positionZ: 9.5,
		pointSize: 2,
	},
}

dat.GUI.prototype.addThreeColor = function(obj, name){
	var cache = {}
	cache[name] = obj[name].getStyle()
	return this.addColor(cache, name).onChange(value => obj[name].setStyle(value))
}

const applyFacesMatrix = ({faces, factor = options.faces.factor}) => {
	const scale = (1/480) * factor
	const translateY = factor / 2
	const translateX = -translateY * (640 / 480)
	faces.matrix.set(/*
		          |            |            |            |*/
		     scale,           0,           0,  translateX,
		         0,      -scale,           0,  translateY,
		         0,           0,           1,           0,
		         0,           0,           0,           1,
	)
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
	const {plasma} = createPlasma({options, vertexShader, fragmentShader})
	const {faces, posts} = createFaces({options})

	scene.add(plasma)
	scene.add(posts)
	scene.add(faces)

	const {stats} = createGUI({camera, faces, options})
	animation({scene, plasma, camera, renderer, options, start, stats, faces, posts})

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

const createPlasma = ({options, vertexShader, fragmentShader}) => {
	const material = new THREE.ShaderMaterial({
		vertexShader, fragmentShader, transparent: true,
		uniforms: {
			time: {type: 'f', value: 0.0},
			decay: {type: 'f', value: 0.0},
			complexity: {type: 'f', value: 0.0},
			waves: {type: 'f', value: 0.0},
			huediff: {type: 'f', value: 0.0},
			pointSize: {type: 'f', value: 0.0},
			fragment: {type: 'i', value: true},
			opacity: {type: 'f', value: 0.01},
		},
	})

	const geo = new THREE.IcosahedronBufferGeometry(options.radius,options.detail)
	const plasma = new THREE.Points(geo, material)

	return {plasma}
}


const createFaces = ({options}) => {
	const material = new THREE.PointsMaterial({color: 0x000000, size: 1, sizeAttenuation: false})
	const positions = new Float32Array(faceVertexCount * 3 * options.maxFaces)
	const geometry = new THREE.BufferGeometry()
	geometry.dynamic = true

	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
	const faces = new THREE.Points(geometry, material)
	faces.matrixAutoUpdate = false
	applyFacesMatrix({faces})

	const posts = new THREE.Group()
	applyFacesMatrix({faces: posts})

	Array(options.maxFaces).fill(0).forEach(() => {
		const geometry = new THREE.PlaneBufferGeometry(0.5, 1)
		const material = new THREE.MeshBasicMaterial({map: texture, transparent: true})
		const mesh = new THREE.Mesh(geometry, material)
		mesh.matrixAutoUpdate = false
		posts.add(mesh)
	})
	posts.matrixAutoUpdate = false

	return {faces, posts}
}


function createGUI({options, camera, faces}){
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
	perlinGUI.add(options.perlin, 'opacity', 0.0, 1.0).name('Opacity')
	// perlinGUI.open()

	const facesGUI = gui.addFolder('Faces options')
	facesGUI.add(options.faces, 'factor', -10, 10).onChange(factor => applyFacesMatrix({faces, factor}))
	facesGUI.add(options.faces, 'positionZ', 0, 13)
	facesGUI.add(options.faces, 'pointSize', 1, 5)

	facesGUI.open()

	return {stats, gui}
}

function animation(enviroment){
	requestAnimationFrame(() => {animation(enviroment)})
	if(paused) return

	enviroment.stats && enviroment.stats.begin()

	const {
		camera, renderer, options, start,
		scene, plasma, faces, posts,
	} = enviroment

	const now = Date.now()

	scene.background = options.background

	plasma.material.uniforms.time.value = options.perlin.speed * (now - start)
	plasma.material.uniforms.decay.value = options.perlin.decay
	plasma.material.uniforms.complexity.value = options.perlin.complexity
	plasma.material.uniforms.waves.value = options.perlin.waves
	plasma.material.uniforms.huediff.value = options.perlin.huediff
	plasma.material.uniforms.pointSize.value = options.perlin.point
	plasma.material.uniforms.fragment.value = options.perlin.fragment
	plasma.material.uniforms.opacity.value = options.perlin.opacity


	const {factor, positionZ, pointSize} = options.faces
	faces.material.size = pointSize
	const positions = faces.geometry.attributes.position.array
	let index3d = 0
	 posts.children.forEach(post => post.visible = false)

	faceData.forEach(({points, scale} = {}, index) => {
		if(!points || points.length !== faceVertexCount) return
		for(let index2d = 0; index2d < faceVertexCount; index2d += 1){
			positions[index3d++] = points[index2d].x
			positions[index3d++] = points[index2d].y
			positions[index3d++] = positionZ
		}
		const post = posts.children[index]
		post.visible = true
		const {x: postX, y: postY} = points[27]
		const _scale = (scale / (480/2))
		post.matrix = new THREE.Matrix4().set(
			_scale,           0,           0,           postX/(640 * factor * +1),
			0,           _scale,           0,           postY/(480 * factor * -1),
			0,           0,           1,           0,
			0,           0,           0,           1,
		)
	})
	 posts.matrix.set(/*
	 	          |            |            |            |*/
	 	    factor,           0,           0,           0,
	 	         0,      factor,           0,           0,
	 	         0,           0,           1,   positionZ,
	 	         0,           0,           0,           1,
	 )

	faces.geometry.setDrawRange(0, index3d / 3)
	faces.geometry.attributes.position.needsUpdate = true

	renderer.render(scene, camera)

	enviroment.stats && enviroment.stats.end()
}
