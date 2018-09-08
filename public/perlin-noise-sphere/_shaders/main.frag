uniform float time;
varying float qnoise;

void main(){
	float r, g, b;
	r = cos(qnoise + 0.5);
	g = cos(qnoise - 0.5);
	b = abs(qnoise);
	gl_FragColor = vec4(r, g, b, 1.0);
}
