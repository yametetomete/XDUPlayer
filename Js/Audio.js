//(Math.exp(x)-1)/(Math.E-1)
//🔊

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
							function(error) {
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
					console.log(failure);
					reject(failure);
				});
			} catch(error) {
				console.log(error);
				reject(error);
			}
		});
	}
}

class audioController {	
	constructor() {
		this.volume = 1.0;
		this.muted = false;
		this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		this.gainNode = this.audioCtx.createGain();
		this.loader = undefined;
	}
	
	changeVolume(vol) {
		this.volume = (Math.exp(vol)-1)/(Math.E-1);
		if(!this.muted) {
			this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
		}
	}
	
	mute() {
		this.muted = !this.muted;
		if(this.muted) {
			this.gainNode.gain.setValueAtTime(0, athis.udioCtx.currentTime);
		} else {
			this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
		}
	}
	
	loadSounds(soundMap, callback) {
		this.loader = new bufferLoader(this.audioCtx, soundMap, (percent) => {
			if (callback) {
				callback(percent);
			}
		});
		this.loader.load();
	}
}