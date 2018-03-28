'use strict';

const pixiApp = { 
	app: new PIXI.Application({width: 1334, height: 750}),
	loader: PIXI.loader
};
const utage = new UtageInfo();
const player = new Player(pixiApp, utage);
const context = new (window.AudioContext || window.webkitAudioContext)();
const onBodyLoaded = () => {
	var promises = [
		utage.loadUtageSettings()
	];

	Promise.all(promises)
	.then((success) => {
		onParsed(success);
	}, (failure) => {
		console.log(failure);
	});
};

function onParsed (success) {
	buildMissionSelectList();
	document.getElementById('app-container').appendChild(pixiApp.app.view);
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
	utage.parseMissionFile(`${utage.rootDirectory}XDUData/${newMission.Path.replace('Asset/', '').replace('.utage', '')}`)
	.then((success) => {
		player.playFile()
		.then((success) => {
			debugger;
		}, (failure) => {
			debugger;
			console.log(failure);
		});
	}, (failure) => {
		console.log(failure);
	});
}