//http://glslsandbox.com/e#39992.0
class Shaders {
	constructor() {
		this.leftToRightFadeShader = `
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
		this.rightToLeftFadeShader = `
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
			color = mix(color, fadeoutcolor, smoothstep(step2, step3, mappedCoord.y));
			color = mix(color, fadeoutcolor, smoothstep(step3, step4, mappedCoord.y));
		
			gl_FragColor = color;
		}`
		this.shaders = {};
	}
	
	buildShaders() {
		let divalefttorightfade = new PIXI.Filter(null, this.leftToRightFadeShader, { 
			time: { type: 'f', value: 0 },
			dimensions: { type: 'v2', value: [baseDimensions.width, baseDimensions.height] },
			fadeincolor: { type: 'v4', value: [0.0,0.0,0.0,1.0] },
			fadeoutcolor: { type: 'v4', value: [0.0,0.0,0.0,0.0] }
		});
		divalefttorightfade.apply = baseShaderApply;
		this.shaders['divalefttorightfade'] = divalefttorightfade;
		
		let divarighttoleftfade = new PIXI.Filter(null, this.rightToLeftFadeShader, { 
			time: { type: 'f', value: 0 },
			dimensions: { type: 'v2', value: [baseDimensions.width, baseDimensions.height] },
			fadeincolor: { type: 'v4', value: [0.0,0.0,0.0,1.0] },
			fadeoutcolor: { type: 'v4', value: [0.0,0.0,0.0,0.0] }
		});
		divarighttoleftfade.apply = baseShaderApply;
		this.shaders['divarighttoleftfade'] = divarighttoleftfade;
		
		let divauptodownfade = new PIXI.Filter(null, this.uptoDownFadeShader, {
			time: { type: 'f', value: 0 },
			dimensions: { type: 'v2', value: [baseDimensions.width, baseDimensions.height] },
			fadeincolor: { type: 'v4', value: [0.0,0.0,0.0,1.0] },
			fadeoutcolor: { type: 'v4', value: [0.0,0.0,0.0,0.0] }
		});
		divauptodownfade.apply = baseShaderApply;
		this.shaders['divauptodownfade'] = divauptodownfade;
		
		let divadowntoupfade = new PIXI.Filter(null, this.downToUpFadeShader, {
			time: { type: 'f', value: 0 },
			dimensions: { type: 'v2', value: [baseDimensions.width, baseDimensions.height] },
			fadeincolor: { type: 'v4', value: [0.0,0.0,0.0,1.0] },
			fadeoutcolor: { type: 'v4', value: [0.0,0.0,0.0,0.0] }
		});
		divadowntoupfade.apply = baseShaderApply;
		this.shaders['divadowntoupfade'] = divadowntoupfade;
		
		function baseShaderApply(filterManager, input, output) {
			this.uniforms.dimensions[0] = input.sourceFrame.width
			this.uniforms.dimensions[1] = input.sourceFrame.height
			filterManager.applyFilter(this, input, output);
		}
	}
}