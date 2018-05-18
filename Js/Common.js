'use strict';

let rootUrl = `${window.location.protocol}//${window.location.host}/`;
const baseDimensions = {width: 1334, height: 750};
const screenRatio = 9/16;

class commonFunctions {	
	static getFileText(file) {
		return new Promise((resolve, reject) => {
			try
			{
				fetch(file)
				.then((success) => {
					if(success.status !== 200) { reject(success); return; }
					success.text()
					.then((text) => {
						resolve(text);
					});
				}, (failure) => {
					reject(failure);
				});
			} catch(error) {
				reject(error);
			}
		});
	}
	
	static getFileJson(file) {
		return new Promise((resolve, reject) => {
			try
			{
				fetch(file)
				.then((success) => {
					if(success.status !== 200) { reject(success); return; }
					success.json()
					.then((json) => {
						resolve(json);
					});
				}, (failure) => {
					reject(failure);
				});
			} catch(error) {
				reject(error);
			}
		});
	}
	
	static readQueryParameters() {
		let params = {};
		let indexOfStart = window.location.href.indexOf("?");
		let toCheck = window.location.href.slice(indexOfStart + 1);
		let name = "";
		let value = "";
		let nameStep = true;
		for(let i = 0; i < toCheck.length; ++i) {
			if(toCheck[i] === "=") {
				name = name.toLowerCase();
				params[decodeURIComponent(name)] = "";
				nameStep = false
				continue;
			}
			if(toCheck[i] === "&") {
				params[name] = decodeURIComponent(value);
				name = "";
				value = "";
				nameStep = true;
				continue;
			}
			if(nameStep) {
				name += toCheck[i];
			} else {
				value += toCheck[i];
			}
		}
		params[name] = decodeURIComponent(value);
		return params;
	}
	
	static readLine(line, headers) {
		if(line.startsWith('//')) {
			return {comment: line};
		} else if(!line) {
			return undefined;
		} else {
			let split = line.split('\t');
			let newEntry = {};
			for(let i = 0; i < split.length; ++i) {
				let x = split[i].trim();
				newEntry[headers[i]] = x;
			}
			return newEntry;
		}
	}
	
	static lerp(start, end, t, type = "linear") {
		switch(type) {
			default:
			case "linear":
				break;
			case "sin":
				t = t * (Math.PI / 2);
				t = Math.sin(t);
				break;
			case "fullsin":
				t = t * Math.PI;
				t = Math.sin(t);
				break;
			case "fullwait":
				t = -(Math.pow((2*t-1), 4)) + 1;
				break;
			case "square":
				t = Math.pow(t, 2);
				break;
			case "exp":
				t = Math.pow(t, 1/4);
				break;
			case "sqrt":
				t = Math.sqrt(t);
				break;
			//Some of the stuff here is just kinda arbitrary
			case "dampsin":
				t = (1 * (Math.pow(0.3, t)) * Math.sin((2*Math.PI*t/1.0) + 0)) / 1.25;
				if(t < -0.45) { 
					t = -0.45;
				}
				break;
			case "punch": {
				if (t === 0 || t === 1)
					return start;
				let change = end - start;
				let num = 0.3;
				let rad = Math.PI * 2;
				let num2 = num / rad * Math.asin(0);
				return change * Math.pow(2, -10 * t) * Math.sin((t * 1 - num2) * rad / num);
			}
			//http://www.gizma.com/easing/
			case "quadout": {
				let change = end - start;
				return -change * t*(t-2) + start;
			}
			case "quadinout": {
				let change = end - start;
				t = t * 2;
				if (t < 1) { return change/2*t*t + start; }
				t--;
				return -change/2 * (t*(t-2) - 1) + start;
			}
		}
		return (1 - t) * start + t * end;
		//-(2*x-1)^4 +1
	}
	
	static getColorFromName(name) {
		if(!name) { return { color: 0xFFFFFF, alpha: 1 } }
		
		if(name.startsWith('#')) {
			let alpha = '';
			let color = '';
			name = name.substring(1);
			if(name.length === 8) {
				color = name.slice(0, 6);
				alpha = name.slice(6, 8);
			}
			color = parseInt(color, 16);
			alpha = parseInt(alpha, 16) / 255;
			return { color, alpha };
		} else {
			switch(name.toLowerCase()) {
				default:
				case 'black':
					return { color: 0x000000, alpha: 1 };
				case 'white':
					return { color: 0xFFFFFF, alpha: 1 };
				case 'silver':
					return { color: 0xD7D7D7, alpha: 1 };
			}
		}
	}
	
