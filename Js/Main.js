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
const version = "YameteTomete XDUPlayer V1.2.2";
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
let fullScreen = false;
let prevMission = '{Select}';

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
		urlParams = commonFunctions.readQueryParameters();
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
			if(!Object.keys(utage.groupedMissions[m.MstId].Missions).some((mis) => { return utage.groupedMissions[m.MstId].Missions[mis].Enabled === true })) {
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
		document.getElementById('play-from-query').style.cssText = "position: fixed; z-index: 15; text-align: center; top: 50%; left: 50%; display: block;";
	}
}

function playFromQuery(event) {
	missionChanged(urlParams['mstid'], urlParams['id']);
	document.getElementById('play-from-query').style.cssText = "display: none;";
}

function missionDropDownChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value || event.currentTarget.value === '{Select}') { return; }
	let cont = document.getElementById("modal-container");
	let misId = event.currentTarget.value;
	let mis = utage.groupedMissions[misId];
	if(!mis) { console.log(`Mission ${misId} not found`); return; }
	let name = mis.Name;
	let summary = mis.SummaryText;
	let credits = "";
	if(utage.missionTranslations[mis.MstId]) {
		name = utage.missionTranslations[mis.MstId].Name || name;
		summary = utage.missionTranslations[mis.MstId].SummaryText || summary;
		credits = utage.missionTranslations[mis.MstId].Credits || credits;
	}
	if(!credits) {
		if(selectedLang === "eng") {
			credits = "YameteTomete";
		} else {
			credits = "None";
		}
	}
	let chapterSelect = '<div><span>Chapter Select:</span><select id="ChapterSelect">';
	for(let k of Object.keys(mis.Missions)) {
		var m = mis.Missions[k];
		if(m.Enabled) {
			chapterSelect += `<option value="${m.Id}">${m.Id}</option>`
		}
	}
	let detailSrc = `${utage.rootDirectory}${(mis.IsCustom ? "CustomData" : "XDUData")}/Asset/Image/Quest/Snap/Detail/${mis.MstId}.png`;
	let iconSrc = `${utage.rootDirectory}${(mis.IsCustom ? "CustomData" : "XDUData")}/Asset/Image/Quest/Snap/Icon/${mis.MstId}.png`;
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
	closeModal(event);
}

function closeModal(event) {
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
		if(!currentMission.Enabled) {
			//Check for the next enabled mission. If there are none just reset.
			for(let i = currentMissionIndex + 1; i < currentMissionList.length; ++i) {
				const mis = mst.Missions[currentMissionList[i]];
				if(mis && mis.Enabled) {
					missionChanged(currentMissionMst, mis.Id);
					return;
				}
			}
			//If we got through the loop there are no more enabled so just end
			resetMissions();
			return;
		}
		let promises = [];
		if(newMission.IsCustom) {
			promises.push(utage.parseMissionFile(`${utage.rootDirectory}CustomData/${newMission.Path.replace('Asset/', '').replace('.utage', '').replace('.tsv', '_t.tsv')}`));
		} else {
			promises.push(utage.parseMissionFile(`${utage.rootDirectory}XDUData/${newMission.Path.replace('Asset/', '').replace('.utage', '').replace('.tsv', '_t.tsv')}`));
		}
		promises.push(utage.loadMissionTranslation(`${utage.rootDirectory}Js/Translations/Missions/${currentMission.Path.replace('Asset/Utage/', '').replace('Scenario/', '').replace('.utage', '').replace('.tsv', `_translations_${selectedLang}.json`)}`))
		closeMissionModal(undefined, true);
		Promise.all(promises)
		.then((success) => {
			document.getElementById("playing-title").innerText = `${name} (${value})`;
			document.getElementById("title-tag").innerText = name;
			player.playFile()
			.then((success) => {
				if(currentMissionIndex !== currentMissionList.length - 1) {
					missionChanged(currentMissionMst, mst.Missions[currentMissionList[currentMissionIndex+1]].Id);
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
	utage.setTranslationLanguage(selectedLang, missionPath)
	.then((success) => {
		document.getElementById('text-container').className = selectedLang;
		buildMissionSelectList();
		localStorage.setItem('language', selectedLang);
	});
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
	document.getElementById("title-tag").innerText = version;
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
		//Find the next enabled mission
		for(let i = currentMissionIndex + 1; i < currentMissionList.length; ++i) {
			const mis = utage.groupedMissions[currentMissionMst].Missions[currentMissionList[i]];
			if(mis && mis.Enabled) {
				//missionChanged(currentMissionMst, utage.groupedMissions[currentMissionMst].Missions[currentMissionList[currentMissionIndex+1]].Id);
				missionChanged(currentMissionMst, mis.Id);
				return;
			}
		}
		//If we got through the loop there are no more enabled so just end
		resetMissions();
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
		<a style="margin-top: auto; text-align: center; "href="https://discord.gg/fpQZQ8g">YameteTomete Discord</a>
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
		document.getElementById('fullscreen-button').innerText = "➕";
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
