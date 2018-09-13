//http://madnesslabo.net/utage/?page_id=4448&lang=en
'use strict';

class UtageInfo {
	constructor() {
		this.currentPlayingFile = [];
		this.rootDirectory = ``;
		this.groupedMissions = {};
		this.missionsList = [];
		this.characterInfo = {};
		this.layerInfo = {};
		this.localizeInfo = {};
		this.paramInfo = {};
		this.soundInfo = {};
		this.textureInfo = {};
		this.currentTranslation = 'eng';
		this.translationsInner = {};
		this.charTranslationsInner = {};
		this.missionTranslationsInner = {};
		this.bgmLoopData = {};
	}
	
	loadUtageSettings() {
		return new Promise((resolve, reject) => { 
			let promises = [
				commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduMissions.json`), //0
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Character.tsv`), //1
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Layer.tsv`), //2
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Localize.tsv`), //3
				//commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Param.tsv`),
				//commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Scenario.tsv`),
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Sound.tsv`), //4
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Texture.tsv`), //5
				commonFunctions.getFileJson(`${this.rootDirectory}Js/BgmLoop.json`), //6
				commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduMissionsCustom.json`), //7
				commonFunctions.getFileText(`${this.rootDirectory}CustomData/Utage/Diva/Settings/CustomCharacter.tsv`), //8
				commonFunctions.getFileText(`${this.rootDirectory}CustomData/Utage/Diva/Settings/CustomSound.tsv`), //9
				commonFunctions.getFileText(`${this.rootDirectory}CustomData/Utage/Diva/Settings/CustomTexture.tsv`), //10
			];
			Promise.all(promises)
			.then((success) => {
				this.groupMissions(success[0], success[7]);
				this.missionsList = Object.keys(this.groupedMissions).map((k) => {
					return {Name: this.groupedMissions[k].Name, MstId: this.groupedMissions[k].MstId};
				});
				this.missionsList.sort();
				this.parseCharacterInfo(success[1]);
				this.parseLayerInfo(success[2]);
				this.parseLocalizeInfo(success[3]);
				//this.parseParamInfo(success[4]);
				this.parseSoundInfo(success[4]);
				this.parseTextureInfo(success[5]);
				this.bgmLoopData = success[6];
				this.parseCharacterInfo(success[8], true);
				this.parseSoundInfo(success[9], true);
				this.parseTextureInfo(success[10], true);
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
				let lines = success.split("\n");
				let headers = [];
				for(let i = 0; i < lines.length; ++i) {
					let line = lines[i];
					if(i === 0) {
						headers = line.trim().split('\t');
					} else {
						let read = commonFunctions.readLine(line, headers);
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
	
		
	groupMissions(missions, customMissions) {
		for(let key of Object.keys(missions)) {
			let mis = missions[key];
			if(!this.groupedMissions[mis.MstId]) {
				this.groupedMissions[mis.MstId] = {
					Name: mis.Name,
					SummaryText: mis.SummaryText,
					MstId: mis.MstId,
					Missions: {}
				}
				this.groupedMissions[mis.MstId].Missions[mis.Id] = { Id: mis.Id, Path: mis.Path, Enabled: mis.Enabled };
			} else {
				this.groupedMissions[mis.MstId].Missions[mis.Id] = { Id: mis.Id, Path: mis.Path, Enabled: mis.Enabled };
			}
		}
		for(let key of Object.keys(customMissions)) {
			let mis = customMissions[key];
			mis.IsCustom = true;
			if(!this.groupedMissions[mis.MstId]) {
				this.groupedMissions[mis.MstId] = {
					IsCustom: true,
					Name: mis.Name,
					SummaryText: mis.SummaryText,
					MstId: mis.MstId,
					Missions: {}
				}
				this.groupedMissions[mis.MstId].Missions[mis.Id] = { Id: mis.Id, Path: mis.Path, Enabled: mis.Enabled, IsCustom: true };
			} else {
				this.groupedMissions[mis.MstId].Missions[mis.Id] = { Id: mis.Id, Path: mis.Path, Enabled: mis.Enabled, IsCustom: true };
			}
		}
	}
	
	get translations() {
		return this.translationsInner[this.currentTranslation];
	}
	
	get charTranslations() {
		return this.charTranslationsInner[this.currentTranslation];
	}
	
	get missionTranslations() {
		return this.missionTranslationsInner[this.currentTranslation];
	}
	
	setTranslationLanguage(key, missionPath) {
		return new Promise((resolve, reject) => {
			this.currentTranslation = key;
			let promises = [this.loadCharacterTranslations(key),
			this.loadMissionNamesTranslations(key)];
			if(missionPath) {
				promises.push(this.loadMissionTranslation(missionPath, key));
			}
			Promise.all(promises)
			.then((success) => {
				resolve();
			}, (failure) => {
				console.log(failure);
				resolve();
			});
		});
	}
	
	loadMissionTranslation(file) {
		return new Promise((resolve, reject) => {
			if(this.translationsInner[this.currentTranslation]) {
				resolve();
			} else {
				commonFunctions.getFileJson(file)
				.then((success) => {
					this.translationsInner[this.currentTranslation] = success;
					resolve();
				}, (failure) => {
					console.log(failure);
					resolve();
				});
			}
		});
	}
	
	loadCharacterTranslations() {
		return new Promise((resolve, reject) => {
			if(this.charTranslationsInner[this.currentTranslation]) {
				resolve();
			} else {
				commonFunctions.getFileJson(`${utage.rootDirectory}Js/Translations/nametranslations_${this.currentTranslation}.json`)
				.then((success) => {
					this.charTranslationsInner[this.currentTranslation] = success;
					resolve();
				}, (failure) => {
					console.log(failure);
					resolve();
				});
			}
		});
	}
	
	loadMissionNamesTranslations() {
		return new Promise((resolve, reject) => {
			if(this.missionTranslationsInner[this.currentTranslation]) {
				resolve();
			} else {
				var promises = [
					commonFunctions.getFileJson(`${utage.rootDirectory}Js/Translations/XduMissionsNames_${this.currentTranslation}.json`),
					commonFunctions.getFileJson(`${utage.rootDirectory}Js/Translations/XduMissionsNamesCustom_${this.currentTranslation}.json`)
				];
				Promise.all(promises)
				.then((success) => {
					for(let m of Object.keys(success[1])) {
						success[0][m] = success[1][m];
					}
					this.missionTranslationsInner[this.currentTranslation] = success[0];
					resolve();
				}, (failure) => {
					console.log(failure);
					resolve();
				});
			}
		});
	}
	
	//http://madnesslabo.net/utage/?page_id=4521&lang=en
	parseCharacterInfo(text, custom = false) {
		let lines = text.split("\n");
		let headers = [];
		let lastCharName = '';
		let lastNameText = '';
		for(let i = 0; i < lines.length; ++i) {
			let line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				let read = commonFunctions.readLine(line, headers);
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
					if(read.FileName) {
						if(!read.FileName.startsWith('file://')) {
							read.FileName = `${this.rootDirectory}${(custom ? "CustomData" : "XDUData")}/Sample/Texture/Character/${read.FileName}`;
						} else {
							read.FileName = read.FileName.replace('file://', '');
							read.FileName = `${this.rootDirectory}${(custom ? "CustomData" : "XDUData")}/${read.FileName}`;
						}
					}
					if(!this.characterInfo[lastCharName]) {
						this.characterInfo[lastCharName] = {};
					}
					this.characterInfo[lastCharName][read.Pattern || "none"] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4518&lang=en
	parseLayerInfo(text) {
		let lines = text.split("\n");
		let headers = [];
		for(let i = 0; i < lines.length; ++i) {
			let line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				let read = commonFunctions.readLine(line, headers);
				if(read && read.LayerName) {
					this.layerInfo[read.LayerName] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4514&lang=en
	parseLocalizeInfo(text) {
		let lines = text.split("\n");
		let headers = [];
		for(let i = 0; i < lines.length; ++i) {
			let line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				let read = commonFunctions.readLine(line, headers);
				if(read && read.Key) {
					this.localizeInfo[read.Key] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4517&lang=en
	parseParamInfo(text) {
		let lines = text.split("\n");
		let headers = [];
		for(let i = 0; i < lines.length; ++i) {
			let line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				let read = commonFunctions.readLine(line, headers);
				if(read && read.Label) {
					this.paramInfo[read.Label] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4519&lang=en
	parseSoundInfo(text, custom = false) {
		let lines = text.split("\n");
		let headers = [];
		for(let i = 0; i < lines.length; ++i) {
			let line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				let read = commonFunctions.readLine(line, headers);
				if(read && read.Label) {
					if(read.FileName && read.Type) {
						read.origFileName = read.FileName;
						if(!read.FileName.includes('.')) {
							read.FileName = `${read.FileName}.opus`;
						}
						switch(read.Type.toLowerCase()) {
							case 'se':
								if(read.FileName.includes(',')) {
									let s = read.FileName.split(',');
									read.FileName = `${s[0].split('_').join('/')}/${s[1]}`;
								}
								read.FileName = `${this.rootDirectory}${(custom ? "CustomData" : "XDUData")}/Se/${read.FileName}`;
								break;
							case 'bgm':
								read.FileName = `${this.rootDirectory}${(custom ? "CustomData" : "XDUData")}/Bgm/${read.FileName}`;
								break;
						}
					}
					this.soundInfo[read.Label] = read;
				}
			}
		}
	}
	
	//http://madnesslabo.net/utage/?page_id=4520&lang=en
	parseTextureInfo(text, custom = false) {
		let lines = text.split("\n");
		let headers = [];
		for(let i = 0; i < lines.length; ++i) {
			let line = lines[i];
			if(i === 0) {
				headers = line.split('\t');
			} else {
				let read = commonFunctions.readLine(line, headers);
				if(read && read.Label) {
					if(!read.FileName.startsWith("file://")) {
						read.FileName = `${this.rootDirectory}${(custom ? "CustomData" : "XDUData")}/Sample/Texture/BG/${read.FileName}`;
					} else {
						read.FileName = read.FileName.replace("file://", '');
						read.FileName = `${this.rootDirectory}${(custom ? "CustomData" : "XDUData")}/${read.FileName}`;
					}
					this.textureInfo[read.Label] = read;
				}
			}
		}
	}
	
	resetTranslations() {
		this.translationsInner = {};
	}
}