	static hexToRgb(hex) {
		let r = (hex >> 16) & 255;
		let g = (hex >> 8) & 255;
		let b = hex & 255;
		return [r/255, g/255, b/255];
	}
	
	static convertUtageTextTags(text) {
		text = text.replace(/<speed.*?>|<\/speed>/g, "");
		text = text.replace(/\\n/g, "<br/>")
		//rewrite ruby tags to normal html format
		let rubyMatches = text.match(/<ruby=.*?<\/ruby>/g);
		if(rubyMatches) {
			for(let i = 0; i < rubyMatches.length; ++i) {
				let m = rubyMatches[i];
				let rText = '';
				let innerText = '';
				let startR = false;
				let startI = false;
				for(let j = 0; j < m.length; ++j) {
					if(m[j] === '<' && j !== 0) { startI = false; }
					if(startI) { 
						innerText+= m[j];
					}
					if(m[j] === '>') { startR = false; startI = true; }
					if(startR) {
						rText += m[j];
					}
					if(m[j] === '=') { startR = true; }
				}
				text = text.replace(m, `<ruby>${innerText}<rt>${rText}</rt></ruby>`);
			}
		}
		return text;
	}
	
	static getNewResolution(baseRes, screenWidth, screenHeight, minusHeight) {
		let retval = { width: 0, height: 0 };
		if(screenWidth >= screenHeight) {
			let newPer = (screenHeight - (minusHeight || 0)) / baseRes.height;
			retval.height = baseRes.height * newPer;
			retval.width = baseRes.width * newPer;
			if(retval.width > screenWidth) {
				newPer = screenWidth / baseRes.width;
				retval.height = baseRes.height * newPer;
				retval.width = baseRes.width * newPer;
			}
		} else if (screenHeight > screenWidth) {
			let newPer = screenWidth / baseRes.width;
			retval.height = baseRes.height * newPer;
			retval.width = baseRes.width * newPer;
		}
		return retval;
	}
	
	static getAnchorFromCharPivot(pivot) {
		let x = 0.5;
		let y = 0.5;
		let sp = pivot.split(" ");
		for(let p of sp) {
			if(p.startsWith("x=")) {
				x = Number(p.substring(2));
			} else if(p.startsWith("y=")) {
				y = Number(p.substring(2));
				//The y pivot from utage is based from the bottom so it needs to be flipped
				y = 1 - y;
			}
		}
		return {x, y};
	}
	
	static getPropertiesFromTweenCommand(props, reverseY = true) {
		let retval = {};
		let indexX = props.indexOf("x=");
		if(indexX !== -1) {
			retval.x = "";
			for(let i = indexX + 2; i < props.length; ++i) {
				if(props[i] == " ") { break; }
				retval.x += props[i];
			}
			retval.x = Number(retval.x);
		}
		let indexY = props.indexOf("y=");
		if(indexY !== -1) {
			retval.y = "";
			for(let i = indexY+ 2; i < props.length; ++i) {
				if(props[i] == " ") { break; }
				retval.y += props[i];
			}
			retval.y = reverseY ? -Number(retval.y) : Number(retval.y);
		}
		let indexT = props.indexOf("time=");
		if(indexT !== -1) {
			retval.time = "";
			for(let i = indexT + 5; i < props.length; ++i) {
				if(props[i] == " ") { break; }
				retval.time += props[i];
			}
			retval.time = Number(retval.time) * 1000;
		}
		let indexD = props.indexOf("delay=");
		if(indexD !== -1) {
			retval.delay = "";
			for(let i = indexD + 6; i < props.length; ++i) {
				if(props[i] == " ") { break; }
				retval.delay += props[i];
			}
			retval.delay = Number(retval.delay) * 1000;
		}
		let indexA = props.indexOf("alpha=");
		if(indexA !== -1) {
			retval.alpha = "";
			for(let i = indexA + 6; i < props.length; ++i) {
				if(props[i] == " ") { break; }
				retval.alpha += props[i];
			}
			retval.alpha = Number(retval.alpha);
		}
		let indexS = props.indexOf("speed=");
		if(indexS !== -1) {
			retval.speed = "";
			for(let i = indexS + 6; i < props.length; ++i) {
				if(props[i] == " ") { break; }
				retval.speed += props[i];
			}
			retval.speed = Number(retval.speed);
		}
		return retval;
	}
}