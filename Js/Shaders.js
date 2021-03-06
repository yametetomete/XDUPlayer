//http://glslsandbox.com/e#39992.0

class Shaders {
	constructor() {
		this.leftToRightFadeShader = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform vec4 inputPixel;
		uniform highp vec4 outputFrame;
		
		uniform float time;
		uniform vec4 fadeincolor;
		uniform vec4 fadeoutcolor;
		
		void main( void ) {
			vec2 uv = vTextureCoord * inputPixel.xy / outputFrame.zw;
			vec2 mappedCoord = uv;
			
			float step2 = time;
			float step3 = time + 0.2;
			step3 = clamp(step3, -1.0, 1.0);
			float step4 = 1.0;
		
			vec4 color = fadeincolor;
			color = mix(color, fadeoutcolor, smoothstep(step2, step3, mappedCoord.x));
			color = mix(color, fadeoutcolor, smoothstep(step3, step4, mappedCoord.x));
		
			gl_FragColor = color;
		}`
		this.rightToLeftFadeShader = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform vec4 inputPixel;
		uniform highp vec4 outputFrame;
		
		uniform float time;
		uniform vec4 fadeincolor;
		uniform vec4 fadeoutcolor;
		
		void main( void ) {
			vec2 uv = vTextureCoord * inputPixel.xy / outputFrame.zw;
			vec2 mappedCoord = uv;
			
			float step2 = (1.0 - time);
			float step3 = (1.0 - time) - 0.2;
			step3 = clamp(step3, 0.0, 1.0);
			float step4 = -0.0001;
		
			vec4 color = fadeincolor;
			color = mix(color, fadeoutcolor, smoothstep(step2, step3, mappedCoord.x));
			color = mix(color, fadeoutcolor, smoothstep(step3, step4, mappedCoord.x));
		
			gl_FragColor = color;
		}`
		this.downToUpFadeShader = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform vec4 inputPixel;
		uniform highp vec4 outputFrame;
		
		uniform float time;
		uniform vec4 fadeincolor;
		uniform vec4 fadeoutcolor;
		
		void main( void ) {
			vec2 uv = vTextureCoord * inputPixel.xy / outputFrame.zw;
			vec2 mappedCoord = uv;
			
			float step2 = (1.0 - time);
			float step3 = (1.0 - time) - 0.2;
			step3 = clamp(step3, 0.0, 1.0);
			float step4 = -0.0001;
		
			vec4 color = fadeincolor;
			color = mix(color, fadeoutcolor, smoothstep(step2, step3, mappedCoord.y));
			color = mix(color, fadeoutcolor, smoothstep(step3, step4, mappedCoord.y));
		
			gl_FragColor = color;
		}`
		this.uptoDownFadeShader = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform vec4 inputPixel;
		uniform highp vec4 outputFrame;
		
		uniform float time;
		uniform vec4 fadeincolor;
		uniform vec4 fadeoutcolor;
		
		void main( void ) {
			vec2 uv = vTextureCoord * inputPixel.xy / outputFrame.zw;
			vec2 mappedCoord = uv;
			
			float step2 = time;
			float step3 = time + 0.2;
			step3 = clamp(step3, -1.0, 1.0);
			float step4 = 1.0;
		
			vec4 color = fadeincolor;
			color = mix(color, fadeoutcolor, smoothstep(step2, step3, mappedCoord.y));
			color = mix(color, fadeoutcolor, smoothstep(step3, step4, mappedCoord.y));
		
			gl_FragColor = color;
		}`
		this.sepiaShader = `
		precision mediump float;
		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform float factor;
		
		vec4 Sepia( in vec4 color )
		{
			return vec4(
				clamp(color.r * 0.393 + color.g * 0.769 + color.b * 0.189, 0.0, 1.0)
				, clamp(color.r * 0.349 + color.g * 0.686 + color.b * 0.168, 0.0, 1.0)
				, clamp(color.r * 0.272 + color.g * 0.534 + color.b * 0.131, 0.0, 1.0)
				, color.a
			);
		}
		
		void main (void) {
			gl_FragColor = texture2D(uSampler, vTextureCoord);
			gl_FragColor = mix(gl_FragColor, Sepia(gl_FragColor), clamp(factor,0.0,1.0));
		}`
		this.shaders = {};
	}
	
	//https://jsfiddle.net/60e5pp8d/1/
	//v5 changes to shaders, https://github.com/pixijs/pixi.js/wiki/v5-Creating-filters
	// https://www.html5gamedevs.com/topic/42235-how-to-get-correct-fragment-shader-uv-in-pixi-50-rc0/
	buildShaders() {
		let divalefttorightfade = new PIXI.Filter(null, this.leftToRightFadeShader, { 
			time: { type: 'f', value: 0 },
			fadeincolor: { type: 'v4', value: [0.0,0.0,0.0,1.0] },
			fadeoutcolor: { type: 'v4', value: [0.0,0.0,0.0,0.0] }
		});
		divalefttorightfade.apply = baseShaderApply;
		this.shaders['divalefttorightfade'] = divalefttorightfade;
		
		let divarighttoleftfade = new PIXI.Filter(null, this.rightToLeftFadeShader, { 
			time: { type: 'f', value: 0 },
			fadeincolor: { type: 'v4', value: [0.0,0.0,0.0,1.0] },
			fadeoutcolor: { type: 'v4', value: [0.0,0.0,0.0,0.0] }
		});
		divarighttoleftfade.apply = baseShaderApply;
		this.shaders['divarighttoleftfade'] = divarighttoleftfade;
		
		let divauptodownfade = new PIXI.Filter(null, this.uptoDownFadeShader, {
			time: { type: 'f', value: 0 },
			fadeincolor: { type: 'v4', value: [0.0,0.0,0.0,1.0] },
			fadeoutcolor: { type: 'v4', value: [0.0,0.0,0.0,0.0] }
		});
		divauptodownfade.apply = baseShaderApply;
		this.shaders['divauptodownfade'] = divauptodownfade;
		
		let divadowntoupfade = new PIXI.Filter(null, this.downToUpFadeShader, {
			time: { type: 'f', value: 0 },
			fadeincolor: { type: 'v4', value: [0.0,0.0,0.0,1.0] },
			fadeoutcolor: { type: 'v4', value: [0.0,0.0,0.0,0.0] }
		});
		divadowntoupfade.apply = baseShaderApply;
		this.shaders['divadowntoupfade'] = divadowntoupfade;
		
		let sepia = new PIXI.Filter(null, this.sepiaShader, {
			factor: { type: 'f', value: 0.5 }
		});
		sepia.apply = baseShaderApply;
		this.shaders['sepia'] = sepia;
		
		function baseShaderApply(filterManager, input, output) {
			filterManager.applyFilter(this, input, output);
		}
	}
}
