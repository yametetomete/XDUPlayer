const leftToRightFadeShader = `
precision mediump float;
varying vec2 vTextureCoord;
uniform vec2 dimensions;
uniform vec4 filterArea;

uniform float time;
uniform vec4 fadeincolor;
uniform vec4 fadeoutcolor;

vec2 mapCoord( vec2 coord ) {
	coord *= filterArea.xy;
	return coord;
}

void main( void ) {
	vec2 uv = vTextureCoord;
	vec2 mappedCoord = mapCoord(uv) / dimensions;
	
	float step2 = time;
	float step3 = time + 0.2;
	step3 = clamp(step3, -1.0, 1.0);
	float step4 = 1.0;

	vec4 color = fadeincolor;
	color = mix(color, fadeoutcolor, smoothstep(step2, step3, mappedCoord.x));
	color = mix(color, fadeoutcolor, smoothstep(step3, step4, mappedCoord.x));

	gl_FragColor = color;
}`
//http://glslsandbox.com/e#39992.0