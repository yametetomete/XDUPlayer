'use strict';

var rootUrl = `${window.location.protocol}//${window.location.host}/`;

class commonFunctions {	
	static getFileText(file) {
		return new Promise((resolve, reject) => {
			fetch(file)
			.then((success) => {
				success.text()
				.then((text) => {
					resolve(text);
				});
			}, (failure) => {
				reject(failure);
			});
		});
	}
	
	static getFileJson(file) {
		return new Promise((resolve, reject) => {
			fetch(file)
			.then((success) => {
				success.json()
				.then((json) => {
					resolve(json);
				});
			}, (failure) => {
				reject(failure);
			});
		});
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
				let x = split[i];
				newEntry[headers[i]] = x;
			}
			return newEntry;
		}
	}
	
	static lerp(start, end, t) {
		return (1 - t) * start + t * end;
	}
	
	static getColorFromName(name) {
		if(!name) { return 0xFFFFFF }
		
		switch(name.toLowerCase()) {
			case 'black':
				return 0x000000;
			case 'white':
				return 0xFFFFFF;
		}
	}
	
	static convertUtageTextTags(text) {
		text = text.replace(/<speed.*?>|<\/speed>/g, "");
		text = text.replace("\\n", "<br/>")
		return text;
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
				y = 1 - y;
			}
		}
		return {x, y};
	}
}