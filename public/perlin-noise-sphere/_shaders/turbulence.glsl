// Turbulence By Jaume Sanchez => https://codepen.io/spite/

float turbulence(vec3 p){
	float t = - 0.1;
	for(float f = 1.0 ; f <= 3.0 ; f++){
		float power = pow(2.0, f);
		t += abs(pnoise(vec3(power * p), vec3(10.0, 10.0, 10.0)) / power);
	}
	return t;
}
