'use strict';

class Player {
	constructor(pixi, utage, text, audio, shaderscript) {
		this.pixi = pixi;
		this.loader = pixi.loader;
		this.utage = utage;
		this.text = text;
		this.audio = audio;
		this.shaders = shaders;
		//consts
		this.resolutionScale = 1; //I created this thinking that I would need to handle changing offset when resolution changes. But lucikly I can just scale the parent container and it works without needing this.
		this.baseFps = 60; //I am assuming that PIXI is going to stay as keeping 60fps = delta1.
		this.bgLayerName = "背景"; //The label for the BG layer.
		this.defaultCharPattern = 'すまし'; //The mission file doesn't always give a pattern for putting a character on the screen.
		this.backCharTint = 0x808080;
		this.titleWaitTime = 5;
		
		this.currentCharacters = {};
		this.layers = {};
		this.sprites = {};
		this.currentCommand = undefined;
		this.runEvent = false;
		this.secondTicker = 1000;
		this.waitTime = 0;
		this.lerpTargets = [];
		this.manualNext = false;
		this.hasMoreText = false;
		this.uiHidden = false;
		this.center = {x: ((baseDimensions.width / 2) * this.resolutionScale), y: ((baseDimensions.height / 2) * this.resolutionScale) };
		this.assetLoadPercent = 0;
		this.audioLoadPercent = 0;
		this.playingVoice = undefined;
	}
	
	playFile() {
		let runningPromise = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
		this.preCheckFilesToGet()
		.then((success) => {
			this.pixi.app.ticker.add(this.onPixiTick, this);
		}, (failure) => {
			console.log(failure);
		});
		return runningPromise;
	}
	
	//Runs through the tsv file and loads any files it will need to play.
	preCheckFilesToGet() {
		return new Promise((resolve, reject) => {
			let toLoadBgm = {};
			let toLoadSe = {};
			for(let i = 0; i < utage.currentPlayingFile.length; ++i) {
				try {
					let c = utage.currentPlayingFile[i];
					if(c.comment) { continue; }
					let command = c.Command ? c.Command.toLowerCase() : '';
					switch(command) {
						//BG images
						case "bg":
							if(this.utage.textureInfo[c.Arg1]) {
								if(!this.loader.resources[`bg|${c.Arg1}`]) {
									this.loader.add(`bg|${c.Arg1}`, this.utage.textureInfo[c.Arg1].FileName);
								}
							} else if(!this.utage.textureInfo[c.Arg1]) {
								console.log(`Failed to get BG: ${c.Arg1}`);
							}
							break;
						//Text
						case "": {
							//Character Text
							let Arg2 = c.Arg2;
							//because fuck me.
							if(Arg2 === '＜Off>') {
								Arg2 = '<Off>'
							}
							if(c.Arg1 && this.utage.characterInfo[c.Arg1] && !Arg2) {
								Arg2 = this.defaultCharPattern;
							}
							//I know the nesting here isint pretty
							//If the character at arg1|arg2 exists and arg2 is not <off>
							if(this.utage.characterInfo[c.Arg1] && this.utage.characterInfo[c.Arg1][Arg2] && Arg2 && Arg2 != "<Off>") {
								if(!this.loader.resources[`char|${c.Arg1}|${Arg2}`]) {
									this.loader.add(`char|${c.Arg1}|${Arg2}`, this.utage.characterInfo[c.Arg1][Arg2].FileName);
								}
							//If the character at arg1|arg2 isint here check at arg1|none. If not there put error in console.
							} else if(c.Arg1 && Arg2 && Arg2 != "<Off>" && 
							(!this.utage.characterInfo[c.Arg1] || !this.utage.characterInfo[c.Arg1][Arg2])) {
								if(this.utage.characterInfo[c.Arg1] && this.utage.characterInfo[c.Arg1]['none']) {
									if(!this.loader.resources[`char|${c.Arg1}|none`]) {
										this.loader.add(`char|${c.Arg1}|none`, this.utage.characterInfo[c.Arg1]['none'].FileName);
									}
								} else {
									console.log(`Failed to get Character: ${c.Arg1}|${Arg2}`);
								}
							}
							//These voices arent in the Sound.tsv because fuck you
							if(c.Voice) {
								let filename = c.Voice;
								if(filename.includes(',')) {
									let s = filename.split(',');
									filename = `${s[0].split('_').join('/')}/${s[1]}`;
								}
								filename = `${this.utage.rootDirectory}XDUData/Voice/${filename}.opus`;
								if(!toLoadSe[c.Voice]) {
									toLoadSe[c.Voice] = { Label: c.Voice, FileName: filename };
								}
							}
							break;
						}
						case "bgm":
							if(this.utage.soundInfo[c.Arg1]) {
								if(!toLoadBgm[c.Arg1]) {
									toLoadBgm[c.Arg1] = this.utage.soundInfo[c.Arg1];
								}
							} else {
								console.log(`Failed to get BGM: ${c.Arg1}`);
							}
							break;
						case "se":
							if(this.utage.soundInfo[c.Arg1]) {
								if(!toLoadSe[c.Arg1]) {
									toLoadSe[c.Arg1] = this.utage.soundInfo[c.Arg1];
								}
							} else {
								console.log(`Failed to get SE: ${c.Arg1}`);
							}
							break;
						case "henshin01_bgmoff": {
							let Arg2 = c.Arg2;
							if(c.Arg1 && this.utage.characterInfo[c.Arg1] && !Arg2) {
								Arg2 = this.defaultCharPattern;
							}
							if(this.utage.characterInfo[c.Arg1] && this.utage.characterInfo[c.Arg1][Arg2]) {
								if(!this.loader.resources[`char|${c.Arg1}|${Arg2}`]) {
									this.loader.add(`char|${c.Arg1}|${Arg2}`, this.utage.characterInfo[c.Arg1][Arg2].FileName);
								}
							}
							break;
						}
						case "henshin01": {
							let Arg2 = c.Arg2;
							if(c.Arg1 && this.utage.characterInfo[c.Arg1] && !Arg2) {
								Arg2 = this.defaultCharPattern;
							}
							if(this.utage.characterInfo[c.Arg1] && this.utage.characterInfo[c.Arg1][Arg2]) {
								if(!this.loader.resources[`char|${c.Arg1}|${Arg2}`]) {
									this.loader.add(`char|${c.Arg1}|${Arg2}`, this.utage.characterInfo[c.Arg1][Arg2].FileName);
								}
							}
							if(this.utage.soundInfo[c.Arg4]) {
								if(!toLoadBgm[c.Arg4]) {
									toLoadBgm[c.Arg4] = this.utage.soundInfo[c.Arg4];
								}
							} else {
								console.log(`Failed to get BGM: ${c.Arg4}`);
							}
							break;
						}
						case "arcanoise_appearance02":
						case "arcanoise_appearance03": {
							let Pat = this.defaultCharPattern;
							if(c.Arg1) {
								if(this.utage.characterInfo[c.Arg1] && this.utage.characterInfo[c.Arg1][Pat]) {
									if(!this.loader.resources[`char|${c.Arg1}|${Pat}`]) {
									this.loader.add(`char|${c.Arg1}|${Pat}`, this.utage.characterInfo[c.Arg1][Pat].FileName);
									}
								}
							}
							if(c.Arg2) {
								if(this.utage.characterInfo[c.Arg2] && this.utage.characterInfo[c.Arg2][Pat]) {
									if(!this.loader.resources[`char|${c.Arg2}|${Pat}`]) {
									this.loader.add(`char|${c.Arg2}|${Pat}`, this.utage.characterInfo[c.Arg2][Pat].FileName);
									}
								}
							}
							if(c.Arg3) {
								if(this.utage.characterInfo[c.Arg3] && this.utage.characterInfo[c.Arg3][Pat]) {
									if(!this.loader.resources[`char|${c.Arg3}|${Pat}`]) {
									this.loader.add(`char|${c.Arg3}|${Pat}`, this.utage.characterInfo[c.Arg3][Pat].FileName);
									}
								}
							}
						}
					}
				} catch (error) {
					console.log(error);
					continue;
				}
			}
			let audioArray = [];
			for(let s of Object.keys(toLoadBgm)) {
				audioArray.push(toLoadBgm[s]);
			}
			for(let s of Object.keys(toLoadSe)) {
				audioArray.push(toLoadSe[s]);
			}
			this.audio.loadSounds(audioArray, (percent) => {
				this.onAudioProgress(percent);
			});
			//Manually load white bg for fading. Can be tinted to change color.
			this.loader.add('bg|whiteFade', `${this.utage.rootDirectory}Images/white.png`);
			//this isint in the texture file.
			this.loader.add('bg|titlecard', `${this.utage.rootDirectory}XDUData/Sample/Texture/BG/bg_title.jpg`)
			this.loader
			.on("progress", (loader, resource) => {
				this.onPixiProgress(loader, resource);
			})
			.load(() => {
				this.onPixiLoad(resolve, reject);
			});
		});
	}
	
