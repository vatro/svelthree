/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { Group } from "three"
import { XRHandTouchDefaults } from "./constants"
import type { XrHandTouchEnabled, XrHandTouchXConfig, XrHandTouchXConfigItem } from "./types-svelthree"

export default class XRHandUtilsTouchX {
	public applyEventsX(
		leftHand: Group,
		rightHand: Group,
		touchXConfigs: XrHandTouchXConfig,
		listener: (event: THREE.Event) => void
	) {
		for (let i = 0; i < touchXConfigs.length; i++) {
			let touchXConfig: XrHandTouchXConfigItem = touchXConfigs[i]
			let hand: XrHandTouchEnabled = touchXConfig.hand

			if (hand === XRHandTouchDefaults.ENABLED_LEFT) {
				leftHand.addEventListener(touchXConfig.name + "start", listener)
				leftHand.addEventListener(touchXConfig.name + "end", listener)
				this.registerEventX(leftHand, touchXConfig)
			}

			if (hand === XRHandTouchDefaults.ENABLED_RIGHT) {
				rightHand.addEventListener(touchXConfig.name + "start", listener)
				rightHand.addEventListener(touchXConfig.name + "end", listener)
				this.registerEventX(rightHand, touchXConfig)
			}

			if (hand === XRHandTouchDefaults.ENABLED_BOTH) {
				rightHand.addEventListener(touchXConfig.name + "start", listener)
				rightHand.addEventListener(touchXConfig.name + "end", listener)
				leftHand.addEventListener(touchXConfig.name + "start", listener)
				leftHand.addEventListener(touchXConfig.name + "end", listener)

				this.registerEventX(leftHand, touchXConfig)
				this.registerEventX(rightHand, touchXConfig)
			}
		}
	}

	private registerEventX(handSpace: Group, touchXConfig: XrHandTouchXConfigItem) {
		!handSpace.userData.touchEventX ? (handSpace.userData.touchEventX = {}) : null
		!handSpace.userData.touchEventX[touchXConfig.name]
			? (handSpace.userData.touchEventX[touchXConfig.name] = {})
			: null
		handSpace.userData.touchEventX[touchXConfig.name].requiredJoints = touchXConfig.indexPairs
		handSpace.userData.touchEventX[touchXConfig.name].distance = touchXConfig.distance
		handSpace.userData.touchEventX[touchXConfig.name].touchtime = touchXConfig.touchtime
	}

	public unregisterEventsX(handSpace: Group) {
		handSpace.userData.touchEventX = undefined
	}
}
