import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
import { XRHandModel } from "svelthree-three"

export default class XRHandUtilsTouchX {
    public applyEventsX(
        leftHand: XRHandModel,
        rightHand: XRHandModel,
        touchXConfigs: XRHandTouchXConfig,
        listener: (event: Event) => void
    ) {
        for (let i = 0; i < touchXConfigs.length; i++) {
            let touchXConfig: XRHandTouchXConfigItem = touchXConfigs[i]

            if (touchXConfig.hand === XRHandTouchDefaults.ENABLED_LEFT) {
                leftHand.addEventListener(touchXConfig.name + "start", listener)
                leftHand.addEventListener(touchXConfig.name + "end", listener)
                this.registerEventX(leftHand, touchXConfig)
            }

            if (touchXConfig.hand === XRHandTouchDefaults.ENABLED_RIGHT) {
                rightHand.addEventListener(touchXConfig.name + "start", listener)
                rightHand.addEventListener(touchXConfig.name + "end", listener)
                this.registerEventX(rightHand, touchXConfig)
            }

            if (touchXConfig.hand === XRHandTouchDefaults.ENABLED_BOTH) {
                rightHand.addEventListener(touchXConfig.name + "start", listener)
                rightHand.addEventListener(touchXConfig.name + "end", listener)
                leftHand.addEventListener(touchXConfig.name + "start", listener)
                leftHand.addEventListener(touchXConfig.name + "end", listener)

                this.registerEventX(leftHand, touchXConfig)
                this.registerEventX(rightHand, touchXConfig)
            }
        }
    }

    private registerEventX(hand: XRHandModel, touchXConfig: XRHandTouchXConfigItem) {
        !hand.userData.touchEventX ? (hand.userData.touchEventX = {}) : null
        !hand.userData.touchEventX[touchXConfig.name] ? (hand.userData.touchEventX[touchXConfig.name] = {}) : null
        hand.userData.touchEventX[touchXConfig.name].requiredJoints = touchXConfig.indexPairs
        hand.userData.touchEventX[touchXConfig.name].distance = touchXConfig.distance
        hand.userData.touchEventX[touchXConfig.name].touchtime = touchXConfig.touchtime
    }

    public unregisterEventsX(hand: XRHandModel) {
        hand.userData.touchEventX = undefined
    }
}