	//Creates all the pixi containers for ther layers defined in layers.tsv
	//also creates containers for fading
	//note containers render in the order they are added, eg. the last added is always on top
	buildLayerContainers() {
		let layersToAdd = [];
		for(let l of Object.keys(this.utage.layerInfo)) {
			layersToAdd.push(this.utage.layerInfo[l]);
		}
		layersToAdd.sort(compare);
		let parentContainer = new PIXI.Container();
		parentContainer.position.set(this.center.x, this.center.y);
		parentContainer.pivot.set(this.center.x, this.center.y);
		this.pixi.app.stage.addChild(parentContainer);
		this.layers["bg|mainparent"] = { container: parentContainer };
		for(let l of layersToAdd) {
			this.layers[l.LayerName] = { info: l };
			let cont = new PIXI.Container();
			this.layers[l.LayerName].container = cont;
			parentContainer.addChild(cont);
			//center the position of the container then offset it by the value in the layer info
			let x = (((baseDimensions.width / 2) + Number(l.X)) * this.resolutionScale);
			let y = (((baseDimensions.height / 2) - Number(l.Y)) * this.resolutionScale);
			cont.position.set(x, y);
			cont.visible = false;
		}
		let fadeBackCon = new PIXI.Container();
		let fadeBackSp = new PIXI.Sprite(this.loader.resources["bg|whiteFade"].texture);
		fadeBackSp.height = baseDimensions.height * this.resolutionScale;
		fadeBackSp.width = baseDimensions.width * this.resolutionScale;
		this.layers["bg|whiteFade"] = { info: undefined, sprite: fadeBackSp, container: fadeBackCon };
		fadeBackSp.alpha = 0;
		fadeBackCon.addChild(fadeBackSp);
		this.pixi.app.stage.addChild(fadeBackCon);
		
		function compare(a, b) {
			return a.Order - b.Order;
		}
	}
	
	buildShaders() {
		this.shaders.buildShaders();
	}
	
	//Laoding progress functions
	onPixiProgress(loader, resource) {
		this.assetLoadPercent = loader.progress;
		this.text.titleText(true, `Loading Assets... ${loader.progress.toFixed(0)}%`);
		this.onLoadProgressUpdate();
	}
	
	onAudioProgress(percent) {
		this.audioLoadPercent = percent;
		this.onLoadProgressUpdate();
	}
	
	onLoadProgressUpdate() {
		let totalProgress = (this.audioLoadPercent / 2) + (this.assetLoadPercent / 2);
		this.text.titleText(true, `Loading Assets... ${totalProgress.toFixed(0)}%`);
	}
	
	onPixiLoad(resolve, reject) {
		if(this.audioLoadPercent === 100) {
			this.text.titleText(false, '');
			setTimeout(() => {
				this.runEvent = true;
				this.buildLayerContainers();
				this.buildShaders();
				resolve();
			}, 1000);
		} else {
			setTimeout(() => {
				this.onPixiLoad(resolve, reject);
			}, 100);
		}
	}
	
	//Runs every frame. Delta is a float scaled from 1=60fps.
	onPixiTick(delta) {
		try {
			if(!this.runEvent) { return; }
			let deltaTime = (1000/this.baseFps)*delta;
			this.secondTicker -= deltaTime;
			if(isNaN(this.waitTime)) {
				this.waitTime = 0;
				console.log('WaitTime was NaN');
			}
			if(this.waitTime >= 0) {
				this.waitTime -= deltaTime;
			}
			//Lerp items
			this.loopHandleLerps(deltaTime);
			//If wait time has expired and we arent waiting for user input end the current command
			if(this.currentCommand && this.waitTime <= 0 && !this.manualNext) {
				this.processEndCommand(delta);
			}
			//If we cleared the command get the next
			if(!this.currentCommand) {
				this.getNextCommand();
			}
			//If we have a new command set up the info for it
			if(this.currentCommand && !this.manualNext && this.waitTime <= 0) {
				this.processCommand(delta);
			}
			
			if(this.secondTicker < 0) {
				this.secondTicker = 1000;
			}
		} catch (error) {
			console.log(error);
		}
	}
	
