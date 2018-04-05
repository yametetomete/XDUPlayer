'use strict';

const pixiApp = { 
	app: new PIXI.Application(baseDimensions),
	loader: PIXI.loader
};
const utage = new UtageInfo();
const textFunc = new TextFunctions();
const player = new Player(pixiApp, utage, textFunc);
const context = new (window.AudioContext || window.webkitAudioContext)();
let bodyLoaded = false;
let utageLoaded = false;
function onBodyLoaded() {
	bodyLoaded = true;
}

(function startLoad() {
	var promises = [
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
	let appContainer = document.getElementById('app-container');
	appContainer.appendChild(pixiApp.app.view);
	//appContainer.style.cssText = `width: ${baseDimensions.width}; height: ${baseDimensions.height};`;
	setTimeout(() => {
		document.getElementById('parent-container').style.cssText = "opacity: 1;";
	});
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
			opt.setAttribute('value', m);
			opt.innerText = m;
		}
		selectBox.appendChild(opt);
	}
}

function missionChanged(event) {
	if(!event || !event.currentTarget || !event.currentTarget.value || event.currentTarget.value === '{Select}') { return; }
	
	let newMission = utage.availableMissions[event.currentTarget.value.split('|')[0]];
	var promises = [
		utage.parseMissionFile(`${utage.rootDirectory}XDUData/${newMission.Path.replace('Asset/', '').replace('.utage', '')}`),
		player.resetAll()
	];
	
	Promise.all(promises)
	.then((success) => {
		var res = player.playFile()
		.then((success) => {
			player.resetAll();
			debugger;
		}, (failure) => {
			debugger;
			console.log(failure);
		});
	}, (failure) => {
		console.log(failure);
	});
}

function onTextClicked(event) {
	event.preventDefault();
	event.stopPropagation();
	
}