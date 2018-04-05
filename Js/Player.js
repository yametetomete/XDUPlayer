'use strict';

const baseDimensions = {width: 1334, height: 750};
class Player {
	constructor(pixi, utage, text) {
		this.pixi = pixi;
		this.loader = pixi.loader;
		this.utage = utage;
		this.text = text;
		this.resolutionScale = 1;
		this.baseFps = 60; //I am assuming that PIXI is going to stay as keeping 60fps = delta1.
		this.blackBackSp = undefined;
		this.currentCharacters = [];
		this.layers = {};
		this.sprites = {};
		this.currentCommand = undefined;
		this.runEvent = false;
		this.secondTicker = 1000;
		this.waitTime = 0;
		this.lerpTargets = [];
		this.bgLayerName = "背景";
		this.titleWaitTime = 1;
		this.manualNext = false;
		this.hasMoreText = false;
		this.center = {x: ((baseDimensions.width / 2) * this.resolutionScale), y: ((baseDimensions.height / 2) * this.resolutionScale) };
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
	
	preCheckFilesToGet() {
		return new Promise((resolve, reject) => {
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
						case "":
							//Character Text
							if(c.Arg1 && c.Arg2 && c.Arg2 != "<Off>" && c.Text && 
							this.utage.characterInfo[c.Arg1] && this.utage.characterInfo[c.Arg1][c.Arg2]) {
								if(!this.loader.resources[`char|${c.Arg1}|${c.Arg2}`]) {
									this.loader.add(`char|${c.Arg1}|${c.Arg2}`, this.utage.characterInfo[c.Arg1][c.Arg2].FileName);
								}
							} else if(c.Arg1 && c.Arg2 && c.Arg2 != "<Off>" && 
							(!this.utage.characterInfo[c.Arg1] || !this.utage.characterInfo[c.Arg1][c.Arg2])) {
								console.log(`Failed to get Character: ${c.Arg1}|${c.Arg2}`);
							}
						break;
					}
				} catch (error) {
					console.log(error);
					continue;
				}
			}
			//Manually load white bg for fading. Can be tinted to change color.
			this.loader.add('bg|whiteFade', `${this.utage.rootDirectory}Images/white.png`);
			this.loader
			.on("progress", (loader, resource) => {
				this.onPixiProgress(loader, resource)
			})
			.load(() => {
				this.onPixiLoad(resolve, reject);
			});
		});
	}
	
	//note containers render in the order they are added, eg. the last added is always on top.
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
			let y = (((baseDimensions.height / 2) + Number(l.Y)) * this.resolutionScale);
			//let x = (Number(l.X) * this.resolutionScale);
			//let y = (Number(l.Y) * this.resolutionScale);
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
	
	onPixiProgress(loader, resource) {
		if(loader.progress < 100) {
			this.text.titleText(true, `Loading Assets... ${loader.progress}%`);
		} else {
			this.text.titleText(false, '');
		}
	}
	
	onPixiLoad(resolve, reject) {
		this.runEvent = true;
		this.buildLayerContainers();
		resolve();
	}
	
	onPixiTick(delta) {
		try
		{
			if(!this.runEvent) { return; }
			let deltaTime = (1000/this.baseFps)*delta;
			this.secondTicker -= deltaTime;
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
	
	loopHandleLerps(deltaTime) {
		//Loop through the lerp targets, modify the needed objects. If a object is at its 1 time state remove it from the list.
		let toRemove = [];
		for(let i = 0; i < this.lerpTargets.length; ++i) {
			let l = this.lerpTargets[i];
			l.curTime += deltaTime;
			let pos = l.curTime / l.time;
			if(pos >= 1) { 
				pos = 1; 
				toRemove.push(i);
			}
			var newValue = commonFunctions.lerp(l.initV, l.finalV, pos);
			var split = l.type.split(".");
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
		}
		for(let i = toRemove.length - 1; i > -1; --i) {
			this.lerpTargets.splice(toRemove[i], 1);
		}
	}
	
	processCommand(delta) {
		try {
			let cur = this.currentCommand;
			switch((cur.Command || "").toLowerCase()) {
				case "scenetitle01":
					this.waitTime = this.titleWaitTime * 1000;
					this.text.titleText(true, cur.Text);
					break;
				case "divaeffect":
					this.waitTime = Number(cur.Arg5) * 1000;
					this.text.divaText(true, cur.Text);
					break;
				//FadeTo
				case "fadeout":
					this.waitTime = Number(cur.Arg6) * 1000;
					this.layers["bg|whiteFade"].sprite.tint = commonFunctions.getColorFromName(cur.Arg1);
					this.lerpTargets.push({type: 'alpha', object: this.layers["bg|whiteFade"].sprite, curTime: 0, time: this.waitTime, finalV: 1, initV: 0});
					break;
				//FadeFrom
				case "fadein":
					this.waitTime = Number(cur.Arg6) * 1000;
					this.layers["bg|whiteFade"].sprite.tint = commonFunctions.getColorFromName(cur.Arg1);
					this.lerpTargets.push({type: 'alpha', object: this.layers["bg|whiteFade"].sprite, curTime: 0, time: this.waitTime, finalV: 0, initV: 1});
					break;
				case "bg":
					let bgInfo = this.utage.textureInfo[cur.Arg1];
					let container = this.layers[this.bgLayerName].container;
					//clear the sprite for the bg currently in use.
					for(var i = 0; i < container.children.length; ++i) {
						let s = container.children[i];
						container.children[i].destroy();
					}
					container.visible = true;
					let sprite = new PIXI.Sprite(this.loader.resources[`bg|${cur.Arg1}`].texture);
					sprite.scale.set(Number(bgInfo.Scale), Number(bgInfo.Scale));
					//center the bg
					sprite.anchor.set(0.5, 0.5);
					container.addChild(sprite);
					break;
				case "wait":
					this.waitTime = Number(cur.Arg6) * 1000;
					break;
				case "waitinput": {
					let time = Number(cur.Arg6)
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
					var cont = this.layers["bg|mainparent"].container;
					let x = this.center.x + -(Number(cur.Arg1));
					let y = this.center.y + -(Number(cur.Arg2));
					if(time) {
						this.waitTime = time * 1000;
						if(cont.scale.x !== scale) {
							this.lerpTargets.push({type: 'scale.x', object: cont, curTime: 0, 
							time: this.waitTime, finalV: scale, initV: cont.x });
						}
						if(cont.scale.y !== scale) {
							this.lerpTargets.push({type: 'scale.y', object: cont, curTime: 0, 
							time: this.waitTime, finalV: scale, initV: cont.y });
						}
						
						if(cont.position.x !== x) {
							this.lerpTargets.push({type: 'position.x', object: cont, curTime: 0, 
							time: this.waitTime, finalV: x, initV: cont.x });
						}
						
						if(cont.position.y !== y) {
							this.lerpTargets.push({type: 'position.y', object: cont, curTime: 0, 
							time: this.waitTime, finalV: y, initV: cont.y });
						}
						if(cur.Arg6 && cur.Arg6.toLowerCase() === "nowait") {
							this.waitTime = 0;
						}
					} else {
						cont.scale.set(scale, scale);
						cont.position.set(x, y);
					}
					break;
				}
				default:
					this.processCommandOther(delta);
					break;
			}
		} catch(error) {
			console.log(error);
		}
	}
	
	//This should mostly be handling things like text
	processCommandOther(delta) {
		if(this.currentCommand)
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
	
	onMainClick() {
		if(this.runEvent && this.manualNext) {
			if (!this.hasMoreText) {
				this.getNextCommand();
			} else {
				
			}
		}
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
	
	resetAll() {
		return new Promise((resolve, reject) => {
			try {
				this.pixi.app.ticker.remove(this.onPixiTick, this);
				this.pixi.app.stage.children.forEach(function(child) { child.destroy(true, true, true); });
				Object.keys(PIXI.utils.TextureCache).forEach(function(texture) { 
					if(PIXI.utils.TextureCache[texture]) {
						PIXI.utils.TextureCache[texture].destroy(true); 
					}
				});
				this.loader.reset();
				this.currentCharacters = [];
				this.currentCommand = undefined;
				this.runEvent = false;
				this.secondTicker = 1000;
				this.text.resetAll();
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}
}