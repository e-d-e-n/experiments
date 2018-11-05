uniform float time;
uniform float huediff;
uniform float saturation;
uniform float opacity;
varying float noisefactor;

void main(){
	float qnoise = (2.0 *  - huediff) * noisefactor;
	float base_r = cos(qnoise + 0.5);
	float base_g = cos(qnoise - 0.5);
	float base_b = abs(qnoise);
	vec3 gray = vec3((base_r + base_g + base_b) / 3.0);
	vec3 color = mix(gray, vec3(base_r, base_g, base_b), saturation);
	gl_FragColor = vec4(color, opacity);
}
