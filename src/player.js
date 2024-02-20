class Player {
	constructor(query, info) {
		this.player = document.querySelector(query);
		this.player.removeAttribute("controls");
		this.info = info;
		this.playerType = "html5";
		this.controlsHideTime = Number.MAX_SAFE_INTEGER
		if (!info) throw new Error("info must be provided while constructing a new Player instance!");
		if (!info.chapters || info.chapters.length === 0) {
			info.chapters = [{
				from: 0,
				to: 100,
				name: ""
			}]
		}

		if (info.storyboard && info.storyboard.type === "yt_l1") {
			this.storyboardImage = new Image();
			this.storyboardImage.src = info.storyboard.src;
		}
		this.root = this.buildPlayerElement({
			author: info.author,
			title: info.title,
			playButtonHtml: info.buttons.play,
			pauseButtonHtml: info.buttons.pause,
			muteButtonHtml: info.buttons.volumeMedium,
			settingsButtonHtml: info.buttons.settings,
			fullscreenButtonHtml: info.buttons.fullscreen,
			minimizeButtonHtml: info.buttons.minimize,
			chapters: info.chapters,
			segments: info.segments,
			endscreen: info.endscreen,
			loading: info.loading
		});

		this.player.parentElement.insertBefore(this.root, this.player);
		this.root.insertBefore(this.player, this.root.firstElementChild);

		if (info.hlsManifest) {
			if (Hls.isSupported()) {
				this.playerType = "hls.js";
				this.hlsjs = new Hls();
				this.hlsjs.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
					console.log(`[HLS.JS] Manifest parsed with ${data.levels.length} quality levels`);
					this.updateSelects();
				});
				this.hlsjs.on(Hls.Events.LEVEL_SWITCHED, (event, {level}) => {
					console.log(`[HLS.JS] Switched to the quality level ${this.hlsjs.levels[level].height}p (${level})`);
					this.updateSelects();
				});
				this.hlsjs.loadSource(info.hlsManifest);
				// bind them together
				this.hlsjs.attachMedia(this.player);
			}
		}

		if (this.info.rememberVolume) {
			let savedVolume = window.localStorage.getItem("ltplayer.volume")
			if (savedVolume != null)
				this.player.volume = Number(savedVolume)
		}

		this.assignEvents();
		this.updateButtons();
		this.updateSelects();
		if (info.endscreen != null)
			this.buildEndscreen();
	}

	buildPlayerElement(model) {
		const progressBars = [];

		const container = document.createElement("DIV");
		container.setAttribute("class", "ltp-root");

		const element1 = document.createElement("DIV");
		element1.setAttribute("class", "ltp-gradient-top");
		container.appendChild(element1);

		const endscreenContainer = document.createElement("DIV");
		endscreenContainer.setAttribute("class", "ltp-endscreen");
		endscreenContainer.style.display = "none";
		container.appendChild(endscreenContainer);

		const element2 = document.createElement("DIV");
		element2.setAttribute("class", "ltp-title");

		const authorIcon = document.createElement("A");
		authorIcon.setAttribute("class", "ltp-title__icon");
		authorIcon.setAttribute("style", `background-image: url('${model.author?.icon}');background-size:contain;`);
		authorIcon.setAttribute("href", model.author?.href);
		authorIcon.setAttribute("title", model.author?.title);
		element2.appendChild(authorIcon);

		const videoTitle = document.createElement("SPAN");
		videoTitle.setAttribute("class", "ltp-title__text");
		videoTitle.innerHTML = model.title;
		element2.appendChild(videoTitle);
		container.appendChild(element2);

		const element3 = document.createElement("DIV");
		element3.setAttribute("class", "ltp-gradient-bottom");
		container.appendChild(element3);

		const loading = document.createElement("DIV");
		loading.setAttribute("class", "ltp-loading");
		loading.innerHTML = model.loading;
		container.appendChild(loading);

		const element4 = document.createElement("DIV");
		element4.setAttribute("class", "ltp-progress-container");

		for (const chapter of model.chapters) {
			const chapterContainer = document.createElement("DIV");
			chapterContainer.setAttribute("class", "ltp-progress");
			chapterContainer.setAttribute("title", chapter.name);
			chapterContainer.style.width = (chapter.to - chapter.from) + "%";

			const bufferedBar = document.createElement("DIV");
			bufferedBar.setAttribute("class", "ltp-progress__buffered");
			chapterContainer.appendChild(bufferedBar);

			const playedBar = document.createElement("DIV");
			playedBar.setAttribute("class", "ltp-progress__played");
			chapterContainer.appendChild(playedBar);
			element4.appendChild(chapterContainer);

			progressBars.push({
				name: chapter.name,
				to: chapter.to,
				from: chapter.from,
				background: chapterContainer,
				buffered: bufferedBar,
				played: playedBar
			})
		}
		this.buildSegments(model.segments || [], progressBars);

		container.appendChild(element4);

		const element5 = document.createElement("DIV");
		element5.setAttribute("class", "ltp-controls");

		const buttonPlay = document.createElement("DIV");
		buttonPlay.setAttribute("class", "ltp-controls-button");
		buttonPlay.innerHTML = model.playButtonHtml;
		element5.appendChild(buttonPlay);

		const buttonMute = document.createElement("DIV");
		buttonMute.setAttribute("class", "ltp-controls-volume-icon");
		let html;
		if (this.player.muted) {
			html = this.info.buttons.volumeMute;
		} else if (this.player.volume > 0.7) {
			html = this.info.buttons.volumeHigh;
		} else if (this.player.volume < 0.3) {
			html = this.info.buttons.volumeLow;
		} else {
			html = this.info.buttons.volumeMedium;
		}
		buttonMute.innerHTML = html;
		element5.appendChild(buttonMute);

		const volumeContainer = document.createElement("DIV");
		volumeContainer.setAttribute("class", "ltp-controls-volume");

		const volumeBarBg = document.createElement("DIV");
		volumeBarBg.setAttribute("class", "ltp-controls-volume-bar");

		const volumeBar = document.createElement("DIV");
		volumeBar.setAttribute("class", "ltp-controls-volume-value");
		volumeBarBg.appendChild(volumeBar);
		volumeContainer.appendChild(volumeBarBg);
		element5.appendChild(volumeContainer);

		const timestamp = document.createElement("DIV");
		timestamp.setAttribute("class", "ltp-controls-timestamp");
		timestamp.innerHTML = "--:-- / --:--";
		element5.appendChild(timestamp);

		const element6 = document.createElement("DIV");
		element6.setAttribute("class", "ltp-controls-divider");
		element5.appendChild(element6);

		const buttonSettings = document.createElement("DIV");
		buttonSettings.setAttribute("class", "ltp-controls-button");
		buttonSettings.innerHTML = model.settingsButtonHtml;
		element5.appendChild(buttonSettings);

		const buttonFullscreen = document.createElement("DIV");
		buttonFullscreen.setAttribute("class", "ltp-controls-button");
		buttonFullscreen.innerHTML = model.fullscreenButtonHtml;
		element5.appendChild(buttonFullscreen);
		container.appendChild(element5);

		const previewContainer = document.createElement("DIV");
		previewContainer.classList.add("ltp-storyboard-container");

		const previewContainerImg = document.createElement("CANVAS");
		previewContainerImg.classList.add("ltp-storyboard-image");
		previewContainer.appendChild(previewContainerImg);

		const previewContainerText = document.createElement("DIV");
		previewContainerText.classList.add("ltp-storyboard-text");
		previewContainer.appendChild(previewContainerText);

		container.appendChild(previewContainer);

		const menu = document.createElement("DIV");
		menu.setAttribute("class", "ltp-menu");

		const menuitemSpeed = document.createElement("LABEL");
		menuitemSpeed.setAttribute("class", "ltp-menuitem");

		const element34 = document.createElement("SPAN");
		element34.innerHTML = "Playback speed";
		menuitemSpeed.appendChild(element34);

		const menuitemSpeedSelect = document.createElement("SELECT");
		menuitemSpeedSelect.appendChild(this.createMenuOption("0.25", ".25"));
		menuitemSpeedSelect.appendChild(this.createMenuOption("0.50", ".5"));
		menuitemSpeedSelect.appendChild(this.createMenuOption("0.75", ".75"));
		menuitemSpeedSelect.appendChild(this.createMenuOption("Normal", "1", true));
		menuitemSpeedSelect.appendChild(this.createMenuOption("1.25", "1.25"));
		menuitemSpeedSelect.appendChild(this.createMenuOption("1.50", "1.5"));
		menuitemSpeedSelect.appendChild(this.createMenuOption("1.75", "1.75"));
		menuitemSpeedSelect.appendChild(this.createMenuOption("2", "2"));
		menuitemSpeed.appendChild(menuitemSpeedSelect);
		menu.appendChild(menuitemSpeed);

		const menuitemSubtitles = document.createElement("LABEL");
		menuitemSubtitles.setAttribute("class", "ltp-menuitem");

		const element36 = document.createElement("SPAN");
		element36.innerHTML = "Subtitles/CC";
		menuitemSubtitles.appendChild(element36);

		const menuitemSubtitlesSelect = document.createElement("SELECT");
		menuitemSubtitles.appendChild(menuitemSubtitlesSelect);
		menu.appendChild(menuitemSubtitles);

		const menuitemQuality = document.createElement("LABEL");
		menuitemQuality.setAttribute("class", "ltp-menuitem");

		const element38 = document.createElement("SPAN");
		element38.innerHTML = "Quality";
		menuitemQuality.appendChild(element38);

		const menuitemQualitySelect = document.createElement("SELECT");

		menuitemQuality.appendChild(menuitemQualitySelect);
		menu.appendChild(menuitemQuality);

		const menuitemAudioTracks = document.createElement("LABEL");
		menuitemAudioTracks.setAttribute("class", "ltp-menuitem");

		const element37 = document.createElement("SPAN");
		element37.innerHTML = "Audio track";
		menuitemAudioTracks.appendChild(element37);

		const menuitemAudioTracksSelect = document.createElement("SELECT");
		menuitemAudioTracks.appendChild(menuitemAudioTracksSelect);
		menu.appendChild(menuitemAudioTracks);
		container.appendChild(menu);

		const buttonSkip = document.createElement("DIV");
		buttonSkip.classList.add("ltp-skip");
		container.appendChild(buttonSkip);

		menuitemQuality.style.display = "none";
		menuitemSubtitles.style.display = "none";
		menuitemAudioTracks.style.display = "none";
		menu.style.display = "none";

		this.elements = {
			root: container,
			endscreenContainer,
			authorIcon,
			videoTitle,
			timestamp,
			volumeBar,
			progressBarSections: progressBars,
			buttons: {
				play: buttonPlay,
				mute: buttonMute,
				settings: buttonSettings,
				fullscreen: buttonFullscreen,
				skip: buttonSkip
			},
			menus: {
				menu: menu,
				speed: menuitemSpeedSelect,
				quality: menuitemQualitySelect,
				subtitles: menuitemSubtitlesSelect,
				audioTracks: menuitemAudioTracksSelect
			},
			storyboard: {
				container: previewContainer,
				image: previewContainerImg,
				context: previewContainerImg.getContext("2d"),
				text: previewContainerText
			},
			loading
		}

		return container;
	}

	createMenuOption(label, id, selected) {
		const option = document.createElement("OPTION");
		option.innerHTML = label;
		option.setAttribute("value", id);
		if (selected)
			option.setAttribute("selected", "selected");
		return option;
	}

	assignEvents() {
		this.elements.buttons.play.onclick = () => {
			if (this.player.paused) this.player.play()
			else this.player.pause()
		}
		this.player.onpause = () => {
			this.updateButtons()
		}
		this.player.onplay = () => {
			this.updateButtons()
		}
		this.player.onclick = () => {
			if (this.player.paused) this.player.play()
			else this.player.pause()
		}
		this.player.ondblclick = () => {
			if (window.fullScreen)
				document.exitFullscreen()
					.then(() => {
						this.updateButtons();
					})
					.catch(() => {
						this.updateButtons();
					});
			else
				this.root.requestFullscreen({
					navigationUI: "hide"
				})
					.then(() => {
						this.updateButtons();
					})
					.catch(() => {
						this.updateButtons();
					});
		}

		this.addMouseMoveEvents(this.elements.root)

		this.elements.buttons.mute.onclick = () => {
			this.player.muted = !this.player.muted;
			this.updateButtons();
		}

		this.elements.buttons.fullscreen.onclick = () => {
			let promise = window.fullScreen ? document.exitFullscreen() : this.root.requestFullscreen({
				navigationUI: "hide"
			})
			promise.then(() => {
				this.updateButtons();
			}).catch(() => {
				this.updateButtons();
			})
		}

		this.player.ontimeupdate = () => {
			if (Date.now() > this.controlsHideTime && !this.root.classList.contains("controls-hidden"))
				this.root.classList.add("controls-hidden");
			else if (Date.now() < this.controlsHideTime && this.root.classList.contains("controls-hidden"))
				this.root.classList.remove("controls-hidden");
			this.resizeProgressBar("played", (this.player.currentTime / this.player.duration) * 100)
			this.checkSegments();
		}

		this.player.onvolumechange = () => {
			this.elements.volumeBar.style.width = (this.player.volume * 100) + "%";
			let html;
			if (this.player.muted) {
				html = this.info.buttons.volumeMute;
			} else if (this.player.volume > 0.7) {
				html = this.info.buttons.volumeHigh;
			} else if (this.player.volume < 0.3) {
				html = this.info.buttons.volumeLow;
			} else {
				html = this.info.buttons.volumeMedium;
			}
			this.elements.buttons.mute.innerHTML = html;
			if (this.info.rememberVolume) {
				try {
					window.localStorage.setItem("ltplayer.volume", this.player.volume)
				} catch (_) {
					// no localstorage access? :(
				}
			}
		}

		this.elements.volumeBar.parentElement.parentElement.onclick = event => {
			this.player.volume = this.percentageFromMouseOverEvent(event, this.elements.volumeBar.parentElement)
		}

		this.elements.progressBarSections[0].background.parentElement.onclick = event => {
			this.player.currentTime = this.percentageFromMouseOverEvent(event, this.elements.progressBarSections[0].background.parentElement) * this.player.duration
		}

		this.elements.progressBarSections[0].background.parentElement.onmousemove = event => {
			this.updateStoryboard(this.percentageFromMouseOverEvent(event, this.elements.progressBarSections[0].background.parentElement))
		}

		this.elements.progressBarSections[0].background.parentElement.onmouseenter = () => {
			this.updateStoryboard(true);
		}

		this.elements.progressBarSections[0].background.parentElement.onmouseleave = () => {
			this.updateStoryboard(false);
		}

		this.elements.buttons.settings.onclick = () => {
			if (this.elements.menus.menu.style.display === "none")
				this.elements.menus.menu.style.display = "flex";
			else
				this.elements.menus.menu.style.display = "none";
		}

		this.elements.menus.speed.onchange = () => {
			this.player.playbackRate = parseFloat(this.elements.menus.speed.value);
			this.elements.menus.menu.style.display = "none";
		}
		this.elements.menus.quality.onchange = () => {
			switch (this.playerType) {
				case "html5":
					const t = this.player.currentTime;
					this.player.src = this.elements.menus.quality.value;
					this.player.currentTime = t;
					break;
				case "hls.js":
					let level = this.elements.menus.quality.value;
					this.hlsjs.nextLevel = parseInt(level);
					break;
				default:
					console.error(`Unknown player type ${this.playerType}`)
					break;
			}
			this.elements.menus.menu.style.display = "none";
		}
		this.elements.menus.audioTracks.onchange = () => {
			switch (this.playerType) {
				case "hls.js":
					this.hlsjs.audioTrack = parseInt(this.elements.menus.audioTracks.value);
					break;
				default:
					console.error(`Unknown player type ${this.playerType}`)
					break;
			}
			this.elements.menus.menu.style.display = "none";
		}
		this.elements.menus.subtitles.onchange = () => {
			for (let i = 0; i < this.player.textTracks.length; i++) {
				this.player.textTracks[i].mode = "hidden";
			}

			if (this.elements.menus.subtitles.value === "null") return;
			const track = Array.from(this.player.textTracks).filter(x => x.label === this.elements.menus.subtitles.value)[0];
			track.mode = "showing";
			this.elements.menus.menu.style.display = "none";
		}

		window.onkeydown = event => {
			if (!this.elements.root.contains(event.target)) return;
			if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
			if (this.handleHotkey(event.key))
				event.preventDefault();
		}

		setInterval(() => {
			if (this.player.buffered.length > 0)
				this.resizeProgressBar("buffered", (this.player.buffered.end(this.player.buffered.length - 1) / this.player.duration) * 100, true)
			this.elements.timestamp.innerText = `${this.timestampFromMs(this.player.currentTime)} / ${this.timestampFromMs(this.player.duration)}`;
			this.updateLoading();
		}, 100);
	}

	addMouseMoveEvents(el) {
		for (let e of Array.from(el.children))
			this.addMouseMoveEvents(e);

		el.addEventListener("mousemove", () => {
			this.root.classList.remove("controls-hidden");
			this.controlsHideTime = Date.now() + 5000;
		});
	}

	updateButtons() {
		this.elements.buttons.play.innerHTML = this.player.paused ? this.info.buttons.play : this.info.buttons.pause
		this.elements.buttons.fullscreen.innerHTML = window.fullScreen ? this.info.buttons.minimize : this.info.buttons.fullscreen
	}

	percentageFromMouseOverEvent(event, element) {
		if (!element) element = event.target;
		return this.remapNumber(event.clientX, element.getBoundingClientRect().left, element.getBoundingClientRect().left + element.clientWidth - 1, 0, 1)
	}

	timestampFromMs(ms) {
		let seconds = ms;
		const hours = Math.floor(seconds / 3600);
		seconds = seconds % 3600;
		const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
		seconds = Math.floor(seconds % 60).toString().padStart(2, "0");
		return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`.replaceAll("NaN", "--");
	}

	resizeProgressBar(barName, percentage) {
		let totalPercSoFar = 0;
		let reachedEnd = false;
		for (const section of this.elements.progressBarSections) {
			if (reachedEnd) {
				section[barName].style.width = "0%";
			} else if (totalPercSoFar <= percentage && percentage <= totalPercSoFar + section.to) {
				section[barName].style.width = this.remapNumber(percentage, section.from, section.to, 0, 100) + "%";
				reachedEnd = true;
			} else {
				section[barName].style.width = "100%";
			}
		}
	}

	remapNumber(value, in_min, in_max, out_min, out_max) {
		return out_min + (out_max - out_min) * (value - in_min) / (in_max - in_min);
	}

	updateSelects() {
		switch (this.playerType) {
			case "html5":
				const elements = Array.from(this.player.children);
				const videoTracks = elements.filter(x => x.tagName === "SOURCE");
				const textTracks = Array.from(this.player.textTracks);

				if (videoTracks.length > 1) {
					let foundQuality = false;
					let qualities = [];
					for (const track of videoTracks) {
						const label = track.getAttribute("label");
						const src = track.getAttribute("src");
						const selected = src === this.player.currentSrc;
						if (selected) foundQuality = true;
						qualities.push(this.createMenuOption(label, src, selected));
					}
					if (!foundQuality)
						qualities[0].setAttribute("selected", "selected");

					for (const quality of qualities)
						this.elements.menus.quality.appendChild(quality);

					this.elements.menus.quality.parentElement.style.display = "flex"
				}

				if (textTracks.length > 0) {
					let foundSubtitles = false;
					let subtitles = [];
					subtitles.push(this.createMenuOption("Off", null));
					for (const track of textTracks) {
						const label = track.label;
						const selected = track.mode === "showing";
						if (selected) foundSubtitles = true;
						subtitles.push(this.createMenuOption(label, label, selected));
					}
					if (!foundSubtitles)
						subtitles[0].setAttribute("selected", "selected");

					for (const subtitle of subtitles)
						this.elements.menus.subtitles.appendChild(subtitle);

					this.elements.menus.subtitles.parentElement.style.display = "flex"
				}
				break;
			case "hls.js":
				// quality levels
				const addedQLs = [];
				const qualityLevels = this.hlsjs.levels.filter(x => x.videoCodec.startsWith("avc1"))
				const currentQL = this.hlsjs.currentLevel > 0 ? this.hlsjs.levels[this.hlsjs.currentLevel].height : undefined;
				const qlElements = [];
				if (this.hlsjs.autoLevelEnabled)
					qlElements.push(this.createMenuOption(`Auto (${currentQL}p)`, -1, true));
				else
					qlElements.push(this.createMenuOption(`Auto`, -1));
				for (const qualityLevel of qualityLevels) {
					if (addedQLs.includes(qualityLevel.height)) continue;
					addedQLs.push(qualityLevel.height);
					qlElements.push(this.createMenuOption(
						qualityLevel.height + "p",
						this.hlsjs.levels.indexOf(qualityLevel),
						qualityLevel.height === currentQL && !this.hlsjs.autoLevelEnabled)
					);
				}

				while (this.elements.menus.quality.firstElementChild)
					this.elements.menus.quality.children[0].remove();
				for (const quality of qlElements)
					this.elements.menus.quality.appendChild(quality);
				this.elements.menus.quality.parentElement.style.display = "flex"

				// audio tracks
				if (this.hlsjs.audioTracks.length > 1) {
					const atElements = [];
					for (const audioTrack of this.hlsjs.audioTracks) {
						atElements.push(this.createMenuOption(audioTrack.name, audioTrack.id, this.hlsjs.audioTrack === audioTrack.id))
					}

					while (this.elements.menus.audioTracks.firstElementChild)
						this.elements.menus.audioTracks.children[0].remove();
					for (const audioTrack of atElements)
						this.elements.menus.audioTracks.appendChild(audioTrack);
					this.elements.menus.audioTracks.parentElement.style.display = "flex"
				}

				// subtitles
				// using HTML subtitles cus i couldnt get hls.js subtitles to work :33
				const textTracks2 = Array.from(this.player.textTracks);
				console.log(textTracks2)
				if (textTracks2.length > 0) {
					let foundSubtitles = false;
					let subtitles = [];
					subtitles.push(this.createMenuOption("Off", null));
					for (const track of textTracks2) {
						const label = track.label;
						const selected = track.mode === "showing";
						if (selected) foundSubtitles = true;
						subtitles.push(this.createMenuOption(label, label, selected));
					}
					if (!foundSubtitles)
						subtitles[0].setAttribute("selected", "selected");

					while (this.elements.menus.subtitles.firstElementChild)
						this.elements.menus.subtitles.children[0].remove();
					for (const subtitle of subtitles)
						this.elements.menus.subtitles.appendChild(subtitle);

					this.elements.menus.subtitles.parentElement.style.display = "flex"
				}
				break;
			default:
				console.error(`Unknown player type: ${this.playerType}`)
				break;
		}
	}

	updateStoryboard(progress) {
		if (typeof (progress) === "boolean") {
			if (progress)
				this.elements.storyboard.container.style.display = "flex";
			else
				this.elements.storyboard.container.style.display = "none";
		} else {
			let seconds = progress * this.player.duration;
			this.elements.storyboard.text.innerText = this.timestampFromMs(seconds);

			if (progress < .5) {
				this.elements.storyboard.container.style.left = `calc(${Math.max(0, progress * 100)}% - 87.5px)`;
				this.elements.storyboard.container.style.right = "unset";
			} else {
				this.elements.storyboard.container.style.right = `calc(${Math.max(0, (1 - progress) * 100)}% - 87.5px)`;
				this.elements.storyboard.container.style.left = "unset";
			}

			// update storyboard image
			// todo: youtube L2 storyboards

			if (this.storyboardImage == null) {
				this.elements.storyboard.image.style.display = "none";
			} else {
				let x = Math.floor((progress * 10 - Math.trunc(progress * 10)) * 10);
				let y = Math.floor(progress * 10);
				this.elements.storyboard.context.drawImage(this.storyboardImage, x * 48, y * 27, 48, 27, 0, 0, this.elements.storyboard.image.width, this.elements.storyboard.image.height)
			}
		}
	}

	handleHotkey(key) {
		switch (key.toLowerCase()) {
			case " ":
			case "k":
				if (this.player.paused)
					this.player.play();
				else
					this.player.pause();
				return true;
			case "m":
				this.elements.buttons.mute.click();
				return true;
			case "j":
			case "arrowleft":
				this.player.currentTime -= 5;
				return true;
			case "l":
			case "arrowright":
				this.player.currentTime += 5;
				return true;
			case "0":
				this.player.currentTime = 0;
				return true;
			case "1":
				this.player.currentTime = this.player.duration * 0.1;
				return true;
			case "2":
				this.player.currentTime = this.player.duration * 0.2;
				return true;
			case "3":
				this.player.currentTime = this.player.duration * 0.3;
				return true;
			case "4":
				this.player.currentTime = this.player.duration * 0.4;
				return true;
			case "5":
				this.player.currentTime = this.player.duration * 0.5;
				return true;
			case "6":
				this.player.currentTime = this.player.duration * 0.6;
				return true;
			case "7":
				this.player.currentTime = this.player.duration * 0.7;
				return true;
			case "8":
				this.player.currentTime = this.player.duration * 0.8;
				return true;
			case "9":
				this.player.currentTime = this.player.duration * 0.9;
				return true;
			case "f":
				this.elements.buttons.fullscreen.click();
				return true;
			case "arrowup":
				try {
					this.player.volume += 0.1;
				} catch {
				}
				return true;
			case "arrowdown":
				try {
					this.player.volume -= 0.1;
				} catch {
				}
				return true;
		}
		return false;
	}

	inRange(time, segment) {
		return time > segment.from && time < segment.to;
	}

	buildSegments(segments, progressBars) {

		function createSegment(from, width, color) {
			const segment = document.createElement("DIV");
			segment.classList.add("ltp-progress__segment");
			segment.style.left = from + "%";
			segment.style.backgroundColor = color;
			segment.style.width = width + "%"
			return segment;
		}

		let progressBar = progressBars[0];
		for (const segment of segments) {
			let segmentElement = createSegment(segment.from, segment.to - segment.from, segment.color);
			progressBar.background.appendChild(segmentElement);
		}
	}

	checkSegments() {
		if (this.lastPosition === undefined) this.lastPosition = 0;
		if (this.checkingSegments) return; // sometimes gets called twice or something?
		this.checkingSegments = true;
		const position = (this.player.currentTime / this.player.duration) * 100;
		for (const segment of this.info.segments) {
			if (!this.inRange(this.lastPosition, segment) && this.inRange(position, segment))
				segment.onEnter(this);

			if (this.inRange(this.lastPosition, segment) && !this.inRange(position, segment))
				segment.onExit(this);
		}

		this.lastPosition = position;
		this.checkingSegments = false;
	}

	showSkipButton(text, skipTo) {
		this.elements.buttons.skip.style.display = "block";
		this.elements.buttons.skip.innerText = text;
		this.elements.buttons.skip.onclick = () => {
			this.player.currentTime = skipTo;
		}
	}

	hideSkipButton() {
		this.elements.buttons.skip.style.display = "none";
	}

	buildEndscreenElement(item, onClickHandler) {
		const container = document.createElement("DIV");
		container.classList.add("ltp-endscreen-item");
		container.classList.add("ltp-endscreen-item__" + item.style);

		const background = document.createElement("IMG");
		const textContainer = document.createElement("DIV");
		const title = document.createElement("DIV");
		const subtitle = document.createElement("DIV");

		background.classList.add("ltp-endscreen__bg")
		textContainer.classList.add("ltp-endscreen-item__text")
		title.classList.add("title")
		subtitle.classList.add("subtitle")

		background.src = item.image[0].url //todo: use the best image
		title.innerText = item.title;
		subtitle.innerText = item.metadata;

		container.style.left = (item.left * 100) + "%";
		container.style.top = (item.top * 100) + "%";
		container.style.width = (item.width * 100) + "%";
		container.style.aspectRatio = item.aspectRatio.toString();

		container.onclick = () => {
			onClickHandler(item);
		};

		textContainer.appendChild(title);
		textContainer.appendChild(subtitle);
		container.appendChild(background);
		container.appendChild(textContainer);

		this.elements.endscreenContainer.appendChild(container);
	}

	buildEndscreen() {
		this.info.endscreen.items.forEach(endScreenItem => {
			this.buildEndscreenElement(endScreenItem, this.info.endscreen.onClickHandler);
		});

		this.player.addEventListener("timeupdate", () => {
			if (this.player.currentTime >= this.info.endscreen.startMs && this.elements.endscreenContainer.style.display === "none") {
				this.elements.endscreenContainer.style.display = "block";
			} else if (this.player.currentTime <= this.info.endscreen.startMs && this.elements.endscreenContainer.style.display === "block") {
				this.elements.endscreenContainer.style.display = "none";
			}
		})
	}

	updateLoading() {
		const buffered = this.player.buffered;
		let buffering = true;

		if (buffered.length !== 0) {
			for (let i = 0; i < buffered.length; i++) {
				if (buffered.start(i) <= this.player.currentTime && this.player.currentTime <= (buffered.end(i) - 0.001)) {
					buffering = false;
				}
			}
		}

		if (this.player.currentTime >= (this.player.duration - 0.002)) buffering = false;

		this.elements.loading.style.display = buffering ? "flex" : "none";
	}
}