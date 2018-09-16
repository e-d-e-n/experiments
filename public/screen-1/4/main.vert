uniform float time;
uniform float decay;
uniform float waves;
uniform float pointSize;
varying float noisefactor;

void main(){
	noisefactor = turbulence(decay * abs(normal + time));
	float noise = sin((1.0 *  - waves) * noisefactor);
	float displacement = 1.0 + noise * -1.0;

	vec3 newPosition = (position) + (normal * displacement);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
	gl_PointSize = pointSize;
}
