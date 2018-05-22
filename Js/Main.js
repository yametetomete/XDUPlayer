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
const languages = ["eng", "jpn"];
let bodyLoaded = false;
let utageLoaded = false;
let languagesLoaded = false;
let selectedLang = "eng";
let currentMission = undefined;
let currentMissionMst = 0;
let currentMissionIndex = 0;
let currentMissionList = [];
let urlParams = {};
let screenw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
let screenh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
let screenSizeTimeout = undefined;
let isMuted = false;
let volume = 0.5;
let prevMission = '{Select}';

function onBodyLoaded() {
	bodyLoaded = true;
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
	buildMissionSelectList();
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
			document.getElementById('mute-button').innerText = "🔇";
		} else {
			document.getElementById('mute-button').innerText = "🔊";
		}
		//language
		let lang = localStorage.getItem('language') || "eng";
		if(languages.includes(lang)) {
			selectedLang = lang;
		}
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

function buildMissionSelectList() {
	let selectBox = document.getElementById('select-mission');
	selectBox.innerHTML = '';
	for(let i = -1; i < utage.missionsList.length; ++i) {
		let opt = document.createElement('option');
		if(i === -1) {
			opt.setAttribute('value', '{Select}');
			opt.innerText = 'Select Mission';
		} else {
			let m = utage.missionsList[i];
			//Only allowing 3.5 right now
			if(!(m.MstId >= 104001 && m.MstId <= 104008)) {
				continue;
			}
			opt.setAttribute('value', m.MstId);
			let name = m.Name;
			if(utage.missionTranslations[m.MstId]) {
				name = utage.missionTranslations[m.MstId].Name || name;
			}
			opt.innerText = name;
		}
		selectBox.appendChild(opt);
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
	if(urlParams['mstid'] && urlParams['id'] && utage.groupedMissions[urlParams['mstid']] && utage.groupedMissions[urlParams['mstid']].Missions[urlParams['id']]) {
		missionChanged(urlParams['mstid'], urlParams['id']);
	}
}

function missionDropDownChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value || event.currentTarget.value === '{Select}') { return; }
	let cont = document.getElementById("modal-container");
	let misId = event.currentTarget.value;
	let mis = utage.groupedMissions[misId];
	if(!mis) { console.log(`Mission ${misId} not found`); return; }
	let name = mis.Name;
	let summary = mis.SummaryText;
	if(utage.missionTranslations[mis.MstId]) {
		name = utage.missionTranslations[mis.MstId].Name || name;
		summary = utage.missionTranslations[mis.MstId].SummaryText || summary;
	}
	let chapterSelect = '<div><span>Chapter Select:</span><select id="ChapterSelect">';
	for(let k of Object.keys(mis.Missions)) {
		var m = mis.Missions[k];
		chapterSelect += `<option value="${m.Id}">${m.Id}</option>`
	}
	chapterSelect += '</select></div>';
	cont.innerHTML = `
	<div id="mission-modal" class="modal">
		<span class="mission-title">${name || 'none'}</span>
		<img id="mission-detail" src="${utage.rootDirectory}XDUData/Asset/Image/Quest/Snap/Detail/${mis.MstId}.png"/>
		<img id="mission-icon" src="${utage.rootDirectory}XDUData/Asset/Image/Quest/Snap/Icon/${mis.MstId}.png"/>
		<span>Summary: ${summary || 'none'}</span>
		<div id="mission-ids">
			${chapterSelect}
		</div>
		<div id="modal-buttons">
			<button onclick="closeMissionModal(event, false)">Close</button>
			<span>MstId: ${mis.MstId}</span>
			<button onclick="missionChanged(${mis.MstId})">Play</button>
		</div>
	</div>`;
	document.getElementById("click-catcher").style.cssText = 'display: flex;';
	cont.style.cssText = 'display: flex;';
}

function closeMissionModal(event, wasStarted) {
	if(!wasStarted) {
		document.getElementById('select-mission').value = prevMission;
	} else {
		prevMission = document.getElementById('select-mission').value;
	}
	let cont = document.getElementById("modal-container");
	document.getElementById("click-catcher").style.cssText = 'display: none;';
	cont.style.cssText = 'display: none;';
	cont.innerHTML = '';
}