	//This loop is run every frame and handles all the animation liek tweens in the mission.
	//interpolation is not just linear even if its called HandleLerps
	loopHandleLerps(deltaTime) {
		try {
			//Loop through the lerp targets, modify the needed objects. If a object is at its 1 time state remove it from the list.
			let toRemove = [];
			for(let i = 0; i < this.lerpTargets.length; ++i) {
				try {
					let l = this.lerpTargets[i];
					if(l.cancel) {
						toRemove.push(i);
					} else {
						l.curTime += deltaTime;
						if(l.curTime < 0) { continue; }
						let inter = l.inter || "linear";
						let pos = l.curTime / l.time;
						if(l.cancel) {
							pos = 1;
						}
						if(pos >= 1) {
							pos = 1;
							toRemove.push(i);
							if(l.post) {
								let split = l.post.split('|');
								switch(split[0].toLowerCase()) {
									case "destroy":
										l.object.destroy();
										continue;
									case "clearshader":
										l.object.filters = null;
										l.object.alpha = Number(split[1]);
										break;
								}
							}
						}
						switch(l.type) {
							case "shake": {
								if(pos === 1) {
									if(l.object instanceof HTMLElement) {
										l.object.style = "";
									} else {
										l.object.position.set(l.initV.x, l.initV.y);
									}
								} else {
									let x = l.initV.x;
									let y = l.initV.y;
									if(l.finalV.x) {
										x = Math.floor(Math.random() * (l.finalV.x * (1-pos)));
									}
									if(l.finalV.y) {
										y = Math.floor(Math.random() * (l.finalV.y * (1-pos)));
									}
									if(l.object instanceof HTMLElement) {
										l.object.style = `transform: translate(${x}px, ${y}px);`;
									} else {
										l.object.position.set(l.initV.x + x, l.initV.y + y);
									}
								}
								break;
							}
							case "shader": {
								try {
									l.object.filters[0].uniforms.time = pos;
									l.object.filters[0].apply();
								} catch(error) {}
							}
							default: {
								let newValue = commonFunctions.lerp(l.initV, l.finalV, pos, inter);
								let split = l.type.split(".");
								switch(split.length) {
									case 1:
										l.object[split[0]] = newValue;
										break;
									case 2:
										l.object[split[0]][split[1]] = newValue;
										break;
									default:
										continue;
								}
								break;
							}
						}
					}
				} catch(error) {
					//If we got an exception during this it probably means the object doesnt exist anymore so just remove it.
					toRemove.push(i);
				}
			}
			for(let i = toRemove.length - 1; i > -1; --i) {
				this.lerpTargets.splice(toRemove[i], 1);
			}
		} catch (error) {
			console.log(error);
		}
	}
	
