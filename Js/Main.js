'use strict';

const pixiApp = { 
	app: new PIXI.Application(baseDimensions),
	loader: PIXI.loader
};

const utage = new UtageInfo();
const shaders = new Shaders();
const textFunc = new TextFunctions();
let audio = undefined; //Cant create a audio context without user input.
const player = new Player(pixiApp, utage, textFunc, audio, shaders);
const languages = ["eng", "jpn", "rus"];
const version = "YameteTomete XDUPlayer V1.3.0";
let bodyLoaded = false;
let utageLoaded = false;
let languagesLoaded = false;
let selectedLang = "eng";
let currentScene = {};
let currentSceneId = "";
let scenePlaylist = [];
let currentPart = "";
let partPlaylist = [];
let urlParams = {};
let screenw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
let screenh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
let screenSizeTimeout = undefined;
let isMuted = false;
let volume = 0.5;
let fullScreen = false;
let prevScene = '{Select}';
let prevQuest = '{Select}';

const emoji = {
	LoudSound: String.fromCodePoint(0x1f50a),
	Mute: String.fromCodePoint(0x1f507),
	HeavyPlusSign: String.fromCodePoint(0x2795)
};

function onBodyLoaded() {
	bodyLoaded = true;
	document.getElementById("title-tag").innerText = version;
	document.addEventListener('webkitfullscreenchange', onFullScreenChange, false);
	document.addEventListener('mozfullscreenchange', onFullScreenChange, false);
	document.addEventListener('fullscreenchange', onFullScreenChange, false);
	document.addEventListener('MSFullscreenChange', onFullScreenChange, false);
}

(function startLoad() {
	let promises = [
		utage.loadUtageSettings()
	];

	Promise.all(promises)
	.then((success) => {
		utageLoaded = true;
	}, (failure) => {
		console.log(failure);
	});
})();

(function checkIsLoaded() {
	if(bodyLoaded) {
		document.getElementById('loading-font').style.cssText = "display: none;";
		checkQueryParameters();
		loadLocalStorage();
	}
	if(utageLoaded && languagesLoaded) {
		document.getElementById('loading-utage').style.cssText = "display: none;";
	}
	if(bodyLoaded && utageLoaded && languagesLoaded) {
		document.getElementById('loading-container').style.cssText = "opacity: 0;";
		onAllLoaded();
	} else {
		setTimeout(checkIsLoaded, 200);
	}
})();

function onAllLoaded(success) {
	textFunc.findTextElements();
	buildQuestSelectList();
	buildSceneSelectList();
	buildLanguageList();
	let appContainer = document.getElementById('app-container');
	appContainer.appendChild(pixiApp.app.view);
	setTimeout(() => {
		document.getElementById('parent-container').style.cssText = "opacity: 1;";
		onWindowResize();
		window.addEventListener("resize", onWindowResize);
		checkQueryParameters();
	}, 0);
}

function loadLocalStorage() {
	try {
		//audio
		volume = localStorage.getItem('volume') || 0.5;
		volume = Number(volume);
		document.getElementById('volume-range').value = volume * 100;
		isMuted = localStorage.getItem('ismuted') || false;
		if(isMuted === "false") { isMuted = false; }
		else if(isMuted === "true") { isMuted = true; }
		if(audio) {
			audio.changeVolume(volume);
			audio.mute(isMuted);
		}
		if(isMuted) {
			document.getElementById('mute-button').innerText = emoji.Mute;
		} else {
			document.getElementById('mute-button').innerText = emoji.LoudSound;
		}
		//language
		let lang = urlParams['lang'] || localStorage.getItem('language') || "eng";
		if(languages.includes(lang)) {
			selectedLang = lang;
		}
		document.getElementById('text-container').className = selectedLang;
		utage.setTranslationLanguage(selectedLang, '')
		.then((success) => {
			languagesLoaded = true;
		}, (failure) => {
			languagesLoaded = true;
			console.log(failure);
		});
	} catch(error) {
		console.log(error);
	}
}

