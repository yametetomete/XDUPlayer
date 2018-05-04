'use strict';

const pixiApp = { 
	app: new PIXI.Application(baseDimensions),
	loader: PIXI.loader
};

const utage = new UtageInfo();
const textFunc = new TextFunctions();
let audio = undefined; //Cant create a audio context without user input.
const player = new Player(pixiApp, utage, textFunc, audio);
const languages = ["eng", "jpn"];
let bodyLoaded = false;
let utageLoaded = false;
let selectedLang = "eng";
let currentMission = undefined;
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
	if(utageLoaded) {
		document.getElementById('loading-utage').style.cssText = "display: none;";
	}
	if(bodyLoaded && utageLoaded) {
		document.getElementById('loading-container').style.cssText = "opacity: 0;";
		onAllLoaded();
	} else {
		setTimeout(checkIsLoaded, 300);
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
	}, 0);
}

function loadLocalStorage() {
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
			if(!m.includes('101000111') && !m.includes('MA3.5-')) {
				continue;
			}
			opt.setAttribute('value', m);
			opt.innerText = m.replace('|', ' - ');
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

function missionDropDownChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value || event.currentTarget.value === '{Select}') { return; }
	let cont = document.getElementById("modal-container");
	let misId = event.currentTarget.value.split('|')[0];
	let mis = utage.availableMissions[misId];
	if(!mis) { console.log(`Mission ${misId} not found`); return; }
	cont.innerHTML = '' +
	'<div id="mission-modal" class="modal">' +
		`<span class="mission-title">Name: ${mis.Name || 'none'}</span>` +
		`<img id="mission-detail" src="${rootUrl}XDUPlayer/XDUData/Asset/Image/Quest/Snap/Detail/${mis.MstId}.png">` +
		`<img id="mission-icon" src="${rootUrl}XDUPlayer/XDUData/Asset/Image/Quest/Snap/Icon/${mis.MstId}.png">` +
		`<span>Summary: ${mis.SummaryText || 'none'}</span>` +
		'<div id="mission-ids">' +
			`<span>MstId: ${mis.MstId}</span>` +
			`<span>Id: ${mis.Id}</span>` +
		'</div>' +
		'<div id="modal-buttons">' +
			'<button onclick="closeMissionModal(event, false)">Close</button>' +
			`<button onclick="missionChanged(${misId})">Play</button>` +
		'</div>' +
	'</div>';
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

function missionChanged(value) {
	if(!audio) {
		audio = new audioController(utage);
		audio.changeVolume(volume);
		audio.mute(isMuted);
		player.audio = audio;
	}
	player.resetAll()
	.then((success) => {
		let newMission = utage.availableMissions[value];
		currentMission = newMission;
		let promises = [
			utage.parseMissionFile(`${utage.rootDirectory}XDUData/${newMission.Path.replace('Asset/', '').replace('.utage', '').replace('.tsv', '_t.tsv')}`),
			utage.loadMissionTranslation(`${utage.rootDirectory}XDUData/${newMission.Path.replace('Asset/', '').replace('.utage', '').replace('.tsv', `_translations_${selectedLang}.json`)}`, selectedLang)
		];
		closeMissionModal(undefined, true);
		
		Promise.all(promises)
		.then((success) => {
			let res = player.playFile()
			.then((success) => {
				player.resetAll();
				currentMission = undefined;
				debugger;
			}, (failure) => {
				debugger;
				currentMission = undefined;
				console.log(failure);
			});
		}, (failure) => {
			currentMission = undefined;
			console.log(failure);
		});
	}, (failure) => {
		console.log(failure);
	});
}

function languageChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value || event.currentTarget.value === '{Select}' || !languages.includes(event.currentTarget.value)) { return; }
	selectedLang = event.currentTarget.value;
	utage.loadMissionTranslation(`${utage.rootDirectory}XDUData/${currentMission.Path.replace('Asset/', '').replace('.utage', '').replace('.tsv', `_translations_${selectedLang}.json`)}`, selectedLang);
}

function onMainClick(event) {
	player.onMainClick(event);
}

function hideUiClicked(event) {
	player.hideUiClicked(event);
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
		let res = commonFunctions.getNewResolution(baseDimensions, screenw, screenh, topContainerHeight);
		player.updateResolution(res);
		document.getElementById('app-container').style.cssText = `width: ${res.width}px; height: ${res.height}px;`;
	}, 400);
}