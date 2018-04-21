'use strict';

const pixiApp = { 
	app: new PIXI.Application(baseDimensions),
	loader: PIXI.loader
};

const utage = new UtageInfo();
const textFunc = new TextFunctions();
const audio = new audioController(utage);
const player = new Player(pixiApp, utage, textFunc, audio);
const context = new (window.AudioContext || window.webkitAudioContext)();
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
	audio.changeVolume(volume);
	document.getElementById('volume-range').value = volume * 100;
	isMuted = localStorage.getItem('ismuted') || false;
	if(isMuted === "false") { isMuted = false; }
	else if(isMuted === "true") { isMuted = true; }
	audio.mute(isMuted);
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
			//if(m.includes('MA1-') || m.includes('MA2-')|| m.includes('MA3-')) {
			//	continue;
			//}
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

function missionChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value || event.currentTarget.value === '{Select}') { return; }
	
	let newMission = utage.availableMissions[event.currentTarget.value.split('|')[0]];
	currentMission = newMission;
	let promises = [
		utage.parseMissionFile(`${utage.rootDirectory}XDUData/${newMission.Path.replace('Asset/', '').replace('.utage', '').replace('.tsv', '_t.tsv')}`),
		utage.loadMissionTranslation(`${utage.rootDirectory}XDUData/${newMission.Path.replace('Asset/', '').replace('.utage', '').replace('.tsv', `_translations_${selectedLang}.json`)}`, selectedLang),
		player.resetAll()
	];
	
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
	audio.mute(isMuted);
	localStorage.setItem('ismuted', isMuted);
	if(isMuted) {
		document.getElementById('mute-button').innerText = "🔇";
	} else {
		document.getElementById('mute-button').innerText = "🔊";
	}
}

function onVolumeChange(event) {
	let vol = event.currentTarget.value / 100;
	audio.changeVolume(vol);
	localStorage.setItem('volume', vol);
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