function buildQuestSelectList() {
	let questBox = document.getElementById('select-quest');
	questBox.innerHTML = '';
	for (let i = -1; i < utage.questList.length; ++i) {
		let opt = document.createElement('option')
		if (i === -1) {
			opt.setAttribute('value', '{Select}');
			opt.innerText = 'Select Event';
		} else {
			let q = utage.questList[i];
			let cust = q.IsCustom ? 'Custom' : 'Stock';
			let name = q.Name;
			let tl_key = utage.questTranslations[cust][q.QuestMstId];
			if (!tl_key) {
				console.log("Failed to build quest list: missing translations");
				return;
			}
			if (!tl_key.Enabled && !utage.quests[cust][q.QuestMstId].Scenes.some((s) => { return utage.sceneTranslations[cust][s].Enabled === true })) {
				continue;
			}
			name = tl_key.Name || name;
			opt.setAttribute('value', `${cust}|${q.QuestMstId}`);
			opt.innerText = name;
		}
		questBox.appendChild(opt);
	}
}

function buildSceneSelectList() {
	let sceneBox = document.getElementById('select-scene');
	let questBox = document.getElementById('select-quest');
	sceneBox.innerHTML = '';

	let opt = document.createElement('option');
	opt.setAttribute('value', '{Select}');
	opt.innerText = "Select Scene";

	if (questBox.value === '{Select}') {
		sceneBox.appendChild(opt);
		sceneBox.setAttribute("disabled", "true");
		return;
	} else {
		sceneBox.removeAttribute("disabled");
	}

	let cust = questBox.value.split("|")[0];
	let questMstId = questBox.value.split("|")[1];

	for (let i = -2; i < utage.quests[cust][questMstId].Scenes.length; ++i) {
		let opt = document.createElement('option');
		if (i === -2) {
			opt.setAttribute('value', '{Select}');
			opt.innerText = 'Select Scene';
		} else if (i === -1) {
			opt.setAttribute('value', '{All}');
			opt.innerText = 'Play All';
		} else {
			let questSceneMstId = utage.quests[cust][questMstId].Scenes[i];
			let s = utage.scenes[cust][questSceneMstId];
			opt.setAttribute('value', `${cust}|${questSceneMstId}`);
			let name = s.Name;
			let tl_key = utage.sceneTranslations[cust][questSceneMstId];
			if (!tl_key) {
				console.log("Failed to build scene list: missing translations");
				return;
			}
			if (!tl_key.Enabled) {
				continue;
			}
			name = tl_key.Name || name;
			opt.innerText = name;
		}
		sceneBox.appendChild(opt);
	}
}

function buildLanguageList() {
	let selectBox = document.getElementById('select-language');
	selectBox.innerHTML = '';
	for(let i = 0; i < languages.length; ++i) {
		let opt = document.createElement('option');
		opt.setAttribute('value', languages[i]);
		opt.innerText = languages[i];
		selectBox.appendChild(opt);
	}
	selectBox.value = selectedLang;
}

function checkQueryParameters() {
	urlParams = commonFunctions.readQueryParameters();
	let cust;
	if (urlParams['custom'] && urlParams['custom'] === "1") {
		cust = 'Custom';
	} else {
		cust = 'Stock';
	}
	let playable = (urlParams['questSceneMstId'] &&
	                utage.scenes[cust][urlParams['questSceneMstId']] &&
	                utage.sceneTranslations[cust][urlParams['questSceneMstId']] &&
	                utage.sceneTranslations[cust][urlParams['questSceneMstId']].Enabled);
	if(playable) {
		document.getElementById('play-from-query').style.cssText = "position: fixed; z-index: 15; text-align: center; top: 50%; left: 50%; display: block;";
	}
}

function playFromQuery(event) {
	let cust;
	if (urlParams['custom'] && urlParams['custom'] === "1") {
		cust = 'Custom';
	} else {
		cust = 'Stock';
	}
	sceneSet(urlParams['questSceneMstId'], cust);
	document.getElementById('play-from-query').style.cssText = "display: none;";
}

function questDropDownChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value) { return; }
	buildSceneSelectList();
}

function sceneDropDownChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value || event.currentTarget.value === '{Select}') { return; }

	if (event.currentTarget.value === '{All}') {
		let quest = document.getElementById("select-quest");
		let cust = quest.value.split("|")[0];
		let questMstId = quest.value.split("|")[1];
		let scene = utage.quests[cust][questMstId].Scenes;
		resetPlaylist();
		for (const s of scene) {
			utage.scenes[cust][s]['QuestSceneMstId'] = s;
			scenePlaylist.push(utage.scenes[cust][s]);
		}
		playNext();
		return;
	}

	let cont = document.getElementById("modal-container");

	let cust = event.currentTarget.value.split("|")[0];
	let questSceneMstId = event.currentTarget.value.split("|")[1];

	let scene = utage.scenes[cust][questSceneMstId];
	if(!scene) { console.log(`Scene ${questSceneMstId} not found`); return; }

	let name = scene.Name;
	let summary = scene.SummaryText;
	let credits = "";
	let tl_key = utage.sceneTranslations[cust][questSceneMstId];

	if(tl_key) {
		name = tl_key.Name || name;
		summary = tl_key.SummaryText || summary;
		credits = tl_key.Credits || credits;
	}
	if(!credits) {
		if(selectedLang === "eng") {
			credits = "YameteTomete";
		} else {
			credits = "None";
		}
	}

	let chapterSelect = '<div><span>Chapter Select:</span><select id="ChapterSelect">';
	chapterSelect += `<option value="{All}">Play All</option>`
	for (const p of scene.Parts) {
			chapterSelect += `<option value="${p}">${p}</option>`
	}

	let detailSrc = `${utage.rootDirectory}${(scene.IsCustom ? "CustomData" : "XDUData")}/Asset/Image/Quest/Snap/Detail/${questSceneMstId}.png`;
	let iconSrc = `${utage.rootDirectory}${(scene.IsCustom ? "CustomData" : "XDUData")}/Asset/Image/Quest/Snap/Icon/${questSceneMstId}.png`;
	chapterSelect += '</select></div>';
	cont.innerHTML = `
	<div id="mission-modal" class="modal">
		<span class="mission-title">${name || 'none'}</span>
		<img id="mission-detail" src="${detailSrc}"/>
		<img id="mission-icon" src="${iconSrc}"/>
		<div id="mission-summary">Summary: ${summary || 'none'}</div>
		<div class="flex-grow"></div>
		<div>Credits (${selectedLang}): ${credits}</div>
		<div id="mission-ids">
			${chapterSelect}
		</div>
		<div id="modal-buttons">
			<button onclick="closeMissionModal(event, false)">Close</button>
			<span>MstId: ${questSceneMstId}</span>
			<button onclick="sceneSet('${questSceneMstId}', '${cust}')">Play</button>
		</div>
	</div>`;
	document.getElementById("click-catcher").style.cssText = 'display: flex;';
	cont.style.cssText = 'display: flex;';
}

function closeMissionModal(event, wasStarted) {
	if(!wasStarted) {
		document.getElementById('select-scene').value = prevScene;
		document.getElementById('select-quest').value = prevQuest;
	} else {
		prevScene = document.getElementById('select-scene').value;
		prevQuest = document.getElementById('select-quest').value;
	}
	if (prevScene === '{Select}') {
		document.getElementById('select-scene').setAttribute("disabled", "true");
	} else {
		document.getElementById('select-scene').removeAttribute("disabled");
	}

	closeModal(event);
}

function closeModal(event) {
	let cont = document.getElementById("modal-container");
	document.getElementById("click-catcher").style.cssText = 'display: none;';
	cont.style.cssText = 'display: none;';
	cont.innerHTML = '';
}

function sceneSet(questSceneMstId, cust) {
	resetPlaylist();
	let part = document.getElementById('ChapterSelect').value;
	utage.scenes[cust][questSceneMstId]['QuestSceneMstId'] = questSceneMstId;
	if (part === '{All}') {
		scenePlaylist.push(utage.scenes[cust][questSceneMstId]);
	} else {
		partPlaylist.push(part);
		currentScene = utage.scenes[cust][questSceneMstId];
	}

	playNext();
}

function playNext() {

	if (!partPlaylist.length) {
		if (!scenePlaylist.length) {
			resetPlaylist();
			return; // we're probably done
		}
		currentScene = scenePlaylist.shift();
		partPlaylist = currentScene.Parts.slice();
	}

	partChanged(partPlaylist.shift());
}

