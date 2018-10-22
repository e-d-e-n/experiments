let data = []
let append = () => {}
let state = 'IDLE'

const compressFace = face => ({...face, points: undefined})

const getTimestamp = () => {
	const date = new Date()
	return new Date(Date.UTC(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		date.getHours(),
		date.getMinutes(),
		date.getSeconds(),
	)).toISOString().replace(/\..+/, '').replace(/:/g, '-')
}

const download = () => {
	var blob = new Blob([JSON.stringify(data)])
	var a = window.document.createElement('a')
	a.href = window.URL.createObjectURL(blob, {type: 'text/plain'})
	a.download = `session-${getTimestamp()}.json`
	document.body.appendChild(a).click()
	document.body.removeChild(a)
}

!((new BroadcastChannel('brfv4-faces')).onmessage = ({data}) => append(data.map(compressFace)))

const button = document.getElementById('button')
button.addEventListener('click', () => {
	switch(state){
		case 'IDLE':
			state = 'ACTIVE'
			button.innerHTML = 'stop and download'
			append = event => (event || []).length && data.push(event),
		break
		case 'ACTIVE':
			state = 'IDLE'
			button.innerHTML = 'start'
			append = () => {}
			download()
	}
})
