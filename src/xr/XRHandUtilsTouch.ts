/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { Group, Raycaster, Scene } from "three"
import { XRHandTouchDefaults } from "./constants"
import type { XrHandEnabled, XrHandTouchDebugParams, XrHandTouchEvents, XrHandTouchEventsItem, XrTouchUpdateParams } from "./types-svelthree"
import type XRHandTouchRayExt from "./XRHandTouchRayExt"
import type XRHandTouchSphereExt from "./XRHandTouchSphereExt"

export default class XRHandUtilsTouch {
	// Events

	public addListeners(handSpace: Group, listener: (event: THREE.Event) => void): void {
		handSpace.addEventListener("touchstart", listener)
		handSpace.addEventListener("touchend", listener)
	}

	public removeListeners(handSpace: Group, listener: (event: THREE.Event) => void): void {
		handSpace.removeEventListener("touchstart", listener)
		handSpace.removeEventListener("touchend", listener)
	}

	public applyEvents(
		leftHand: Group,
		rightHand: Group,
		touchEvents: XrHandTouchEvents,
		listener: (event: THREE.Event) => void
	) {
		for (let i = 0; i < touchEvents.length; i++) {
			let item: XrHandTouchEventsItem = touchEvents[i]
			let hand: XrHandEnabled = item.hand

			if (hand === XRHandTouchDefaults.ENABLED_LEFT) {
				leftHand.addEventListener(item.name + "start", listener)
				leftHand.addEventListener(item.name + "end", listener)
				this.registerEvent(leftHand, item)
			}

			if (hand === XRHandTouchDefaults.ENABLED_RIGHT) {
				rightHand.addEventListener(item.name + "start", listener)
				rightHand.addEventListener(item.name + "end", listener)
				this.registerEvent(rightHand, item)
			}

			if (hand === XRHandTouchDefaults.ENABLED_BOTH) {
				rightHand.addEventListener(item.name + "start", listener)
				rightHand.addEventListener(item.name + "end", listener)
				leftHand.addEventListener(item.name + "start", listener)
				leftHand.addEventListener(item.name + "end", listener)

				this.registerEvent(leftHand, item)
				this.registerEvent(rightHand, item)
			}
		}
	}

	private registerEvent(handSpace: Group, item: XrHandTouchEventsItem) {
		!handSpace.userData.touchEvent ? (handSpace.userData.touchEvent = {}) : null
		!handSpace.userData.touchEvent[item.name] ? (handSpace.userData.touchEvent[item.name] = {}) : null
		handSpace.userData.touchEvent[item.name].requiredTouchingJoints = item.index
	}

	public unregisterEvents(handSpace: Group) {
		handSpace.userData.touchEvent = undefined
	}

	// Updating

	public updateXRHandTouch(
		currentScene: Scene,
		raycaster: Raycaster,
		//handProfile: XrHandProfile,
		leftHand: Group,
		rightHand: Group,
		xrHandTouch: XRHandTouchRayExt | XRHandTouchSphereExt,
		xrFrameDelta: number,
		useBVH: boolean,
		debug: XrHandTouchDebugParams
	): void {
		//console.log("updateXRHandTouch!")

		// TODO  Impmlement better performance meassuring (decorators) + meassure again for both modes
		//console.time("updateXRHandTouch updates")
		// 0.01x ms - very low
		xrHandTouch.updateToTest(currentScene)
		xrHandTouch.updateBVH(useBVH)

		if (debug) {
			xrHandTouch.updateDebug(debug.enabled)

			if (debug.enabled && !xrHandTouch.debuggerInitiated) {
				xrHandTouch.setDebugger(debug)
			}
		}
		//console.timeEnd("updateXRHandTouch updates")

		//console.time("updateXRTouchRay update params")
		// 0.007 ms - almost nothing!

		//console.timeEnd("updateXRHandTouch update params")

		// TODO  Impmlement better performance meassuring (decorators) + meassure again for both modes and one/two hands
		//console.time("updateXRHandTouch hands update")
		// 0.09 - 0.4 (TOUCH AND TOUCH INSIDE) - 1.74 ms (FAST TOUCH CHECK)
		if (leftHand && leftHand.userData.touchEnabled === true) {
			let params: XrTouchUpdateParams = {
				handProfile: leftHand.userData.handProfile,
				raycaster: raycaster,
				xrFrameDelta: xrFrameDelta
			}
			//console.log("updateXRTouchRay left!")
			xrHandTouch.update(leftHand, params)
		}

		if (rightHand && rightHand.userData.touchEnabled === true) {
			//console.log("updateXRTouchRay right!")
			let params: XrTouchUpdateParams = {
				handProfile: rightHand.userData.handProfile,
				raycaster: raycaster,
				xrFrameDelta: xrFrameDelta
			}
			xrHandTouch.update(rightHand, params)
		}
		//console.timeEnd("updateXRTouchRay hands update")
	}
}
