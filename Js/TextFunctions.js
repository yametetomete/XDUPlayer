'use strict';

class TextFunctions {
	constructor() {
		this.mainUi = undefined;
		this.title = undefined;
		this.diva = undefined;
		this.dialogBox = undefined;
		this.character = undefined;
		this.dialog = undefined;
		this.textScrollSpeedMs = 35;
		this.scrollControls = undefined;
		this.nextIndicator = undefined;
		this.dialogToDisplay = {timeout: undefined, fullText: "", text: "", curPos: 0};
		this.scrollingText = false;
		this.lineHeight = -1;
		this.textHistory = [];
	}
	
	findTextElements() {
		this.mainUi = document.getElementById('main-ui-img');
		this.title = document.getElementById('title');
		this.diva = document.getElementById('diva');
		this.dialogBox = document.getElementById('dialog-box');
		this.character = document.getElementById('character');
		this.dialog = document.getElementById('dialog');
		this.dialogInner = document.getElementById('dialog-inner');
		this.scrollControls = document.getElementById('dialog-scroll');
		this.nextIndicator = document.getElementById('dialog-next');
	}
	
	titleText(show, text) {
		if(text != undefined) {
			this.title.innerHTML = text;
		}
		this.title.classList.toggle('hidden', !show);
	}
	
	divaText(show, text) {
		if(text != undefined) {
			this.diva.innerHTML = text;
		}
		this.diva.classList.toggle('hidden', !show);
	}
	
	characterName(show, text) {
		if(text != undefined) {
			this.character.innerHTML = text;
		}
		this.mainUi.classList.toggle('hidden', !show);
		this.character.classList.toggle('hidden', !show);
	}
	
	dialogText(show, text) {
		if(this.lineHeight == -1) {
			this.lineHeight = Number(window.getComputedStyle(this.dialog, null).getPropertyValue("line-height").replace('px', ''));
		}
		this.showNextIndicator(false);
		this.showScrollControls(false);
		if(text != undefined) {
			if(this.dialogToDisplay.timeout) {
				clearTimeout(this.dialogToDisplay.timeout);
				this.dialogToDisplay.timeout = undefined;
			}
			if(text === "") {
				this.dialogInner.innerHTML = text;
				this.scrollingText = false;
			} else {
				this.dialogToDisplay.text = text;
				this.dialogToDisplay.fullText = text;
				this.textHistory.push({ character: this.character.innerHTML, text: text });
				this.dialogToDisplay.curPos = 0;
				this.dialogInner.innerHTML = "";
				//this.dialogInner.innerHTML = this.dialogToDisplay.text[0];
				//this.dialogToDisplay.text = this.dialogToDisplay.text.slice(1);
				this.scrollingText = true;
				this.dialogToDisplay.timeout = setTimeout(putText.bind(this), this.textScrollSpeedMs);
			}
		}
		this.mainUi.classList.toggle('hidden', !show);
		this.dialogBox.classList.toggle('hidden', !show);
		
		//This is based off https://github.com/mattboldt/typed.js/
		function putText() {
			// skip over any HTML chars
			this.dialogToDisplay.curPos = this.typeHtmlChars(this.dialogToDisplay.text, this.dialogToDisplay.curPos);
			let substr = this.dialogToDisplay.text.substr(this.dialogToDisplay.curPos);
			if (this.dialogToDisplay.curPos === this.dialogToDisplay.text.length) {
				this.showNextIndicator(true);
				this.scrollingText = false;
				return;
			} else {
				this.dialogToDisplay.curPos += 1;
				const nextString = this.dialogToDisplay.text.substr(0, this.dialogToDisplay.curPos);
				this.dialogInner.innerHTML = nextString;
				let lHeight = this.lineHeight * 2
				//the +5 is just to give a bit of tolerance
				if(this.dialogInner.offsetHeight > lHeight + 5) {
					this.dialog.scrollTop = this.dialogInner.offsetHeight - lHeight;
					this.showScrollControls(true);
				}
			}
			
			this.dialogToDisplay.timeout = setTimeout(putText.bind(this), this.textScrollSpeedMs);
		}
	}
	
	showDialogFullText() {
		if(this.dialogToDisplay.timeout) {
			clearTimeout(this.dialogToDisplay.timeout);
			this.dialogToDisplay.timeout = undefined;
		}
		this.dialogInner.innerHTML = this.dialogToDisplay.fullText;
		let lHeight = this.lineHeight * 2;
		if(this.dialogInner.offsetHeight > lHeight + 5) {
			this.dialog.scrollTop = this.dialogInner.offsetHeight - lHeight;
			this.showScrollControls(true);
		}
		this.showNextIndicator(true);
		this.scrollingText = false;
	}
	
	typeHtmlChars(curString, curStrPos) {
		const curChar = curString.substr(curStrPos).charAt(0);
		if (curChar === '<' || curChar === '&') {
			let endTag = '';
			if (curChar === '<') {
				endTag = '>';
			} else {
				endTag = ';';
			}
			while (curString.substr(curStrPos + 1).charAt(0) !== endTag) {
				curStrPos++;
				if (curStrPos + 1 > curString.length) { break; }
			}
			curStrPos++;
		}
		return curStrPos;
	}
	
	showScrollControls(show) {
		this.scrollControls.classList.toggle('hidden', !show);
	}
	
	scrollTextUp() {
		let lHeight = this.lineHeight * 2;
		let val = this.dialog.scrollTop - lHeight;
		if(val < 0) {
			val = 0;
		}
		this.dialog.scrollTop = val;
	}
	
	scrollTextDown() {
		let lHeight = this.lineHeight * 2;
		let val = this.dialog.scrollTop + lHeight;
		if(val > this.dialogInner.offsetHeight - lHeight) {
			val = this.dialogInner.offsetHeight - lHeight;
		}
		this.dialog.scrollTop = val;
	}
	
	showNextIndicator(show) {
		this.nextIndicator.classList.toggle('hidden', !show);
	}
	
	hideUi(show) {
		this.mainUi.classList.toggle('hidden', !show);
		this.dialogBox.classList.toggle('hidden', !show);
		this.character.classList.toggle('hidden', !show);
	}
	
	resetAll() {
		this.title.innerHTML = '';
		this.diva.innerHTML = '';
		this.character.innerHTML = '';
		this.dialogInner.innerHTML = '';
		this.title.classList.add('hidden');
		this.diva.classList.add('hidden');
		this.mainUi.classList.add('hidden');
		this.character.classList.add('hidden');
		this.dialogBox.classList.add('hidden');
		this.scrollControls.classList.add('hidden');
		this.nextIndicator.classList.add('hidden');
		this.textHistory.length = 0;
		if(this.dialogToDisplay.timeout) {
			clearTimeout(this.dialogToDisplay.timeout);
		}
		this.dialogToDisplay = {timeout: undefined, fullText: "", text: "", curPos: 0};
		this.scrollingText = false;
		this.lineHeight = -1;
	}
}