function partChanged(part) {

	let cust = currentScene.IsCustom ? 'Custom' : 'Stock';
	let name = currentScene.Name;
	let tl_key = utage.sceneTranslations[cust][currentScene.QuestSceneMstId];

	if(tl_key) {
		name = tl_key.Name || name;
	}

	if(!audio) {
		audio = new audioController(utage);
		audio.changeVolume(volume);
		audio.mute(isMuted);
		player.audio = audio;
	}

	player.resetAll()
	.then((success) => {
		if (scenePlaylist.length || partPlaylist.length) {
			document.getElementById("skip-button").style.cssText = "display: inline-block;";
		} else {
			document.getElementById("skip-button").style.cssText = "display: none;";
		}
		let promises = [];
		if(currentScene.IsCustom) {
			promises.push(utage.parseMissionFile(`${utage.rootDirectory}CustomData/Utage/${currentScene.Folder}/Scenario/${part}_t.tsv`));
			promises.push(utage.loadMissionTranslation(`${utage.rootDirectory}Js/Translations/MissionsCustom/${currentScene.Folder}/${part}_translations_${selectedLang}.json`));
		} else {
			promises.push(utage.parseMissionFile(`${utage.rootDirectory}XDUData/Utage/${currentScene.Folder}/Scenario/${part}_t.tsv`));
			promises.push(utage.loadMissionTranslation(`${utage.rootDirectory}Js/Translations/Missions/${currentScene.Folder}/${part}_translations_${selectedLang}.json`));
		}
		closeMissionModal(undefined, true);
		Promise.all(promises)
		.then((success) => {
			document.getElementById("playing-title").innerText = `${name} (${part})`;
			document.getElementById("title-tag").innerText = name;
			currentPart = part;
			player.playFile()
			.then((success) => {
				playNext();
			}, (failure) => {
				player.resetAll();
				resetPlaylist();
				console.log(failure);
			});
		}, (failure) => {
			resetPlaylist();
			console.log(failure);
		});
	}, (failure) => {
		console.log(failure);
	});
}

function languageChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value || event.currentTarget.value === '{Select}' || !languages.includes(event.currentTarget.value)) { return; }
	selectedLang = event.currentTarget.value;
	let missionPath = '';
	if(currentPart) {
		if (currentScene.IsCustom) {
			missionPath = `${utage.rootDirectory}Js/Translations/CustomMissions/${currentScene.Folder}/${currentPart}_translations_${selectedLang}.json`;
		} else {
			missionPath = `${utage.rootDirectory}Js/Translations/Missions/${currentScene.Folder}/${currentPart}_translations_${selectedLang}.json`;
		}
	}
	utage.setTranslationLanguage(selectedLang, missionPath)
	.then((success) => {
		document.getElementById('text-container').className = selectedLang;
		buildQuestSelectList();
		buildSceneSelectList();
		localStorage.setItem('language', selectedLang);
	});
}

function resetPlaylist() {
	currentScene = {};
	scenePlaylist = [];
	currentPart = "";
	partPlaylist = [];
	document.getElementById("skip-button").style.cssText = "display: inline-block;";
	document.getElementById("playing-title").innerText = 'None';
	document.getElementById("title-tag").innerText = version;
	document.getElementById("select-quest").value = '{Select}';
	buildSceneSelectList();
}

function onMainClick(event) {
	player.onMainClick(event);
}

function hideUiClicked(event) {
	player.hideUiClicked(event);
}

function skipClicked(event) {
	if(player.uiHidden) {
		player.hideUiClicked(event);
	} else if(player.runEvent) {
		event.preventDefault();
		event.stopPropagation();
		playNext();
	}
}

function dialogScrollUp(event) {
	event.preventDefault();
	event.stopPropagation();
	textFunc.scrollTextUp();
}

function dialogScrollDown(event) {
	event.preventDefault();
	event.stopPropagation();
	textFunc.scrollTextDown();
}

