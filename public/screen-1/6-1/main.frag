uniform float time;
uniform float huediff;
varying float noisefactor;

void main(){
	float qnoise = (2.0 *  - huediff) * noisefactor;
	float r, g, b;
	r = cos(qnoise + 0.5) + 0.65;
	g = cos(qnoise - 0.5) + 0.65;
	b = abs(qnoise) + 0.65;
	gl_FragColor = vec4(r, g, b, 1.0);
}
