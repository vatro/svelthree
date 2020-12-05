import XRControllerDefaults from "../defaults/XRControllerDefaults"
import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
import XRHandUtilsPinch from "./XRHandUtilsPinch"
import XRHandUtilsTouch from "./XRHandUtilsTouch"
import XRHandUtilsTouchX from "./XRHandUtilsTouchX"
import { XRHandModel } from "svelthree-three"

export default class XRHandUtils {
    public static addName(hand: XRHandModel, i: number): void {
        i === XRControllerDefaults.INDEX_LEFT ? (hand.name = XRControllerDefaults.HAND_NAME_LEFT) : null
        i === XRControllerDefaults.INDEX_RIGHT ? (hand.name = XRControllerDefaults.HAND_NAME_RIGHT) : null
    }

    public static addUserDataHandedness(hand: XRHandModel, i: number): void {
        i === XRControllerDefaults.INDEX_LEFT ? (hand.userData.handedness = XRControllerDefaults.HANDEDNESS_LEFT) : null
        i === XRControllerDefaults.INDEX_RIGHT
            ? (hand.userData.handedness = XRControllerDefaults.HANDEDNESS_RIGHT)
            : null
    }

    public static applyEnableTouch(hands: XRHandTouchConfigHands): XRHandEnableTouchResult {
        let result: XRHandEnableTouchResult = {
            leftHandTouchEnabled: false,
            leftHandTouchEnabledJoints: [],
            rightHandTouchEnabled: false,
            rightHandTouchEnabledJoints: []
        }

        for (let i = 0; i < hands.length; i++) {
            let item: XRHandTouchConfigHandsItem = hands[i]
            let hand: XRHandTouchEnabled = item.hand

            if (hand === XRHandTouchDefaults.ENABLED_RIGHT) {
                result.rightHandTouchEnabled = true
                if (item.index.length > 0) {
                    result.rightHandTouchEnabledJoints = result.rightHandTouchEnabledJoints.concat(item.index)
                }
            }

            if (hand === XRHandTouchDefaults.ENABLED_LEFT) {
                result.leftHandTouchEnabled = true
                if (item.index.length > 0) {
                    result.leftHandTouchEnabledJoints = result.leftHandTouchEnabledJoints.concat(item.index)
                }
            }

            if (hand === XRHandTouchDefaults.ENABLED_BOTH) {
                result.leftHandTouchEnabled = true
                result.rightHandTouchEnabled = true
                if (item.index.length > 0) {
                    result.leftHandTouchEnabledJoints = result.leftHandTouchEnabledJoints.concat(item.index)
                    result.rightHandTouchEnabledJoints = result.rightHandTouchEnabledJoints.concat(item.index)
                }
            }
        }

        return result
    }

    static PINCH: XRHandUtilsPinch = new XRHandUtilsPinch()
    static TOUCH: XRHandUtilsTouch = new XRHandUtilsTouch()
    static TOUCHX: XRHandUtilsTouchX = new XRHandUtilsTouchX()
}
