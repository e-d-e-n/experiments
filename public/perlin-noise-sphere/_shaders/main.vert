uniform float time;
uniform float pointsize;
uniform float decay;
uniform float complex;
uniform float waves;
uniform float eqcolor;
uniform bool fragment;
varying float noisefactor;

void main(){
	noisefactor = turbulence(decay * abs(normal + time));

	float noise = (1.0 *  - waves) * noisefactor;
	float b = pnoise(complex * (position) + vec3(time), vec3(100.0));

	float displacement = sin(noise) * -1.0;
	if(fragment == true){
		displacement += normalize(b * 0.5);
	}else{
		displacement += cos(b * 0.5);
	}

	vec3 newPosition = (position) + (normal * displacement);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
	gl_PointSize = pointsize;
}