function missionChanged(mstId, value) {
	let mst = utage.groupedMissions[mstId];
	let name = mst.Name;
	if(utage.missionTranslations[mstId]) {
		name = utage.missionTranslations[mstId].Name || name;
	}
	if(!value) {
		value = document.getElementById("ChapterSelect").value;
	}
	if(!audio) {
		audio = new audioController(utage);
		audio.changeVolume(volume);
		audio.mute(isMuted);
		player.audio = audio;
	}
	player.resetAll()
	.then((success) => {
		let newMission = mst.Missions[value];
		checkMissionList(mst.Missions, value);
		currentMission = newMission;
		currentMissionMst = mstId;
		let promises = [
			utage.parseMissionFile(`${utage.rootDirectory}XDUData/${newMission.Path.replace('Asset/', '').replace('.utage', '').replace('.tsv', '_t.tsv')}`),
			utage.loadMissionTranslation(`${utage.rootDirectory}Js/Translations/Missions/${currentMission.Path.replace('Asset/Utage/', '').replace('Scenario/', '').replace('.utage', '').replace('.tsv', `_translations_${selectedLang}.json`)}`)
		];
		closeMissionModal(undefined, true);
		Promise.all(promises)
		.then((success) => {
			document.getElementById("playing-title").innerText = `${name} (${value})`;
			player.playFile()
			.then((success) => {
				if(currentMissionIndex !== currentMissionList.length - 1) {
					missionChanged(currentMissionMst, mst.Missions[currentMissionList[currentMissionIndex+1]].Id)
				} else {
					player.resetAll();
					resetMissions();
				}
			}, (failure) => {
				player.resetAll();
				resetMissions();
				console.log(failure);
			});
		}, (failure) => {
			resetMissions();
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
	if(currentMission) {
		missionPath = `${utage.rootDirectory}Js/Translations/Missions/${currentMission.Path.replace('Asset/Utage/', '').replace('Scenario/', '').replace('.utage', '').replace('.tsv', `_translations_${selectedLang}.json`)}`;
	}
	utage.setTranslationLanguage(selectedLang, missionPath);
}

function checkMissionList(missions, currentvalue) {
	currentMissionList = [];
	let i = 0;
	for(var m of Object.keys(missions)) {
		currentMissionList.push(m);
		if(m === currentvalue) {
			currentMissionIndex = i;
		}
		++i;
	}
	if(currentMissionIndex + 1 === currentMissionList.length) {
		document.getElementById("skip-button").style.cssText = "display: none;";
	} else {
		document.getElementById("skip-button").style.cssText = "display: inline-block;";
	}
}

function resetMissions() {
	currentMissionIndex = 0;
	currentMissionList = [];
	currentMission = undefined;
	currentMissionMst = 0;
	document.getElementById("skip-button").style.cssText = "display: inline-block;";
	document.getElementById("playing-title").innerText = 'None';
	document.getElementById('select-mission').value = '{Select}';
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
	} else if(player.runEvent && currentMissionIndex !== currentMissionList.length - 1) {
		event.preventDefault();
		event.stopPropagation();
		missionChanged(currentMissionMst, utage.groupedMissions[currentMissionMst].Missions[currentMissionList[currentMissionIndex+1]].Id);
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

function toggleMute(event) {
	isMuted = !isMuted;
	if(audio) {
		audio.mute(isMuted);
	}
	localStorage.setItem('ismuted', isMuted);
	if(isMuted) {
		document.getElementById('mute-button').innerText = "🔇";
	} else {
		document.getElementById('mute-button').innerText = "🔊";
	}
}

function onVolumeChange(event) {
	volume = Number(event.currentTarget.value) / 100;
	if(audio) {
		audio.changeVolume(volume);
	}
	localStorage.setItem('volume', volume);
}

function onWindowResize(event) {
	if(screenSizeTimeout) {
		clearTimeout(screenSizeTimeout);
		screenSizeTimeout = undefined;
	}
	screenSizeTimeout = setTimeout(() => {
		screenw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
		screenh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		let topContainerHeight = document.getElementById('other-controls-container').offsetHeight + 6;
		topContainerHeight += document.getElementById('title-container').offsetHeight;
		let res = commonFunctions.getNewResolution(baseDimensions, screenw, screenh, topContainerHeight);
		player.updateResolution(res);
		document.getElementById('app-container').style.cssText = `width: ${res.width}px; height: ${res.height}px;`;
	}, 400);
}