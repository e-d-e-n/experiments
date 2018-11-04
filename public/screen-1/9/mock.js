const channel1 = new BroadcastChannel('brfv4-faces')
const channel2 = new BroadcastChannel('frame-faces')
const publish = faces => {
	channel1.postMessage(faces)
	channel2.postMessage(faces.map(a=>({...a, rotationY: 0, rotationX: 0})))
}

const data = [{"scale":134.7091827392578,"rotationX":-0.09630736708641052,"rotationY":0.06694721430540085,"rotationZ":0.08456462621688843,"x":287.6207580566406,"y":213.92787170410156,"loading":false},{"scale":162.64639282226562,"rotationX":-0.19090448319911957,"rotationY":-0.20592355728149414,"rotationZ":-0.024923162534832954,"x":505.8973083496094,"y":151.1402130126953,"loading":false},{"scale":154.57919311523438,"rotationX":-0.17108410596847534,"rotationY":0.006975196767598391,"rotationZ":-0.03613943234086037,"x":375.9775390625,"y":148.2801971435547,"loading":false},{"scale":108.91305541992188,"rotationX":-0.01982877403497696,"rotationY":-0.09057296067476273,"rotationZ":-0.018933042883872986,"x":329.5101623535156,"y":337.25091552734375,"loading":false},{"scale":144.2373504638672,"rotationX":0.015138588845729828,"rotationY":-0.00017816158651839942,"rotationZ":0.024061623960733414,"x":104.0396499633789,"y":262.9309387207031,"loading":false},{"scale":103.16909790039062,"rotationX":-0.07618165761232376,"rotationY":-0.008676622062921524,"rotationZ":0.04924669861793518,"x":345.3590087890625,"y":290.4505615234375,"loading":false},{"scale":103.16909790039062,"rotationX":-0.07618165761232376,"rotationY":-0.008676622062921524,"rotationZ":0.04924669861793518,"x":345.3590087890625,"y":290.4505615234375,"loading":false}]
const animation = () => {
	setTimeout(animation, 1000)
	publish(data)
}

animation()
