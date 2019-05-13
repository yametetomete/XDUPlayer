//(Math.exp(x)-1)/(Math.E-1)

class bufferLoader {
	constructor(context, soundMap, callback) {
		this.context = context;
		this.soundMap = soundMap;
		this.onloadUpdate = callback;
		this.bufferList = {};
		this.loadCount = 0;
	}
	
	load() {
		for (let s of this.soundMap) {
			this.loadBuffer(s.FileName, s.Label);
		}
	}
	
	loadBuffer(url, name) {
		return new Promise((resolve, reject) => {
			try
			{
				// Load buffer asynchronously
				fetch(url)
				.then((response) => {
					if(response.status !== 200) { 
						if(this.onloadUpdate) {
							this.onloadUpdate((++this.loadCount / this.soundMap.length) * 100);
						}
						reject(response); return; 
					}
					response.arrayBuffer().then((buffer) => {
						// Asynchronously decode the audio file data in request.response
						this.context.decodeAudioData(buffer, (buf) => {
								if (!buf) {
									reject('error decoding file data: ' + url);
								}
								this.bufferList[name] = buf;
								if(this.onloadUpdate) {
									this.onloadUpdate((++this.loadCount / this.soundMap.length) * 100);
								}
								resolve(`${this.loadCount}|${this.soundMap.length}`);
							},
							(error) => {
								
								console.log(error);
								console.log(`url: ${url}, name: ${name}`);
								if(this.onloadUpdate) {
									this.onloadUpdate((++this.loadCount / this.soundMap.length) * 100);
								}
								reject(error);
							}
						);
					});
				}, (failure) => {
					if(this.onloadUpdate) {
						this.onloadUpdate((++this.loadCount / this.soundMap.length) * 100);
					}
					console.log(failure);
					reject(failure);
				});
			} catch(error) {
				if(this.onloadUpdate) {
					this.onloadUpdate((++this.loadCount / this.soundMap.length) * 100);
				}
				console.log(error);
				reject(error);
			}
		});
	}
	
	resetAll() {
		this.bufferList = {};
	}
}

class audioController {	
	constructor(utage) {
		this.utage = utage;
		this.volume = 1.0;
		this.muted = false;
		this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		this.gainNode = this.audioCtx.createGain();
		this.gainNode.connect(this.audioCtx.destination);
		this.loader = undefined;
		this.sources = {};
	}
	
	playSound(sound, type) {
		if(!this.loader.bufferList[sound]) {
			return;
		}
		let source = this.audioCtx.createBufferSource();
		this.sources[sound] = source;
		source.buffer = this.loader.bufferList[sound];
		source.loop = false;
		if(type === "bgm") {
			if(this.utage.bgmLoopData[this.utage.soundInfo[sound].origFileName]) {
				let loop = this.utage.bgmLoopData[this.utage.soundInfo[sound].origFileName];
				source.loopStart = loop["loop_start"]["seconds"];
				source.loopEnd = loop["loop_end"]["seconds"];
				source.loop = true;
			}
		}
		source.connect(this.gainNode);
		source.onended = () => {
			if(!this.sources[sound]) { return; }
			this.sources[sound].disconnect(this.gainNode);
			this.sources[sound] = undefined;
		}
		source.start(0);
	}
	
	stopSound(sound) {
		if(sound === 'bgm') {
			for(let sKey of Object.keys(this.sources)) {
				try {
					if(!sKey.startsWith('bgm')) { continue; }
					let s = this.sources[sKey];
					s.stop();
					s.disconnect(this.gainNode);
					s = undefined;
				} catch (error) { }
			}
		} else {
			if(!this.sources[sound]) {
				return;
			}
			this.sources[sound].stop();
			this.sources[sound].disconnect(this.gainNode);
			this.sources[sound] = undefined;
		}
	}
	
	changeVolume(vol) {
		this.volume = (Math.exp(vol)-1)/(Math.E-1);
		if(!this.muted) {
			this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
		}
	}
	
	mute(mute) {
		if(mute != undefined) {
			this.muted = mute;
		} else {
			this.muted = !this.muted;
		}
		if(this.muted) {
			this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
		} else {
			this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
		}
	}
	
	loadSounds(soundMap, callback) {
		if(!soundMap || soundMap.length === 0) {
			if (callback) {
				callback(100);
			}
		} else {
			this.loader = new bufferLoader(this.audioCtx, soundMap, (percent) => {
				if (callback) {
					callback(percent);
				}
			});
			this.loader.load();
		}
	}
	
	resetAll() {
		if(this.loader) {
			this.loader.resetAll();
			this.loader = undefined;
		}
		for(let sKey of Object.keys(this.sources)) {
			let s = this.sources[sKey];
			try {
				s.stop();
				s.disconnect(this.gainNode);
				s = undefined;
			} catch(error) { }
		}
		this.sources = {};
	}
}
