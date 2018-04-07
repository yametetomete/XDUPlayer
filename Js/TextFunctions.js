'use strict';

class TextFunctions {
	constructor() {
		this.mainUi = undefined;
		this.title = undefined;
		this.diva = undefined;
		this.dialogBox = undefined;
		this.character = undefined;
		this.dialog = undefined;
	}
	
	findTextElements() {
		this.mainUi = document.getElementById('main-ui-img');
		this.title = document.getElementById('title');
		this.diva = document.getElementById('diva');
		this.dialogBox = document.getElementById('dialog-box');
		this.character = document.getElementById('character');
		this.dialog = document.getElementById('dialog');
	}
	
	titleText(show, text) {
		if(text != undefined) {
			this.title.innerHTML = text;
		}
		this.title.style = show ? "opacity: 1;" : "opacity: 0;";
	}
	
	divaText(show, text) {
		if(text != undefined) {
			this.diva.innerHTML = text;
		}
		this.diva.style = show ? "opacity: 1;" : "opacity: 0;";
	}
	
	characterName(show, text) {
		if(text != undefined) {
			this.character.innerHTML = text;
		}
		this.mainUi.style = show ? "opacity: 1;" : "opacity: 0;";
		this.character.style = show ? "opacity: 1;" : "opacity: 0;";
	}
	
	dialogText(show, text) {
		if(text != undefined) {
			this.dialog.innerHTML = text;
		}
		this.mainUi.style = show ? "opacity: 1;" : "opacity: 0;";
		this.dialogBox.style = show ? "opacity: 1;" : "opacity: 0;";
	}
	
	resetAll() {
		this.title.innerHTML = '';
		this.diva.innerHTML = '';
		this.character.innerHTML = '';
		this.dialog.innerHTML = '';
		this.title.style = "opacity: 0;";
		this.diva.style = "opacity: 0;";
		this.mainUi.style = "opacity: 0;";
		this.character.style = "opacity: 0;";
		this.dialogBox.style = "opacity: 0;";
	}
}