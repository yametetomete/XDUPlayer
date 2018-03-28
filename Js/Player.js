class Player {
	constructor(pixi, utage) {
		this.pixi = pixi;
		this.loader = pixi.loader;
		this.resources = pixi.loader.resources;
		this.utage = utage;
		this.currentCharacters = [];
	}
	
	playFile() {
		let runningPromise = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
		this.preCheckFilesToGet()
		.then((success) => {
			this.pixi.app.ticker.add((delta) => { 
				this.onPixiTick(delta);
			});
			this.getNextCommand();
		}, (failure) => {
			console.log(failure);
		});
		return runningPromise;
	}
	
	preCheckFilesToGet() {
		return new Promise((resolve, reject) => {
			for(var i = 0; i < utage.currentPlayingFile.length; ++i) {
				try {
					var c = utage.currentPlayingFile[i];
					if(c.comment) { continue; }
					var command = c.Command ? c.Command.toLowerCase() : '';
					switch(command) {
						//BG images
						case "bg":
							if(this.utage.textureInfo[c.Arg1]) {
								if(!this.resources[`bg|${c.Arg1}`]) {
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
							this.utage.characterData[c.Arg1] && this.utage.characterData[c.Arg1][c.Arg2]) {
								if(!this.resources[`char|${c.Arg1}|${c.Arg2}`]) {
									this.loader.add(`char|${c.Arg1}|${c.Arg2}`, this.utage.characterData[c.Arg1][c.Arg2].FileName);
								}
							} else if(c.Arg1 && c.Arg2 && c.Arg2 != "<Off>" && 
							(!this.utage.characterData[c.Arg1] || !this.utage.characterData[c.Arg1][c.Arg2])) {
								console.log(`Failed to get Character: ${c.Arg1}|${c.Arg2}`);
							}
						break;
					}
				} catch (error) {
					console.log(error);
					continue;
				}
			}
			this.loader
			.on("progress", (loader, resource) => {
				this.onPixiProgress(loader, resource)
			})
			.load(() => {
				this.onPixiLoad(resolve, reject);
			});
		});
	}
	
	onPixiProgress(loader, resource) {
		
	}
	
	onPixiLoad(resolve, reject) {
		resolve();
	}
	
	onPixiTick(delta) {
		
	}

	onEndFile() {
		this.resolve();
	}
	
	getNextCommand() {
		let running = true;
		do
		{
			var command = utage.currentPlayingFile.pop();
			if(!utage.currentPlayingFile || utage.currentPlayingFile.length === 0) {
				this.onEndFile();
				running = false;
				return;
			}
			if(!command || command.comment) {
				continue;
			}
			//do things
			continue;
		} while (running);
	}
}