	//Processes a line from the mission tsv
	processCommand(delta) {
		try {
			let cur = this.currentCommand;
			//No seriously this is a thing they did
			if(cur.Arg2 === '＜Off>') {
				cur.Arg2 = '<off>';
			}
			switch((cur.Command || "").toLowerCase()) {
				case "scenetitle01": {
					this.waitTime = this.titleWaitTime * 1000;
					try {
						let container = this.layers[this.bgLayerName].container;
						let sprite = new PIXI.Sprite(this.loader.resources[`bg|titlecard`].texture);
						container.visible = true;
						sprite.scale.set(1.30273438, 1.30273438);
						sprite.anchor.set(0.5, 0.5);
						sprite.alpha = 0;
						container.addChild(sprite);
						this.lerpTargets.push({type: 'alpha', object: sprite, curTime: 0, time: 300, finalV: 1, initV: 0});
						this.lerpTargets.push({type: 'alpha', object: sprite, curTime: -(this.waitTime+500), time: 300, finalV: 0, initV: 1, post: "destroy"});
					} catch (error) { }
					let text = cur.English ? (utage.translations[cur.English] || cur.Text) : cur.Text;
					this.text.titleText(true, text);
					break;
				}
				case "divaeffect": {
					this.waitTime = Number(cur.Arg5) * 1000;
					let text = cur.English ? (utage.translations[cur.English] || cur.Text) : cur.Text;
					this.text.divaText(true, text);
					break;
				}
				//FadeTo
				case "continue01":
				case "fadeout": {
					if(cur.Command.toLowerCase() === "continue01") {
						cur.Arg1 = 'black';
						cur.Arg6 = 1;
					}
					this.text.dialogText(false, "");
					this.text.characterName(false, "");
					this.waitTime = Number(cur.Arg6) * 1000;
					if(!cur.Arg1)
						cur.Arg1 = 'white';
					let fadeColor = commonFunctions.getColorFromName(cur.Arg1);
					this.layers["bg|whiteFade"].sprite.tint = fadeColor.color;
					this.lerpTargets.push({type: 'alpha', object: this.layers["bg|whiteFade"].sprite, curTime: 0, time: this.waitTime, finalV: fadeColor.alpha, initV: 0});
					break;
				}
				//FadeFrom
				case "fadein": {
					this.waitTime = Number(cur.Arg6) * 1000;
					if(!cur.Arg1)
						cur.Arg1 = 'white';
					let fadeColor = commonFunctions.getColorFromName(cur.Arg1);
					this.layers["bg|whiteFade"].sprite.tint = fadeColor.color;
					this.lerpTargets.push({type: 'alpha', object: this.layers["bg|whiteFade"].sprite, curTime: 0, time: this.waitTime, finalV: 0, initV: fadeColor.alpha});
					break;
				}
				case "divalefttorightblackfade": {
					this.processDivaFadeHor(cur, false, false);
					break;
				}
				case "divalefttorightclearfade": {
					this.processDivaFadeHor(cur, true, false);
					break;
				}
				case "divarighttoleftblackfade": {
					this.processDivaFadeHor(cur, false, true);
					break;
				}
				case "divarighttoleftclearfade": {
					this.processDivaFadeHor(cur, true, true);
					break;
				}
				case "divauptodownblackfade": {
					this.processDivaFadeVert(cur, false, true);
					break;
				}
				case "divauptodownclearfade": {
					this.processDivaFadeVert(cur, true, true);
					break;
				}
				case "divadowntoupblackfade": {
					this.processDivaFadeVert(cur, false, false);
					break;
				}
				case "divadowntoupclearfade": {
					this.processDivaFadeVert(cur, true, false);
					break;
				}
				case "divasepiacamera": { //103500311
					let filter = this.shaders.shaders['sepia'];
					filter.uniforms.factor = 0.5;
					this.layers["bg|mainparent"].container.filters = [filter];
					break;
				}
				case "divasepiacameraclear": {
					this.layers["bg|mainparent"].container.filters = null;
					break;
				}
				case "bg": {
					let bgInfo = this.utage.textureInfo[cur.Arg1];
					let container = this.layers[this.bgLayerName].container;
					//If we have a fadetime we need to keep the old bg, fade its alpha out, then destroy it.
					if(cur.Arg6 && container.children[0]) {
						//I know im assuming a lot that there is already only one bg on the layer.
						this.lerpTargets.push({type: 'alpha', object: container.children[0], curTime: 0, time: (Number(cur.Arg6) * 1000), finalV: 0, initV: 1, post: "destroy"});
					} else {
						//clear the sprite for the bg currently in use.
						for(let i = 0; i < container.children.length; ++i) {
							container.children[i].destroy();
						}
					}
					container.visible = true;
					let sprite = new PIXI.Sprite(this.loader.resources[`bg|${cur.Arg1}`].texture);
					sprite.scale.set(Number(bgInfo.Scale), Number(bgInfo.Scale));
					//center the bg
					sprite.anchor.set(0.5, 0.5);
					if(cur.Arg6) {
						container.addChild(sprite);
						sprite.alpha = 0;
						this.lerpTargets.push({type: 'alpha', object: sprite, curTime: 0, time: (Number(cur.Arg6) * 1000), finalV: 1, initV: 0});
					} else {
						container.addChild(sprite);
					}
					break;
				}
				case "wait":
					this.waitTime = Number(cur.Arg6) * 1000;
					break;
				case "waitinput": {
					let time = Number(cur.Arg6);
					if(time) {
						this.waitTime = time * 1000;
					} else {
						this.manualNext = true;
					}
					break;
				}
				case "movecamera": {
					let time = Number(cur.Arg4);
					let scale = 1 + (1 - Number(cur.Arg3));
					let cont = this.layers["bg|mainparent"].container;
					let x = this.center.x + -(Number(cur.Arg1));
					//y in xdu is flipped
					let y = this.center.y - -(Number(cur.Arg2));
					if(time) {
						this.waitTime = time * 1000;
						if(cont.scale.x !== scale) {
							this.cancelLerpOfType('scale.x', cont);
							this.lerpTargets.push({type: 'scale.x', object: cont, curTime: 0, 
							time: this.waitTime, finalV: scale, initV: cont.scale.x, inter: 'quadout' });
						}
						if(cont.scale.y !== scale) {
							this.cancelLerpOfType('scale.y', cont);
							this.lerpTargets.push({type: 'scale.y', object: cont, curTime: 0, 
							time: this.waitTime, finalV: scale, initV: cont.scale.y, inter: 'quadout' });
						}
						
						if(cont.position.x !== x) {
							this.cancelLerpOfType('position.x', cont);
							this.lerpTargets.push({type: 'position.x', object: cont, curTime: 0, 
							time: this.waitTime, finalV: x, initV: cont.position.x, inter: 'quadout' });
						}
						if(cont.position.y !== y) {
							this.cancelLerpOfType('position.y', cont);
							this.lerpTargets.push({type: 'position.y', object: cont, curTime: 0, 
							time: this.waitTime, finalV: y, initV: cont.position.y, inter: 'quadout' });
						}
						
						if(cur.Arg6 && cur.Arg6.toLowerCase() === "nowait") {
							this.waitTime = 0;
						}
					} else {
						this.cancelLerpOfType('scale.x', cont);
						this.cancelLerpOfType('scale.y', cont);
						this.cancelLerpOfType('position.x', cont);
						this.cancelLerpOfType('position.y', cont);
						cont.scale.set(scale, scale);
						cont.position.set(x, y);
					}
					break;
				}
				case "characteroff": {
					this.text.dialogText(false, "");
					this.text.characterName(false, "");
					for(let c of Object.keys(this.currentCharacters)) {
						if(!this.currentCharacters[c]) { continue; }
						let curChar = this.currentCharacters[c];
						if(curChar.charName === cur.Arg1) {
							let time = Number(cur.Arg6) * 1000;
							if(!time) { time = 250; }
							this.lerpTargets.push({type: 'alpha', object: curChar.sprite, name: cur.Arg1, curTime: 0, time: time, finalV: 0, initV: 1, post: "destroy" });
							this.currentCharacters[c] = undefined;
							break;
						}
					}
				}
				case "tween":
					this.processTween(delta, cur);
					break;
				case "bgm":
					this.audio.stopSound('bgm');
					if(!this.utage.soundInfo[cur.Arg1]) {
						break;
					}
					this.audio.playSound(cur.Arg1, 'bgm');
					break;
				case "stopbgm":
					this.audio.stopSound('bgm');
					break;
				case "se":
					if(!this.utage.soundInfo[cur.Arg1]) {
						break;
					}
					this.audio.playSound(cur.Arg1, 'se');
					break;
				case "shake": {
					this.processShake(delta, cur);
					break;
				}
				default:
					this.processCommandOther(delta);
					break;
				//custom effects
				case "henshin01_bgmoff": //101000111
					this.waitTime = 1000;
					this.audio.stopSound('bgm');
					this.checkPutCharacterScreen(cur, true);
					break;
				case "henshin01":
					this.waitTime = 1000;
					this.audio.stopSound('bgm');
					if(this.utage.soundInfo[cur.Arg4]) {
						this.audio.playSound(cur.Arg4, 'bgm');
					}
					cur.Arg4 = 0;
					this.checkPutCharacterScreen(cur, true);
					break;
				case "attachit02": //103500221
					break;
				case "attachit03":
					break;
				case "attacshot12": //103500231
					break;
				case "attacslash01": //103500642
					break;
				case "attacslash02": //103500231
					break;
				case "attacslash05": //103500552
					break;
				case "attacshot11": //103500251
					break;
				case "getitem01": //103400252
					break;

				case "skillmovie": //103500341
					break;
				case "arcanoise_appearance02": { //103500341
					if(cur.Arg1 && cur.Arg2) {
						this.waitTime = 1000;
						let customCommand1 = { Command: "", Arg1: cur.Arg1, Arg2: this.defaultCharPattern, Arg3: 'キャラ右', Arg6: .5 };
						this.checkPutCharacterScreen(customCommand1, false);
						let customCommand2 = { Command: "", Arg1: cur.Arg2, Arg2: this.defaultCharPattern, Arg3: 'キャラ左', Arg6: .5 };
						this.checkPutCharacterScreen(customCommand2, false);
					}
					break;
				}
				case "arcanoise_appearance03": { //103500521
					if(cur.Arg1 && cur.Arg2 && cur.Arg3) {
						this.waitTime = 1000;
						let customCommand1 = { Command: "", Arg1: cur.Arg1, Arg2: this.defaultCharPattern, Arg3: 'キャラ右', Arg6: .5 };
						this.checkPutCharacterScreen(customCommand1, false);
						let customCommand2 = { Command: "", Arg1: cur.Arg2, Arg2: this.defaultCharPattern, Arg3: 'キャラ左', Arg6: .5 };
						this.checkPutCharacterScreen(customCommand2, false);
						let customCommand3 = { Command: "", Arg1: cur.Arg3, Arg2: this.defaultCharPattern, Arg3: 'キャラ中央', Arg6: .5 };
						this.checkPutCharacterScreen(customCommand3, false);
					}
					break;
				}
				case "noise_disappearance01": //103500331
					this.waitTime = Number(cur.Arg1) * 1000;
					break;
				case "noise_disappearance02": { //103500341
					this.waitTime = Number(cur.Arg1) * 1000;
					//let c1 = this.currentCharacters['キャラ右'];
					//if(c1) {
					//	this.lerpTargets.push({type: 'alpha', object: c1.sprite, curTime: 0, time: 200, finalV: 0, initV: 1, post: "destroy" });
					//	this.currentCharacters['キャラ右'] = undefined;
					//}
					//let c2 = this.currentCharacters['キャラ左'];
					//if(c2) {
					//	this.lerpTargets.push({type: 'alpha', object: c2.sprite, curTime: 0, time: 200, finalV: 0, initV: 1, post: "destroy" });
					//	this.currentCharacters['キャラ左'] = undefined;
					//}
					break;
				}
				case "noise_disappearance03": { //103500552
				debugger;
					this.waitTime = Number(cur.Arg1) * 1000;
					let c1 = this.currentCharacters['キャラ右'] || this.currentCharacters['キャラ右02'];
					if(c1) {
						this.lerpTargets.push({type: 'alpha', object: c1.sprite, curTime: (0 - (this.waitTime/2)), time: 200, finalV: 0, initV: 1, post: "destroy" });
						this.currentCharacters['キャラ右'] = undefined;
					}
					let c2 = this.currentCharacters['キャラ左'] || this.currentCharacters['キャラ左02'];
					if(c2) {
						this.lerpTargets.push({type: 'alpha', object: c2.sprite, curTime: (0 - (this.waitTime/2)), time: 200, finalV: 0, initV: 1, post: "destroy" });
						this.currentCharacters['キャラ左'] = undefined;
					}
					let c3 = this.currentCharacters['キャラ中央'];
					if(c3) {
						this.lerpTargets.push({type: 'alpha', object: c3.sprite, curTime: (0 - (this.waitTime/2)), time: 200, finalV: 0, initV: 1, post: "destroy" });
						this.currentCharacters['キャラ中央'] = undefined;
					}
				}
				case "noise_disappearance11": //103500341
					this.waitTime = Number(cur.Arg1) * 1000;
					break;
				case "continue01":
					break;
			}
		} catch(error) {
			console.log(error);
		}
	}
	
