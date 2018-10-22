let paused = true
let frames = []
let index = 0
const options = {fps: 10}
const status = document.querySelector('#status')
const body = document.body
const channel = new BroadcastChannel('brfv4-faces')

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
	status.innerHTML = 'playing'
}

const pause = () => {
	paused = true
	status.innerHTML = 'paused'
}


body.addEventListener('dragenter', event => {event.preventDefault()})
body.addEventListener('dragover',  event => {event.preventDefault()})
body.addEventListener('drop', event => {
	const reader = new FileReader()
	reader.onerror = e => alert(e.message)
	reader.onloadend = function(){
		try{
			frames = JSON.parse(this.result)
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
	setTimeout(animate, 1000 / options.fps)
	if(paused || !frames.length) return
	index = (index + 1) % frames.length
	publish(frames[index])
}

animate()
