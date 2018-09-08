uniform float time;
uniform float pointscale;
uniform float decay;
uniform float complex;
uniform float waves;
uniform float eqcolor;
uniform bool fragment;

varying float qnoise;

void main(){
	float displacement;
	float factor = turbulence(decay * abs(normal + time));

	float noise = (1.0 *  - waves) * factor;
	qnoise = (2.0 *  - eqcolor) * factor;
	float b = pnoise( complex * (position) + vec3(1.0 * time), vec3( 100.0 ));

	if(fragment == true){
		displacement = - sin(noise) + normalize(b * 0.5);
	}else{
		displacement = - sin(noise) + cos(b * 0.5);
	}

	vec3 newPosition = (position) + (normal * displacement);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
	gl_PointSize = pointscale;
}
