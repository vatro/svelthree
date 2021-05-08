/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import { EventDispatcher } from "svelthree-three"
import type { XrOptionalFeatures, XrRequiredFeatures } from "./types-svelthree"
import type { XRSession, XRSessionMode } from "./types-webxr"

export default class SplashVR {
	private button: HTMLButtonElement
	public currentSession: XRSession = null
	public dispatcher: EventDispatcher

	constructor(
		private requiredFeatures: XrRequiredFeatures[],
		private optionalFeatures: XrOptionalFeatures[],
		private domOverlay: HTMLDivElement,
		private btnClass: string,
		private sessionMode: XRSessionMode,
		private btnTxt: { [key: string]: string }
	) {
		this.dispatcher = new EventDispatcher()
	}

	public initialize(): void {
		if ("xr" in navigator) {
			this.button = document.createElement("button")

			this.button.id = "VRButton"
			this.button.style.display = "none"
			this.button.classList.add(this.btnClass)

			//@ts-ignore
			navigator.xr
				.isSessionSupported(this.sessionMode)
				.then((supported) => {
					supported ? this.showEnterVR() : this.showVRNotSupported()
				})
				.catch((error) => {
					this.showVRNotSupported()
					console.error(error)
				})

			this.domOverlay.appendChild(this.button)
		} else {
			var message = document.createElement("a")

			if (window.isSecureContext === false) {
				message.href = document.location.href.replace(/^http:/, "https:")
				message.innerHTML = this.btnTxt.notSecure ? this.btnTxt.notSecure : "WEBXR NEEDS HTTPS" // TODO  Improve message (original three.js comment)
			} else {
				message.href = "https://immersiveweb.dev/"
				message.innerHTML = this.btnTxt.noXR ? this.btnTxt.noXR : "WEBXR NOT AVAILABLE"
			}

			message.style.left = "calc(50% - 90px)"
			message.style.width = "180px"
			message.style.textDecoration = "none"
			message.classList.add(this.btnClass)

			//return message
			this.domOverlay.appendChild(message)
		}
	}

	private showVRNotSupported(): void {
		this.disableButton()

		this.button.textContent = this.btnTxt.noVR ? this.btnTxt.noVR : "VR NOT SUPPORTED"
	}

	private disableButton(): void {
		this.button.style.display = ""

		this.button.style.cursor = "auto"
		this.button.style.left = "calc(50% - 75px)"
		this.button.style.width = "150px"

		this.button.onmouseenter = null
		this.button.onmouseleave = null

		this.button.onclick = null
	}

	private showEnterVR(/*device*/): void {
		this.currentSession = null

		this.button.style.display = ""
		this.button.style.cursor = "pointer"
		this.button.style.left = "calc(50% - 50px)"
		this.button.style.width = "100px"

		this.button.textContent = this.btnTxt.start ? this.btnTxt.start : "ENTER VR"

		this.button.onmouseenter = (): void => {
			this.button.style.opacity = "1.0"
		}

		this.button.onmouseleave = (): void => {
			this.button.style.opacity = "0.5"
		}

		this.button.onclick = () => {
			if (this.currentSession === null) {

				//@ts-ignore
				navigator.xr
					.requestSession(this.sessionMode, {
						requiredFeatures: this.requiredFeatures,
						optionalFeatures: this.optionalFeatures
					})
					.then((session) => {
						// Triggers on:ready={fooReady} which sets 'bar' to 'true' and mounts / renders the VR Scene : for example {#if bar}
						// dispatch("ready", { session: currentSession })
						this.dispatcher.dispatchEvent({ type: "ready", session: session })

						//this.tryOnSessionStarted(session)
					})
			} else {
				this.currentSession.end()
			}
		}
	}

	public onSessionStarted(session: XRSession): void {
		this.currentSession = session

		// [!] Button is not visible in VR on Oculus Quest after the Session has started (only in AR on a smartphone)
		this.button.textContent = this.btnTxt.stop ? this.btnTxt.stop : "EXIT VR"
	}

	public onSessionEnded(): void {
		this.button.textContent = this.btnTxt.start ? this.btnTxt.start : "ENTER VR"
		this.currentSession = null
	}
}
