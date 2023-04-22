class Player {
	constructor(query, info, playerType = "html5") {
		this.player = document.querySelector(query);
		this.info = info;
		this.playerType = playerType;
		if (!info) throw new Error("info must be provided while constructing a new Player instance!");
		if (!info.chapters || info.chapters.length == 0) {
			info.chapters = [{
				from: 0,
				to: 100,
				name: ""
			}]
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
			chapters: info.chapters
		});

		this.player.parentElement.insertBefore(this.root, this.player);
		this.root.insertBefore(this.player, this.root.firstElementChild);

		this.assignEvents();
		this.updateButtons();
		this.updateSelects();
	}

	buildPlayerElement(model) {
		const progressBars = [];

		const container = document.createElement("DIV");
		container.setAttribute("class", "ltp-root");

		const element1 = document.createElement("DIV");
		element1.setAttribute("class", "ltp-gradient-top");
		container.appendChild(element1);

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

		container.appendChild(element4);

		const element5 = document.createElement("DIV");
		element5.setAttribute("class", "ltp-controls");

		const buttonPlay = document.createElement("DIV");
		buttonPlay.setAttribute("class", "ltp-controls-button");
		buttonPlay.innerHTML = model.playButtonHtml;
		element5.appendChild(buttonPlay);

		const buttonPause = document.createElement("DIV");
		buttonPause.setAttribute("class", "ltp-controls-button");
		buttonPause.innerHTML = model.pauseButtonHtml;
		element5.appendChild(buttonPause);

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

		const buttonMinimize = document.createElement("DIV");
		buttonMinimize.setAttribute("class", "ltp-controls-button");
		buttonMinimize.innerHTML = model.minimizeButtonHtml;
		element5.appendChild(buttonMinimize);
		container.appendChild(element5);

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

		menuitemQuality.style.display = "none";
		menuitemSubtitles.style.display = "none";
		menuitemAudioTracks.style.display = "none";
		menu.style.display = "none";

		this.elements = {
			authorIcon,
			videoTitle,
			timestamp,
			volumeBar,
			progressBarSections: progressBars,
			buttons: {
				play: buttonPlay,
				pause: buttonPause,
				mute: buttonMute,
				settings: buttonSettings,
				fullscreen: buttonFullscreen,
				minimize: buttonMinimize
			},
			menus: {
				menu: menu,
				speed: menuitemSpeedSelect,
				quality: menuitemQualitySelect,
				subtitles: menuitemSubtitlesSelect,
				audioTracks: menuitemAudioTracksSelect
			}
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
			this.player.play();
		}
		this.elements.buttons.pause.onclick = () => {
			this.player.pause();
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

		this.elements.buttons.mute.onclick = () => {
			this.player.muted = !this.player.muted;
			this.updateButtons();
		}

		this.elements.buttons.fullscreen.onclick = () => {
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
		this.elements.buttons.minimize.onclick = () => {
			document.exitFullscreen()
				.then(() => {
					this.updateButtons();
				})
				.catch(() => {
					this.updateButtons();
				});
		}

		this.player.ontimeupdate = () => {
			this.resizeProgressBar("played", (this.player.currentTime / this.player.duration) * 100)
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
		}

		this.elements.volumeBar.parentElement.parentElement.onclick = event => {
			this.player.volume = this.percentageFromMouseOverEvent(event, this.elements.volumeBar.parentElement)
		}

		this.elements.progressBarSections[0].background.parentElement.onclick = event => {
			this.player.currentTime = this.percentageFromMouseOverEvent(event, this.elements.progressBarSections[0].background.parentElement) * this.player.duration
		}

		this.elements.buttons.settings.onclick = () => {
			if (this.elements.menus.menu.style.display === "none")
				this.elements.menus.menu.style.display = "flex";
			else
				this.elements.menus.menu.style.display = "none";
		}

		this.elements.menus.speed.onchange = () => {
			this.player.playbackRate = parseFloat(this.elements.menus.speed.value);
		}

		setInterval(() => {
			if (this.player.buffered.length > 0)
				this.resizeProgressBar("buffered", (this.player.buffered.end(this.player.buffered.length - 1) / this.player.duration) * 100, true)
			this.elements.timestamp.innerText = `${this.timestampFromMs(this.player.currentTime)} / ${this.timestampFromMs(this.player.duration)}`;
		}, 100);
	}

	updateButtons() {
		if (this.player.paused) {
			this.elements.buttons.pause.style.display = "none"
			this.elements.buttons.play.style.display = "flex"
		} else {
			this.elements.buttons.play.style.display = "none"
			this.elements.buttons.pause.style.display = "flex"
		}
		if (window.fullScreen) {
			this.elements.buttons.fullscreen.style.display = "none"
			this.elements.buttons.minimize.style.display = "flex"
		} else {
			this.elements.buttons.minimize.style.display = "none"
			this.elements.buttons.fullscreen.style.display = "flex"
		}
	}

	percentageFromMouseOverEvent(event, element) {
		if (!element) element = event.target;
		return this.remapNumber(event.clientX, element.getBoundingClientRect().left, element.getBoundingClientRect().left + element.clientWidth - 1, 0, 1)
	}

	timestampFromMs(ms) {
		let seconds = ms;
		const hours = Math.round(seconds / 3600);
		seconds = seconds % 3600;
		const minutes = Math.round(seconds / 60).toString().padStart(2, "0");
		seconds = Math.round(seconds % 60).toString().padStart(2, "0");
		return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
	}

	resizeProgressBar(barName, percentage, log = false) {
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
		return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	}

	updateSelects() {
		switch (this.playerType) {
			case "html5":
				const elements = Array.from(this.player.children);
				const videoTracks = elements.filter(x => x.tagName === "SOURCE");
				const textTracks = elements.filter(x => x.tagName === "TRACK"
					&& x.getAttribute("kind").toLowerCase() === "captions");

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
						const label = track.getAttribute("label") ?? track.getAttribute("srclang");
						const src = track.getAttribute("src");
						const selected = track.getAttribute("default") === "default";
						if (selected) foundSubtitles = true;
						subtitles.push(this.createMenuOption(label, src, selected));
					}
					if (!foundSubtitles)
						subtitles[0].setAttribute("selected", "selected");

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
}