	processDivaFadeHor(command, clear, rtl) {
		this.waitTime = Number(command.Arg6) * 1000;
		let sprite = this.layers["bg|whiteFade"].sprite;
		let filter = this.shaders.shaders[(rtl ? 'divarighttoleftfade' : 'divalefttorightfade')];
		if(!command.Arg1) {
			command.Arg1 = 'white';
		}
		let color = commonFunctions.getColorFromName(command.Arg1);
		let rgbcolor = commonFunctions.hexToRgb(color.color);
		sprite.tint = color.color;
		sprite.alpha = color.alpha;
		filter.uniforms.time = 0.0;
		filter.uniforms.fadeincolor = (clear ? [0.0,0.0,0.0,0.0] : [rgbcolor[0],rgbcolor[1],rgbcolor[2],1.0]);
		filter.uniforms.fadeoutcolor = (clear ? [rgbcolor[0],rgbcolor[1],rgbcolor[2],1.0] : [0.0,0.0,0.0,0.0]);
		sprite.filters = [filter];
		this.lerpTargets.push({type: 'shader', object: sprite, curTime: 0, time: this.waitTime, post: `clearshader|${(clear ? '0' : `${color.alpha}`)}`});
	}
	
	//utd is UpToDown
	processDivaFadeVert(command, clear, utd) {
		this.waitTime = Number(command.Arg6) * 1000;
		let sprite = this.layers["bg|whiteFade"].sprite;
		let filter = this.shaders.shaders[(utd ? 'divauptodownfade' : 'divadowntoupfade')];
		if(!command.Arg1) {
			command.Arg1 = 'white';
		}
		let color = commonFunctions.getColorFromName(command.Arg1);
		let rgbcolor = commonFunctions.hexToRgb(color.color);
		sprite.tint = color.color;
		sprite.alpha = color.alpha;
		filter.uniforms.time = 0.0;
		filter.uniforms.fadeincolor = (clear ? [0.0,0.0,0.0,0.0] : [rgbcolor[0],rgbcolor[1],rgbcolor[2],1.0]);
		filter.uniforms.fadeoutcolor = (clear ? [rgbcolor[0],rgbcolor[1],rgbcolor[2],1.0] : [0.0,0.0,0.0,0.0]);
		sprite.filters = [filter];
		this.lerpTargets.push({type: 'shader', object: sprite, curTime: 0, time: this.waitTime, post: `clearshader|${(clear ? '0' : `${color.alpha}`)}`});
	}
	
