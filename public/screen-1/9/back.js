const POSTS_FOLDER = '/big-data/users'
const POSTS_RANGE = 18000
const POSTS_DELAY = 100

let paused = false
let faceData = []

const loadingTexture = new THREE.TextureLoader().load('loading-black.png')

class RandomTextureLoader {
	constructor(folder, range, delay){
		if(typeof folder !== 'string') throw new Error('folder must be a string')
		if(typeof range !== 'number') throw new Error('range must be a number')
		if(typeof delay !== 'number') throw new Error('delay must be a number')
		this.range = range
		this.delay = delay
		this.folder = folder
		this.doneTextures = []
		this.loaderTimers = []
		this.imageLoaders = []
	}
	load(index){
		const now = Date.now()
		const tex = this.doneTextures[index] || loadingTexture
		if(now - this.loaderTimers[index] < this.delay) return tex

		this.loaderTimers[index] = now
		this.imageLoaders[index] = (
			this.imageLoaders[index] || new THREE.TextureLoader()
		)

		const number = Math.floor(Math.random() * (this.range - 1)) + 1
		const pngUrl = `${this.folder}/${number}.tex.png`
		this.imageLoaders[index].load(pngUrl, tex => {
			this.doneTextures[index] = tex
		})

		return tex
	}
	getTexture(index, loading){
		return loading ? loadingTexture : this.load(index)
	}
}

const postTextureLoader = new RandomTextureLoader(POSTS_FOLDER, POSTS_RANGE, POSTS_DELAY)


!((new BroadcastChannel('frame-faces')).onmessage = ({data}) => {faceData = data})


