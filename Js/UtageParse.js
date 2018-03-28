//http://madnesslabo.net/utage/?page_id=4448&lang=en
'use strict';

class UtageInfo {
	constructor() {
		this.currentPlayingFile = [];
		this.rootDirectory = `${rootUrl}XDUPlayer/`;
		this.availableMissions = {};
		this.missionsList = [];
		this.characterData = {};
		this.layerData = {};
		this.localizeInfo = {};
		this.paramInfo = {};
		this.soundInfo = {};
		this.textureInfo = {};
	}
	
	loadUtageSettings(resolve, reject) {
		return new Promise((resolve, reject) => { 
			var promises = [
				commonFunctions.getFileJson(`${this.rootDirectory}Js/XduMissions.json`),
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Character.tsv`),
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Layer.tsv`),
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Localize.tsv`),
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Param.tsv`),
				//commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Scenario.tsv`),
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Sound.tsv`),
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Texture.tsv`)
			];
			Promise.all(promises)
			.then((success) => {
				this.availableMissions = success[0];
				this.missionsList = Object.keys(this.availableMissions).map((k) => {
					return `${this.availableMissions[k].Id}|${this.availableMissions[k].Name}`;
				});
				this.missionsList.sort();
				this.parseCharacterInfo(success[1]);
				this.parseLayerInfo(success[2]);
				this.parseLocalizeInfo(success[3]);
				this.parseParamInfo(success[4]);
				this.parseSoundInfo(success[5]);
				this.parseTextureInfo(success[6]);
				resolve();
			}, (failure) => {
				reject(failure);
			});
		});
	}
	
	parseMissionFile(file) {
		return new Promise((resolve, reject) => {
			commonFunctions.getFileText(file)
			.then((success) => {
				var lines = success.split("\n");
				var headers = [];
				for(let i = 0; i < lines.length; ++i) {
					var line = lines[i];
					if(i === 0) {
						headers = line.split('\t');
					} else {
						var read = commonFunctions.readLine(line, headers);
						if(read) {
							this.currentPlayingFile.push(read);
						}
					}
				}
				//Reverse the array since pop takes from the end.
				this.currentPlayingFile.reverse();
				resolve();
			}, (failure) => {
				reject(failure);
			});
		});
	}
	
	//http://madnesslabo.net/utage/?page_id=4521&lang=en
	parseCharacterInfo(text) {
		var lines = text.split("\n");
		var headers = [];
		var lastCharName = '';
		var lastNameText = '';
		for(let i = 0; i < lines.length; ++i) {
			var line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				var read = commonFunctions.readLine(line, headers);
				if(read && !read.comment) {
					//If character name is empty it means it belongs to the line before it
					// so I am grouping the patterns by character name.
					if(read.CharacterName) {
						lastCharName = read.CharacterName;
					}
					delete read.CharacterName;
					if(read.NameText) {
						lastNameText = read.NameText;
					} else {
						read.NameText = lastNameText;
					}
					if(read.FileName && !read.FileName.startsWith('file://')) {
						read.FileName = `${this.rootDirectory}XDUData/Character/${read.FileName}`;
					}
					if(!this.characterData[lastCharName]) {
						this.characterData[lastCharName] = {};
					}
					this.characterData[lastCharName][read.Pattern || "none"] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4518&lang=en
	parseLayerInfo(text) {
		var lines = text.split("\n");
		var headers = [];
		for(let i = 0; i < lines.length; ++i) {
			var line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				var read = commonFunctions.readLine(line, headers);
				if(read && read.LayerName) {
					this.layerData[read.LayerName] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4514&lang=en
	parseLocalizeInfo(text) {
		var lines = text.split("\n");
		var headers = [];
		for(let i = 0; i < lines.length; ++i) {
			var line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				var read = commonFunctions.readLine(line, headers);
				if(read && read.Key) {
					this.localizeInfo[read.Key] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4517&lang=en
	parseParamInfo(text) {
		var lines = text.split("\n");
		var headers = [];
		for(let i = 0; i < lines.length; ++i) {
			var line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				var read = commonFunctions.readLine(line, headers);
				if(read && read.Label) {
					this.paramInfo[read.Label] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4519&lang=en
	parseSoundInfo(text) {
		var lines = text.split("\n");
		var headers = [];
		for(let i = 0; i < lines.length; ++i) {
			var line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				var read = commonFunctions.readLine(line, headers);
				if(read && read.Label) {
					if(read.FileName && read.Type) {
						if(!read.FileName.includes('.')) {
							read.FileName = `${read.FileName}.opus`;
						}
						switch(read.Type.toLowerCase()) {
							case 'se': 
								if(read.FileName.includes(',')) {
									var s = read.FileName.split(',');
									read.FileName = `${s[0].split('_').join('/')}/${s[1]}`;
								}
								read.FileName = `${this.rootDirectory}XDUData/Se/${read.FileName}`;
								break;
							case 'bgm':
								read.FileName = `${this.rootDirectory}XDUData/Bgm/${read.FileName}`;
								break;
						}
					}
					this.soundInfo[read.Label] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4520&lang=en
	parseTextureInfo(text) {
		var lines = text.split("\n");
		var headers = [];
		for(let i = 0; i < lines.length; ++i) {
			var line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				var read = commonFunctions.readLine(line, headers);
				if(read && read.Label) {
					read.FileName = `${this.rootDirectory}XDUData/BG/${read.FileName}`;
					this.textureInfo[read.Label] = read;
				}
			}
		}
	}
}