function onBodyKey(event) {
	if(event.code.toLowerCase() === "arrowdown") {
		dialogScrollDown(event)
	} else if(event.code.toLowerCase() === "arrowup") {
		dialogScrollUp(event);
	} else if(event.code.toLowerCase() === "space") {
		event.preventDefault();
		event.stopPropagation();
		player.onMainClick(event);
	}
}

function openHelpModal(event) {
	let cont = document.getElementById("modal-container");
	cont.innerHTML = `
	<div id="mission-modal" class="modal">
		<span class="mission-title">${version}</span>
		<div>
			<div style="margin: 5px;">Browser Support:<br/>
			Chromium: 57+, May work earlier with no audio<br/>
			Firefox: 52+, 57+ recommended<br/>
			Edge: 17+, older may not have audio<br/>
			Safari: 11+, no audio<br/>
			IE: Never
			</div>
			<div style="margin: 5px;">Mobile:<br/>
			Android: 5+, Updated Chrome/Firefox/Edge<br/>
			iOS: 11+, no audio<br/>
			</div>
		</div>
		<table style="text-align: center; width: 100%; table-layout: fixed; margin-top: auto">
			<tr><th colspan="2">Follow YameteTomete</th></tr>
			<tr>
				<td><a style="margin-top: auto; text-align: center; "href="https://discord.gg/fpQZQ8g" target="_blank" >Discord</a></td>
				<td><a style="margin-top: auto; text-align: center; "href="https://twitter.com/YameteTomete" target="_blank">Twitter</a></td>
			</tr>
		</table>
		<div style="margin-top: auto; text-align: center;">All Symphogear content belongs to its respective owners</div>
		<div id="modal-buttons">
			<button onclick="closeModal(event)">Close</button>
			<a href="https://git.poweris.moe/xduplayer.git/" target="_blank">Source</a>
		</div>
	</div>`;
	document.getElementById("click-catcher").style.cssText = 'display: flex;';
	cont.style.cssText = 'display: flex;';
}

function toggleMute(event) {
	isMuted = !isMuted;
	if(audio) {
		audio.mute(isMuted);
	}
	localStorage.setItem('ismuted', isMuted);
	if(isMuted) {
		document.getElementById('mute-button').innerText = emoji.Mute;
	} else {
		document.getElementById('mute-button').innerText = emoji.LoudSound;
	}
}

function onVolumeChange(event) {
	volume = Number(event.currentTarget.value) / 100;
	if(audio) {
		audio.changeVolume(volume);
	}
	localStorage.setItem('volume', volume);
}

function toggleFullscreen(event) {
	event.preventDefault();
	event.stopPropagation();
	fullScreen = !fullScreen;
	let docEl = document.documentElement;
	if(fullScreen) {
		let requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
		if(requestFullScreen && !document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
			requestFullScreen.call(docEl);
		}
	} else {
		let cancelFullScreen = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
		if(cancelFullScreen) {
			cancelFullScreen.call(document);
		}
	}
}

function onFullScreenChange(event) {
	if(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
		fullScreen = true;
		document.getElementById('other-controls-container').style.cssText = "display: none;";
		document.getElementById('title-container').style.cssText = "display: none;";
		document.getElementById('fullscreen-button').innerText = "✖️";
	} else {
		document.getElementById('other-controls-container').style.cssText = "";
		document.getElementById('title-container').style.cssText = "";
		document.getElementById('fullscreen-button').innerText = emoji.HeavyPlusSign;
	}
	onWindowResize(event, 0);
}

function onWindowResize(event, delay = 400) {
	if(screenSizeTimeout) {
		clearTimeout(screenSizeTimeout);
		screenSizeTimeout = undefined;
	}
	screenw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	screenh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	let topContainerHeight = document.getElementById('other-controls-container').offsetHeight;
	topContainerHeight += document.getElementById('title-container').offsetHeight;
	let res = commonFunctions.getNewResolution(baseDimensions, screenw, screenh, (topContainerHeight ? topContainerHeight + 6 : topContainerHeight));
	screenSizeTimeout = setTimeout(() => {
		player.updateResolution(res);
		document.getElementById('app-container').style.cssText = `width: ${res.width}px; height: ${res.height}px;`;
	}, delay);
}
