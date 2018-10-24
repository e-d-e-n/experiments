let paused = true
let frames = (() => {
	try{
		return JSON.parse(localStorage.getItem(`${location.pathname}:frames`))
	}catch(e){
		localStorage.removeItem(`${location.pathname}:frames`)
		return []
	}
})()

let index = 0
const options = {fps: 10, raf: false}
const status = document.querySelector('#status')
const body = document.body
const channel = new BroadcastChannel('brfv4-faces')
const enviroment = {gui: new dat.GUI()}


!(({gui}) => {
	gui.add(options, 'fps', 0, 60, 1).name('fps')
	gui.add(options, 'raf').name('animationFrame')
})(enviroment)

const decompressFace = data => ({
	...data,
	points: data.vertices.reduce((result, value, index) => {
		if(index % 2){
			result[result.length - 1].y = value
		}else{
			result.push({x: value})
		}
		return result
	}, [])
})

const publish = faces => {
	channel.postMessage(faces.map(decompressFace))
}

const play = () => {
	paused = false
	localStorage.setItem(`${location.pathname}:paused`, 'false')
	status.innerHTML = 'playing'
}

const pause = () => {
	paused = true
	localStorage.setItem(`${location.pathname}:paused`, 'true')
	status.innerHTML = 'paused'
}


body.addEventListener('dragenter', event => {event.preventDefault()})
body.addEventListener('dragover',  event => {event.preventDefault()})
body.addEventListener('dblclick', () => {paused = !paused})
body.addEventListener('drop', event => {
	const reader = new FileReader()
	reader.onerror = e => alert(e.message)
	reader.onloadend = function(){
		try{
			frames = JSON.parse(this.result)
			localStorage.setItem(`${location.pathname}:frames`, this.result)
			index = 0
			play()
		}catch(e){
			alert(e.message)
		}
	}
	reader.readAsText(event.dataTransfer.files[0])
	event.preventDefault()
})

const animate = () => {
	const loopFn = options.raf ? requestAnimationFrame : setTimeout
	loopFn(animate, 1000 / options.fps)
	if(paused || !frames.length) return
	index = (index + 1) % frames.length
	publish(frames[index])
}
if(localStorage.getItem(`${location.pathname}:paused`) === 'false') play()
animate()
