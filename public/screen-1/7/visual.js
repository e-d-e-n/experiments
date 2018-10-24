const faceVertexCount = 68
let paused = false
let faceData = []

const texture = new THREE.TextureLoader().load('post.png')


!((new BroadcastChannel('brfv4-faces')).onmessage = ({data}) => {faceData = data})


const options = {
	maxFaces: 8,
	radius: 3,
	detail: 7,
	fps: 10,
	raf: true,
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
	plasma: {
		scale2d: 1,
		translateX: 0,
		translateY: 0,
		translateZ: 0,
	},
	factors: {
		waves: {
			faceBegin: 0.5,
			faceKnown: 1,
		},
		waves: {
			faceBegin: 0.5,
			faceKnown: 1,
		},
		FacesToWaves: 1,
		knownFacesToWaves: 1,

	},
	faces: {
		draw: false,
		factor: (640 / 480) * 2, // 2.66
		translateX: 0,
		translateY: 0,
		positionZ: 9.45,
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

	const {stats} = createGUI({camera, faces, options, renderer})
	animation({scene, plasma, camera, renderer, options, start, stats, faces, posts})

	const resizeHandler = () => onWindowResize({camera, renderer, window})
	window.addEventListener('resize', resizeHandler)
	domElement.addEventListener('dblclick', () => {paused = !paused})
}

function createWorld({width, height, domElement}){
	const camera = new THREE.PerspectiveCamera(55, width / height, 1, 64)
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
	plasma.matrixAutoUpdate = false

	return {plasma}
}


const createFaces = ({options}) => {
	const material = new THREE.PointsMaterial({color: 0x00aaff, size: 1, sizeAttenuation: false})
	const positions = new Float32Array(faceVertexCount * 3 * options.maxFaces)
	const geometry = new THREE.BufferGeometry()
	geometry.dynamic = true

	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
	const faces = new THREE.Points(geometry, material)
	faces.matrixAutoUpdate = false
	applyFacesMatrix({faces})

	const posts = new THREE.Group()

	Array(options.maxFaces).fill(0).forEach(() => {
		const geometry = new THREE.PlaneBufferGeometry(0.5, 1)
		const material = new THREE.MeshBasicMaterial({
			map: texture, transparent: true,
			depthWrite: false, depthTest: false,
		})
		const mesh = new THREE.Mesh(geometry, material)
		mesh.matrixAutoUpdate = false
		posts.add(mesh)
	})
	posts.matrixAutoUpdate = false

	return {faces, posts}
}


function createGUI({options, camera, faces, renderer}){
	const stats = new Stats()
	document.body.appendChild(stats.dom)
	window._enterFullScreen = () => screenfull.request(renderer.domElement)

	const gui = new dat.GUI()
	gui.add(window, '_enterFullScreen').name('enter fullscreen')
	gui.add(options, 'fps', 0, 60, 1).name('fps')
	gui.add(options, 'raf').name('animationFrame')
	gui.close()

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
	perlinGUI.add(options.perlin, 'opacity', 0.0, 1.0).name('Opacity')
	// perlinGUI.open()

	const facesGUI = gui.addFolder('Faces Options')
	facesGUI.add(options.faces, 'factor', -10, 10).onChange(factor => applyFacesMatrix({faces, factor}))
	facesGUI.add(options.faces, 'translateX', -12, 12)
	facesGUI.add(options.faces, 'translateY', -12, 12)
	facesGUI.add(options.faces, 'positionZ', 0, 13)
	facesGUI.add(options.faces, 'pointSize', 1, 5)
	facesGUI.add(options.faces, 'draw', true).name('draw points')
	// facesGUI.open()

	return {stats, gui}
}

function animation(enviroment){
	const loopFn = enviroment.options.raf ? requestAnimationFrame : setTimeout
	loopFn(() => animation(enviroment), 1000 / enviroment.options.fps)
	// if(!faceData.length) loopFn(() => {animation(enviroment)})
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
	plasma.matrix.set(
		options.plasma.scale2d, 0, 0, options.plasma.translateX,
		0, options.plasma.scale2d, 0, options.plasma.translateY * -1,
		0, 0, 1, options.plasma.translateZ,
		0,0,0,1,
	)

	const {factor, positionZ, pointSize} = options.faces
	faces.material.size = pointSize
	const positions = faces.geometry.attributes.position.array
	let index3d = 0
	posts.children.forEach(post => post.visible = false)

	faceData.forEach(({points, scale, ...props} = {}, index) => {
		if(!points || points.length !== faceVertexCount) return
		for(let index2d = 0; index2d < faceVertexCount; index2d += 1){
			positions[index3d++] = points[index2d].x
			positions[index3d++] = points[index2d].y
			positions[index3d++] = positionZ
		}
		const post = posts.children[index]
		post.visible = true
		const {x: postX, y: postY} = points[27]

		const oScale = (scale/480) * 2 * 1.1875
		const translateX = (-0.5 + (postX/640)) * (factor/2)
		const translateY = ((-0.5 + (postY/480)) * -1) - ((scale/480) * (1 + 1/factor) / 3.5)
		const translateZ = oScale / 1000 // negligible ammount used for z-ordering
		post.matrix.set(
		      oScale,           0,           0,  translateX,
		           0,      oScale,           0,  translateY,
		           0,           0,           1,  translateZ,
		           0,           0,           0,           1,
		).multiply(
			new THREE.Matrix4().makeRotationFromEuler(
				new THREE.Euler(
					props.rotationX * -1,
					props.rotationY * +1,
					props.rotationZ * -1,
				)
			)
		)
	})
	posts.matrix.set(
	      factor,           0,           0,   options.faces.translateX / (factor * -2),
	           0,      factor,           0,   options.faces.translateY / (factor * -2),
	           0,           0,           1,   positionZ,
	           0,           0,           0,           1,
	)

	faces.geometry.setDrawRange(0, index3d / 3 * options.faces.draw)
	faces.geometry.attributes.position.needsUpdate = true

	renderer.render(scene, camera)

	enviroment.stats && enviroment.stats.end()
}