	//This should mostly be handling things like text
	processCommandOther(delta) {
		let cur = this.currentCommand;
		//Character on screen
		this.checkPutCharacterScreen(cur);
		//Display text
		this.checkPutText(cur);
	}

	//Checks if the current command is trying to put a new character on the screen or not
	checkPutCharacterScreen(cur, special = false) {
		if((!cur.Command || special) && cur.Arg1 && this.utage.characterInfo[cur.Arg1]) {
			let lay = undefined;
			let curChar = undefined; //The character that is currently on screen with the same name as Arg1.
			let prevChar = undefined; //The character that is already on the layer we are trying to put the new char on.
			//First check if the character is already on screen
			for(let c of Object.keys(this.currentCharacters)) {
				if(!this.currentCharacters[c]) { continue; }
				if(this.currentCharacters[c].charName === cur.Arg1) {
					curChar = this.currentCharacters[c];
					lay = this.currentCharacters[c].layer;
					if(!cur.Arg3) { 
						cur.Arg3 = c;
					}
				}
			}
			//Sometimes they don't give a pattern so just assume the default.
			if(!cur.Arg2 && !curChar) {
				cur.Arg2 = this.defaultCharPattern;
			//If the character was already on screen use that pattern
			} else if (!cur.Arg2 && curChar) {
				cur.Arg2 = curChar.character.Pattern;
			}
			let chr = this.utage.characterInfo[cur.Arg1][cur.Arg2];
			if(!chr) {
				//Non character sprites don't have a pattern and just use none as a key so if we don't find a character at arg1|arg2 look for this.
				cur.Arg2 = 'none';
				chr = this.utage.characterInfo[cur.Arg1][cur.Arg2];
			}
			//If we didn't find the character at all just abandon.
			if(!chr) { return; }
			//If the script gives us a layer get that layer and if there is a character on it already.
			if(cur.Arg3) {
				lay = this.layers[cur.Arg3];
				prevChar = this.currentCharacters[cur.Arg3];
				if(!lay) { return; }
			//If they didn't give us a layer check for left and right positioning or try to go to default (middle)
			} else if(!curChar && !lay) {
				if(isCharOnLeft.apply(this)) {
					lay = this.layers['キャラ右'];
				} else if(isCharOnRight.apply(this)) {
					lay = this.layers['キャラ左'];
				} else {
					lay = this.layers['キャラ中央'];
				}
				if(!lay) { return; }
				cur.Arg3 = lay.info.LayerName;
				prevChar = this.currentCharacters[cur.Arg3];
			}
			//If the character is already on screen on another layer move them to the new layer.
			if(curChar && lay && curChar.layer.info.LayerName !== cur.Arg3) {
				this.lerpTargets.push({type: 'alpha', object: curChar.sprite, curTime: 0, time: 200, finalV: 0, initV: 1, post: "destroy" });
				this.currentCharacters[curChar.layer.info.LayerName] = undefined;
			}
			//If this character is already here and not changing patterns don't change anything.
			else if(curChar && curChar.charName === cur.Arg1 && curChar.character.Pattern === cur.Arg2) {
				return;
			}
			
			//If the layer already has a different character on it remove it.
			if(prevChar && (prevChar.charName !== cur.Arg1 || prevChar.character.Pattern !== chr.Pattern)) {
				this.lerpTargets.push({type: 'alpha', object: prevChar.sprite, curTime: 0, time: 200, finalV: 0, initV: 1, post: "destroy" });
				this.currentCharacters[cur.Arg3] = undefined;
			}
			
			let sprite = new PIXI.Sprite(this.loader.resources[`char|${cur.Arg1}|${cur.Arg2}`].texture);
			sprite.scale.set(Number(chr.Scale), Number(chr.Scale));
			let anchor = commonFunctions.getAnchorFromCharPivot(chr.Pivot);
			sprite.anchor.set(anchor.x, anchor.y);
			sprite.alpha = 0;
			let fadeTime = 200;
			//If the character is already on screen put the new sprite in the same position as the old one.
			if(curChar) {
				sprite.position.x = curChar.sprite.position.x;
				sprite.position.y = curChar.sprite.position.y;
				//if the current character is doing a tween transfer the tween to the new one.
				for(let l of this.lerpTargets) {
					if(l.type.includes('position') && l.object === curChar.sprite) {
						l.object = sprite;
						break;
					}
				}
			}
			if(cur.Arg4) {
				sprite.position.x = Number(cur.Arg4);
			}
			if(cur.Arg5) {
				sprite.position.y = Number(cur.Arg5);
			}
			if(cur.Arg6) {
				//Im halving this because their fades take too fucking long and looks bad.
				fadeTime = (Number(cur.Arg6) * 1000) / 2;
			}
			this.currentCharacters[cur.Arg3] = { layer: lay, character: chr, charName: cur.Arg1, sprite: sprite };
			if(fadeTime > 0) {
				this.lerpTargets.push({type: 'alpha', object: sprite, curTime: 0, time: fadeTime, finalV: 1, initV: 0 });
			} else {
				sprite.alpha = 1;
			}
			lay.container.addChild(sprite);
			lay.container.visible = true;
		}
		
		function isCharOnLeft() {
			for(let l of Object.keys(this.layers)) {
				let lay = this.layers[l].info;
				if(!lay) { continue; }
				if(lay.LayerName.includes('キャラ左')) {
					if(this.currentCharacters[lay.LayerName]) {
						return true;
					}
				}
			}
			return false;
		}
		
		function isCharOnRight() {
			for(let l of Object.keys(this.layers)) {
				let lay = this.layers[l].info;
				if(!lay) { continue; }
				if(lay.LayerName.includes('キャラ右')) {
					if(this.currentCharacters[lay.LayerName]) {
						return true;
					}
				}
			}
			return false;
		}
	}
	
