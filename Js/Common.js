'use strict';

var rootUrl = `${window.location.protocol}//${window.location.host}/`

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
			var split = line.split('\t');
			var newEntry = {};
			for(let i = 0; i < split.length; ++i) {
				var x = split[i];
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
}