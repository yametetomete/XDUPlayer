//http://madnesslabo.net/utage/?page_id=4448&lang=en
'use strict';

class UtageInfo {
	constructor() {
		this.currentPlayingFile = [];
		this.rootDirectory = ``;
		this.groupedMissions = {};
		this.quests = {};
		this.questList = [];
		this.scenes = {};
		this.characterInfo = {};
		this.layerInfo = {};
		this.localizeInfo = {};
		this.paramInfo = {};
		this.soundInfo = {};
		this.textureInfo = {};
		this.currentTranslation = 'eng';
		this.translationsInner = {};
		this.charTranslationsInner = {};
		this.questTranslationsInner = {};
		this.sceneTranslationsInner = {};
		this.bgmLoopData = {};
		this.macros = {};
	}
	
	loadUtageSettings() {
		return new Promise((resolve, reject) => { 
			let promises = [
				commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduQuest.json`), //0
				commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduScene.json`), //1
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Character.tsv`), //2
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Layer.tsv`), //3
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Localize.tsv`), //4
				//commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Param.tsv`),
				//commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Scenario.tsv`),
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Sound.tsv`), //5
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Settings/Texture.tsv`), //6
				commonFunctions.getFileJson(`${this.rootDirectory}Js/BgmLoop.json`), //7
				commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduQuestCustom.json`), //8
				commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduSceneCustom.json`), //9
				commonFunctions.getFileText(`${this.rootDirectory}CustomData/Utage/Diva/Settings/CustomCharacter.tsv`), //10
				commonFunctions.getFileText(`${this.rootDirectory}CustomData/Utage/Diva/Settings/CustomSound.tsv`), //11
				commonFunctions.getFileText(`${this.rootDirectory}CustomData/Utage/Diva/Settings/CustomTexture.tsv`), //12
				commonFunctions.getFileText(`${this.rootDirectory}XDUData/Utage/Diva/Scenario/Macro.tsv`), //13
				commonFunctions.getFileText(`${this.rootDirectory}CustomData/Utage/Diva/Settings/CustomMacro.tsv`), //14
			];
			Promise.all(promises)
			.then((success) => {
				this.quests[CUSTOM.stock] = success[0];
				this.questList = Object.keys(this.quests[CUSTOM.stock]).map((k) => {
					return {QuestMstId: k, Name: this.quests[CUSTOM.stock][k].Name, IsCustom: false};
				});
				this.quests[CUSTOM.custom] = success[8];
				for (const k of Object.keys(this.quests[CUSTOM.custom])) {
					this.questList.push({QuestMstId: k, Name: this.quests[CUSTOM.custom][k].Name, IsCustom: true});
				}
				this.questList.sort((a, b) => { return a.QuestMstId - b.QuestMstId });
				this.scenes[CUSTOM.stock] = success[1];
				for (const k of Object.keys(this.scenes[CUSTOM.stock])) {
					this.scenes[CUSTOM.stock][k]['IsCustom'] = false;
				}
				this.parseCharacterInfo(success[2]);
				this.parseLayerInfo(success[3]);
				this.parseLocalizeInfo(success[4]);
				//this.parseParamInfo(success[4]);
				this.parseSoundInfo(success[5]);
				this.parseTextureInfo(success[6]);
				this.bgmLoopData = success[7];
				this.scenes[CUSTOM.custom] = success[9];
				for (const k of Object.keys(this.scenes[CUSTOM.custom])) {
					this.scenes[CUSTOM.custom][k]['IsCustom'] = true;
				}
				this.parseCharacterInfo(success[10], true);
				this.parseSoundInfo(success[11], true);
				this.parseTextureInfo(success[12], true);
				this.parseMacroFile(success[13]);
				this.parseMacroFile(success[14]);
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

	get translations() {
		return this.translationsInner[this.currentTranslation];
	}
	
	get charTranslations() {
		return this.charTranslationsInner[this.currentTranslation];
	}
	
	get questTranslations() {
		return this.questTranslationsInner[this.currentTranslation];
	}

	get sceneTranslations() {
		return this.sceneTranslationsInner[this.currentTranslation];
	}
	
	setTranslationLanguage(key, missionPath) {
		return new Promise((resolve, reject) => {
			this.currentTranslation = key;
			let promises = [this.loadCharacterTranslations(key),
			this.loadQuestNamesTranslations(key),
			this.loadSceneNamesTranslations(key)];
			if(missionPath) {
				promises.push(this.loadMissionTranslation(missionPath, key));
			}
			Promise.all(promises)
			.then((success) => {
				// propagate language-based enables downwards from quests to scenes
				for (const c of [CUSTOM.custom, CUSTOM.stock]) {
					for (const k of Object.keys(this.questTranslationsInner[this.currentTranslation][c])) {
						if (this.questTranslationsInner[this.currentTranslation][c][k].Enabled) {
							for (const s of this.quests[c][k].Scenes) {
								this.sceneTranslationsInner[this.currentTranslation][c][s].Enabled = true;
							}
						}
					}
				}
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
				commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/nametranslations_${this.currentTranslation}.json`)
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
	
	loadQuestNamesTranslations() {
		return new Promise((resolve, reject) => {
			if(this.questTranslationsInner[this.currentTranslation]) {
				resolve();
			} else {
				var promises = [
					commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduQuestNames_${this.currentTranslation}.json`),
					commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduQuestNamesCustom_${this.currentTranslation}.json`)
				];
				Promise.all(promises)
				.then((success) => {
					this.questTranslationsInner[this.currentTranslation] = {};
					this.questTranslationsInner[this.currentTranslation][CUSTOM.stock] = success[0];
					this.questTranslationsInner[this.currentTranslation][CUSTOM.custom] = success[1];
					resolve();
				}, (failure) => {
					console.log(failure);
					resolve();
				});
			}
		});
	}

	loadSceneNamesTranslations() {
		return new Promise((resolve, reject) => {
			if(this.sceneTranslationsInner[this.currentTranslation]) {
				resolve();
			} else {
				var promises = [
					commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduSceneNames_${this.currentTranslation}.json`),
					commonFunctions.getFileJson(`${this.rootDirectory}Js/Translations/XduSceneNamesCustom_${this.currentTranslation}.json`)
				];
				Promise.all(promises)
				.then((success) => {
					this.sceneTranslationsInner[this.currentTranslation] = {};
					this.sceneTranslationsInner[this.currentTranslation][CUSTOM.stock] = success[0];
					this.sceneTranslationsInner[this.currentTranslation][CUSTOM.custom] = success[1];
					resolve();
				}, (failure) => {
					console.log(failure);
					resolve();
				});
			}
		});
	}

	parseMacroFile(file) {
		let lines = file.split('\n');
		let header = lines[0].split('\t');
		let macro = false;
		let name = "";
		for (let i = 1; i < lines.length; ++i) {
			let line = commonFunctions.readLine(lines[i], header);
			if (line && !line.comment) {
				if (macro === false) {
					if (line.Command[0] === '*') {
						name = line.Command.slice(1);
						if (!(name in this.macros)) {
							macro = true;
							this.macros[name] = [];
						}
					}
				} else {
					if (line.Command === "EndMacro") {
						macro = false;
						continue;
					}
					if (!line.Command && !line.Arg1 && !line.Arg2 && !line.Arg3 && !line.Arg4 && !line.Arg5 && !line.Arg6) {
						continue;
					}
					this.macros[name].push(line);
				}
			}
		}
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