	//Checks if the current command is trying to put text on the screen.
	checkPutText(cur) {
		if(this.playingVoice) {
			this.audio.stopSound(this.playingVoice);
		}
		if(!cur.Command && cur.Arg1 && cur.Text) {
			//If its chracter off screen text
			let text = cur.English ? (utage.translations[cur.English] || cur.Text) : cur.Text;
			text = commonFunctions.convertUtageTextTags(text);
			if(cur.Arg2 && cur.Arg2.toLowerCase() === "<off>") {
				this.text.characterName(true, utage.charTranslations[cur.Arg1] || cur.Arg1);
				this.text.dialogText(true, commonFunctions.convertUtageTextTags(text));
			} else {
				let charName = "";
				let found = false;
				//Look for the character that is saying the text to get their name
				//future note: This might be better to just look for the character in character info if this start failing.
				for(let c of Object.keys(this.currentCharacters)) {
					if(!this.currentCharacters[c]) { continue; }
					if(this.currentCharacters[c].charName === cur.Arg1) {
						this.text.characterName(true, utage.charTranslations[this.currentCharacters[c].character.NameText] || this.currentCharacters[c].character.NameText);
						this.text.dialogText(true, text);
						this.currentCharacters[c].sprite.tint = 0xFFFFFF;
						found = true;
						continue;
					}
					//while were here set other characters tint to background shade
					if(this.currentCharacters[c].sprite) {
						this.currentCharacters[c].sprite.tint = this.backCharTint;
					}
				}
				//If we didnt find the character just dump the text anyways with Arg1 as the name
				if(!found) {
					this.text.characterName(true, utage.charTranslations[cur.Arg1] || cur.Arg1);
					this.text.dialogText(true, text);
				}
			}
			this.manualNext = true;
		//Sometimes they don't give a Arg1 for the text.
		} else if(!cur.Command && cur.Arg2.toLowerCase() === "<off>" && cur.Text) {
			let text = cur.English ? (utage.translations[cur.English] || cur.Text) : cur.Text;
			this.text.characterName(true, "");
			this.text.dialogText(true, commonFunctions.convertUtageTextTags(text));
			this.manualNext = true;
		}
		if(cur.Voice) {
			this.playingVoice = cur.Voice;
			this.audio.playSound(cur.Voice);
		}
	}
	
	//Handle a tween command
	processTween(delta, cur) {
		this.text.dialogText(false, "");
		this.text.characterName(false, "");
		let curChar = undefined;
		//Find the character for the tween.
		for(let c of Object.keys(this.currentCharacters)) {
			if(!this.currentCharacters[c]) { continue; }
			if(this.currentCharacters[c].charName === cur.Arg1) {
				curChar = this.currentCharacters[c];
				this.currentCharacters[c].sprite.tint = 0xFFFFFF;
				continue;
			}
			//while were here set other characters tint to background shade
			if(this.currentCharacters[c].sprite) {
				this.currentCharacters[c].sprite.tint = this.backCharTint;
			}
		}
		if(!curChar) { return; }
		switch(cur.Arg2.toLowerCase()) {
			case "moveto": {
				let props = commonFunctions.getPropertiesFromTweenCommand(cur.Arg3);
				//moveto has a islocal value that im just assuming is true until I run into a case it actually isint.
				//note that islocal is local to the layer's position not the characters current position so the final pos will be 0 + what the command says
				if(!cur.Arg6 || cur.Arg6 !== "NoWait") {
					this.waitTime = props.time + (props.delay || 0);
				}
				if(props.x != undefined) {
					if(props.time) {
						this.lerpTargets.push({type: 'position.x', object: curChar.sprite, curTime: 0 - (props.delay || 0), time: props.time, 
						finalV: props.x, initV: curChar.sprite.position.x, inter: 'quadout' });
					} else {
						curChar.sprite.position.x = props.x;
					}
				}
				if(props.y != undefined) {
					if(props.time) {
						this.lerpTargets.push({type: 'position.y', object: curChar.sprite, curTime: 0 - (props.delay || 0), time: props.time, 
						finalV: props.y, initV: curChar.sprite.position.y, inter: 'quadout' });
					} else {
						curChar.sprite.position.y = props.y;
					}
				}
				break;
			}
			case "punchposition": {
				let props = commonFunctions.getPropertiesFromTweenCommand(cur.Arg3);
				if(props.time == undefined) { props.time = 1000; }
				if(!cur.Arg6 || cur.Arg6 !== "NoWait") {
					this.waitTime = props.time + (props.delay || 0);
				}
				if(props.x != undefined) {					
					this.lerpTargets.push({type: 'position.x', object: curChar.sprite, curTime: 0 - (props.delay || 0), time: props.time, 
					finalV: curChar.sprite.position.x + props.x, initV: curChar.sprite.position.x, inter: 'punch' });
				}
				if(props.y != undefined) {
					this.lerpTargets.push({type: 'position.y', object: curChar.sprite, curTime: 0 - (props.delay || 0), time: props.time, 
					finalV: curChar.sprite.position.y + props.y, initV: curChar.sprite.position.y, inter: 'punch' });
				}
				break;
			}
			case "scaleto": {
				let props = commonFunctions.getPropertiesFromTweenCommand(cur.Arg3, false);
				if(props.time == undefined) { props.time = 500; }
				//cuz I don't care about their values that make no sense when everything else uses time.
				if(props.speed) { props.time = props.speed * 1000; }
				if(!cur.Arg6 || cur.Arg6 !== "NoWait") {
					this.waitTime = props.time + (props.delay || 0);
				}
				if(props.x != undefined) {
					this.lerpTargets.push({type: 'scale.x', object: curChar.sprite, curTime: 0 - (props.delay || 0), time: props.time, 
					finalV: curChar.sprite.scale.x * props.x, initV: curChar.sprite.scale.x });
				}
				if(props.y != undefined) {
					this.lerpTargets.push({type: 'scale.y', object: curChar.sprite, curTime: 0 - (props.delay || 0), time: props.time, 
					finalV: curChar.sprite.scale.y * props.y, initV: curChar.sprite.scale.y });
				}
			}
			case "colorto": {
				let props = commonFunctions.getPropertiesFromTweenCommand(cur.Arg3);
				if(props.alpha != undefined) {
					if(props.time) {
						this.lerpTargets.push({type: 'alpha', object: curChar.sprite, curTime: 0 - (props.delay || 0), time: props.time, 
						finalV: props.alpha, initV: curChar.sprite.alpha });
					} else {
						curChar.sprite.alpha = props.alpha;
					}
					this.cancelLerpOfType('alpha', curChar.sprite);
				}
			}
		}
	}
	