const options = {
	maxFaces: 8,
	radius: 3,
	detail: 6,
	fps: 10,
	raf: true,
	dynamic: false,
	background: new THREE.Color(0x000000),
	pixelRatio: 1,
	perlin: {
		speed: 0.00050,
		decay: 0.10,
		complexity: 0.30,
		waves: 20.0,
		saturation: 0,
		huediff: 11.0,
		point: 1.5,
		fragment: true,
		opacity: 0.066,
	},
	plasma: {
		scale2d: 1,
		translateX: 0,
		translateY: 0,
		translateZ: 0,
	},
	factors: {
		scale2d:    {base: .8, loadingFaces: .03, knownFaces: .08, totalFaces: 0.0},
		waves:      {base:  5, loadingFaces:   6, knownFaces:  14, totalFaces: 0.0},
		saturation: {base:  0, loadingFaces: 0.2, knownFaces: 0.4, totalFaces: 0.0},
	},
	posts: {
		factor: (640 / 480) * 2, // 2.66
		translateX: 0,
		translateY: 0,
		positionZ: 9.45,
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
	const {plasma} = createPlasma({options, vertexShader, fragmentShader})
	const {posts} = createPosts({options})

	scene.add(plasma)
	scene.add(posts)

	const {stats} = createGUI({camera, options, renderer})
	animation({scene, plasma, camera, renderer, options, start, stats, posts})

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


const createPosts = ({options}) => {
	const posts = new THREE.Group()

	Array(options.maxFaces).fill(0).forEach(() => {
		const geometry = new THREE.PlaneBufferGeometry(0.5, 1)
		const material = new THREE.MeshBasicMaterial({
			map: loadingTexture, transparent: true,
			depthWrite: false, depthTest: false,
		})
		const mesh = new THREE.Mesh(geometry, material)
		mesh.matrixAutoUpdate = false
		posts.add(mesh)
	})
	posts.matrixAutoUpdate = false

	return {posts}
}


function createGUI({options, camera, renderer}){
	const stats = new Stats()
	document.body.appendChild(stats.dom)
	window._enterFullScreen = () => screenfull.request(renderer.domElement)

	const gui = new dat.GUI()
	gui.add(window, '_enterFullScreen').name('enter fullscreen')
	gui.add(options, 'fps', 0, 60, 1).name('fps')
	gui.add(options, 'pixelRatio', 1, 2, 1).onChange(value => {
		renderer.setPixelRatio(value)
	})
	gui.add(options, 'raf').name('animationFrame')
	gui.add(options, 'dynamic')
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

	const postsGUI = gui.addFolder('Posts Options')
	postsGUI.add(options.posts, 'factor', -10, 10)
	postsGUI.add(options.posts, 'translateX', -12, 12)
	postsGUI.add(options.posts, 'translateY', -12, 12)
	postsGUI.add(options.posts, 'positionZ', 0, 13)
	// postsGUI.open()

	return {stats, gui}
}

const countFaces = faces => faces.reduce(
	([loadingFaces, knownFaces], {loading, progress = 1}) => ([
		loadingFaces + (!!loading * progress),
		knownFaces + !loading,
		faces.length,
	]),
	[0, 0, 0],
)

const getFactored = (
	{loadingFaces: lFactor, knownFaces: kFactor, totalFaces: tFactor, base = 0},
	{loadingFaces: lAmount, knownFaces: kAmount, totalFaces: tAmount},
) => (lFactor * lAmount) + (kFactor * kAmount) + (tFactor * tAmount) + base

const getScale = amounts => getFactored(options.factors.scale2d, amounts)
const getWaves = amounts => getFactored(options.factors.waves, amounts)
const getSaturation = amounts => getFactored(options.factors.saturation, amounts)

function animation(enviroment){
	const loopFn = enviroment.options.raf ? requestAnimationFrame : setTimeout
	loopFn(() => animation(enviroment), 1000 / enviroment.options.fps)
	// if(!faceData.length) loopFn(() => {animation(enviroment)})
	if(paused) return

	enviroment.stats && enviroment.stats.begin()

	const {
		camera, renderer, options, start,
		scene, plasma, posts,
	} = enviroment

	const now = Date.now()
	const [loadingFaces, knownFaces, totalFaces] = countFaces(faceData)
	const amounts = {loadingFaces, knownFaces, totalFaces}

	scene.background = options.background

	plasma.material.uniforms.time.value = options.perlin.speed * (now - start)
	plasma.material.uniforms.decay.value = options.perlin.decay
	plasma.material.uniforms.complexity.value = options.perlin.complexity
	plasma.material.uniforms.waves.value = options.dynamic ? getWaves(amounts) : options.perlin.waves
	plasma.material.uniforms.huediff.value = options.perlin.huediff
	plasma.material.uniforms.saturation.value = options.dynamic ? getSaturation(amounts) : options.perlin.saturation
	plasma.material.uniforms.pointSize.value = options.perlin.point
	plasma.material.uniforms.fragment.value = options.perlin.fragment
	plasma.material.uniforms.opacity.value = options.perlin.opacity

	const plasmaScale = options.dynamic ? getScale(amounts) : options.plasma.scale2d
	plasma.matrix.set(
		plasmaScale, 0, 0, options.plasma.translateX,
		0, plasmaScale, 0, options.plasma.translateY * -1,
		0, 0, 1, options.plasma.translateZ,
		0,0,0,1,
	)

	const {factor, positionZ, pointSize} = options.posts
	let index3d = 0
	posts.children.forEach(post => post.visible = false)

	faceData.forEach(({scale, ...props} = {}, index) => {
		if(typeof props.x !== 'number' || typeof props.y !== 'number') return
		const post = posts.children[index]
		post.material.map = postTextureLoader.getTexture(index, props.loading)
		post.material.map.needsUpdate = true
		post.visible = true
		const {x: postX, y: postY} = props

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
	      factor,           0,           0,   options.posts.translateX / (factor * -2),
	           0,      factor,           0,   options.posts.translateY / (factor * -2),
	           0,           0,           1,   positionZ,
	           0,           0,           0,           1,
	)


	renderer.render(scene, camera)

	enviroment.stats && enviroment.stats.end()
}
