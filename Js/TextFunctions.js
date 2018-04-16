'use strict';

class TextFunctions {
	constructor() {
		this.mainUi = undefined;
		this.title = undefined;
		this.diva = undefined;
		this.dialogBox = undefined;
		this.character = undefined;
		this.dialog = undefined;
		this.dialogToDisplay = {timeout: undefined, fullText: "", text: "", curPos: 0};
		this.textScrollSpeedMs = 40;
		this.scrollingText = false;
		this.lineHeight = -1;
	}
	
	findTextElements() {
		this.mainUi = document.getElementById('main-ui-img');
		this.title = document.getElementById('title');
		this.diva = document.getElementById('diva');
		this.dialogBox = document.getElementById('dialog-box');
		this.character = document.getElementById('character');
		this.dialog = document.getElementById('dialog');
		this.dialogInner = document.getElementById('dialog-inner');
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
		if(this.lineHeight == -1) {
			this.lineHeight = Number(window.getComputedStyle(this.dialog, null).getPropertyValue("line-height").replace('px', ''));
		}
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
				this.dialogToDisplay.curPos = 0;
				this.dialogInner.innerHTML = "";
				//this.dialogInner.innerHTML = this.dialogToDisplay.text[0];
				//this.dialogToDisplay.text = this.dialogToDisplay.text.slice(1);
				this.scrollingText = true;
				this.dialogToDisplay.timeout = setTimeout(putText.bind(this), this.textScrollSpeedMs);
			}
		}
		this.mainUi.style = show ? "opacity: 1;" : "opacity: 0;";
		this.dialogBox.style = show ? "opacity: 1;" : "opacity: 0;";
		
		//This is based off https://github.com/mattboldt/typed.js/
		function putText() {
			// skip over any HTML chars
			this.dialogToDisplay.curPos = this.typeHtmlChars(this.dialogToDisplay.text, this.dialogToDisplay.curPos);
			let substr = this.dialogToDisplay.text.substr(this.dialogToDisplay.curPos);
			if (this.dialogToDisplay.curPos === this.dialogToDisplay.text.length) {
				this.scrollingText = false;
				return;
			} else {
				this.dialogToDisplay.curPos += 1;
				const nextString = this.dialogToDisplay.text.substr(0, this.dialogToDisplay.curPos);
				this.dialogInner.innerHTML = nextString;
				let lHeight = this.lineHeight * 2
				if(this.dialogInner.offsetHeight > lHeight) {
					this.dialog.scrollTop = this.dialogInner.offsetHeight - lHeight;
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
		let lHeight = this.lineHeight * 2
		if(this.dialogInner.offsetHeight > lHeight) {
			this.dialog.scrollTop = this.dialogInner.offsetHeight - lHeight;
		}
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
	
	hideUi(show) {
		this.mainUi.style = show ? "opacity: 1;" : "opacity: 0;";
		this.dialogBox.style = show ? "opacity: 1;" : "opacity: 0;";
		this.character.style = show ? "opacity: 1;" : "opacity: 0;";
	}
	
	resetAll() {
		this.title.innerHTML = '';
		this.diva.innerHTML = '';
		this.character.innerHTML = '';
		this.dialogInner.innerHTML = '';
		this.title.style = "opacity: 0;";
		this.diva.style = "opacity: 0;";
		this.mainUi.style = "opacity: 0;";
		this.character.style = "opacity: 0;";
		this.dialogBox.style = "opacity: 0;";
	}
}