	processShake(delta, cur) {
		let obj = cur.Arg1;
		switch(obj.toLowerCase()) {
			case "camera": {
				let props = commonFunctions.getPropertiesFromTweenCommand(cur.Arg3);
				if(!props.y) { props.y = 0; }
				if(!props.x) { props.x = 0; }
				if(!props.x && !props.y) { 
					props.x = 30;
					props.y = 30;
				}
				if(!props.time) { props.time = 1000; }
				//Im not waiting for these because utage seems to not.
				//f(!cur.Arg6 || cur.Arg6 !== "NoWait") {
				//	this.waitTime = props.time + (props.delay || 0);
				//
				//If the screen is currently shaking the second shake will offset it so get the init 
				// position from that shake not the current position
				let currentShake = undefined;
				for(let l of this.lerpTargets) {
					if(l.type.includes('shake') && l.object === this.pixi.app.stage) {
						currentShake = l;
						l.cancel = true;
						break;
					}
				}
				let stage = undefined;
				if(currentShake) {
					stage = currentShake.initV;
				} else {
					stage = this.pixi.app.stage.position;
				}
				
				this.lerpTargets.push({type: 'shake', object: this.pixi.app.stage, curTime: 0 - (props.delay || 0), time: props.time, 
				finalV: {x: props.x + stage.x, y: props.y + stage.y}, initV: {x: stage.x, y: stage.y} });
				break;
			}
			case "messagewindow": {
				let props = commonFunctions.getPropertiesFromTweenCommand(cur.Arg3);
				if(!props.y) { props.y = 0; }
				if(!props.x) { props.x = 0; }
				if(!props.x && !props.y) { 
					props.x = 30;
					props.y = 30;
				}
				if(!props.time) { props.time = 1000; }
				//if(!cur.Arg6 || cur.Arg6 !== "NoWait") {
				//	this.waitTime = props.time + (props.delay || 0);
				//}
				this.lerpTargets.push({type: 'shake', object: document.getElementById('dialog-box'), curTime: 0 - (props.delay || 0), time: props.time, 
				finalV: {x: props.x, y: props.y}, initV: {x: 0, y: 0} });
				break;
			}
			default: {
				let props = commonFunctions.getPropertiesFromTweenCommand(cur.Arg3);
				if(!props.y) { props.y = 0; }
				if(!props.x) { props.x = 0; }
				if(!props.x && !props.y) { 
					props.x = 30;
					props.y = 30;
				}
				if(!props.time) { props.time = 1000; }
				let curChar = undefined;
				//Find the character.
				for(let c of Object.keys(this.currentCharacters)) {
					if(!this.currentCharacters[c]) { continue; }
					if(this.currentCharacters[c].charName === cur.Arg1) {
						curChar = this.currentCharacters[c];
						continue;
					}
				}
				if(!curChar) { return; }
				//The sprite's position should be added to the final x and y when setting the shake position.
				this.lerpTargets.push({type: 'shake', object: curChar.sprite, curTime: 0 - (props.delay || 0), time: props.time, 
				finalV: {x: props.x, y: props.y}, initV: {x: curChar.sprite.position.x, y: curChar.sprite.position.y} });
			}
		}
	}
	
	cancelLerpOfType(type, object) {
		for(let l of this.lerpTargets) {
			if(l.type.includes(type) && l.object === object) {
				l.cancel = true;
			}
		}
	}

	processEndCommand(delta) {
		let cur = this.currentCommand;
		switch(cur.Command) {
			case "SceneTitle01":
				this.text.titleText(false, '');
				break;
			case "DivaEffect":
				this.text.divaText(false, '');
				break;
		}
		this.currentCommand = undefined;
	}
	
	onMainClick(event) {
		if(!this.runEvent) {
			return
		}
		event.preventDefault();
		event.stopPropagation();
		if(this.manualNext && !this.uiHidden) {
			if (!this.text.scrollingText) {
				this.manualNext = false;
				this.waitTime = 0;
			} else if(this.text.scrollingText) {
				this.text.showDialogFullText();
			}
		} else if(this.uiHidden) {
			this.text.hideUi(true);
			this.uiHidden = false;
		}
	}
	
	hideUiClicked(event) {
		if(!this.runEvent) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		this.uiHidden = !this.uiHidden;
		this.text.hideUi(!this.uiHidden);
	}

	onEndFile() {
		this.resolve();
	}
	
	getNextCommand() {
		let command = utage.currentPlayingFile.pop();
		if(!utage.currentPlayingFile || utage.currentPlayingFile.length === 0) {
			this.onEndFile();
			return;
		}
		if(!command || command.comment || (!command.Command && !command.Arg1 && !command.Arg2 && !command.Arg3 && !command.Arg4 && !command.Arg5 && !command.Arg6)) {
			this.getNextCommand();
			return;
		}
		this.currentCommand = command;
	}
	
	updateResolution(res) {
		let newScale = res.height / baseDimensions.height;
		this.pixi.app.stage.scale.set(newScale, newScale);
		this.pixi.app.renderer.resize(res.width, res.height);
		document.getElementById('text-container').style.cssText = `transform: scale(${newScale})`;
	}
	
	resetAll() {
		return new Promise((resolve, reject) => {
			try {
				this.pixi.app.ticker.remove(this.onPixiTick, this);
				this.pixi.app.stage.children.forEach(function(child) { child.destroy(true, true, true); });
				for(let tex of Object.keys(PIXI.utils.TextureCache)) {
					if(PIXI.utils.TextureCache[tex]) {
						PIXI.utils.TextureCache[tex].destroy(true); 
					}
				}
				utage.currentPlayingFile.length = 0;
				this.loader.reset();
				this.currentCharacters = {};
				this.layers = {};
				this.sprites = {};
				this.currentCommand = undefined;
				this.runEvent = false;
				this.secondTicker = 1000;
				this.waitTime = 0;
				this.lerpTargets = [];
				this.manualNext = false;
				this.hasMoreText = false;
				this.audioLoadPercent = 0;
				this.assetLoadPercent = 0;
				this.playingVoice = undefined;
				this.text.resetAll();
				this.audio.resetAll();
				this.utage.resetTranslations();
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}
}