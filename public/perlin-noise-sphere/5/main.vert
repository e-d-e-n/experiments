uniform float time;
uniform float decay;
uniform float complexity;
uniform float waves;
uniform float pointSize;
uniform bool fragment;
varying float noisefactor;

void main(){
	noisefactor = turbulence(decay * abs(normal + time));
	float noise = sin((1.0 *  - waves) * noisefactor);
	float b = pnoise(complexity * (position) + vec3(time), vec3(100.0));
	float positiondiff = (fragment ? normalize(b * 0.5) : 1.0);
	float displacement = positiondiff + noise * -1.0;

	vec3 newPosition = (position) + (normal * displacement);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
	gl_PointSize = pointSize;
}
