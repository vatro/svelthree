import XRControllerDefaults from "../defaults/XRControllerDefaults"
import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
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

    // event: Event --> Custom three.js Event defined inside WebXRController.js
    public static addPinchListeners(hand: XRHandModel, listener: (event: Event) => void): void {
        hand.addEventListener("pinchstart", listener)
        hand.addEventListener("pinchend", listener)
    }

    // event: Event --> Custom three.js Event defined inside WebXRController.js
    public static removePinchListeners(hand: XRHandModel, listener: (event: Event) => void): void {
        hand.removeEventListener("pinchstart", listener)
        hand.removeEventListener("pinchend", listener)
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

    public static addTouchListeners(hand: XRHandModel, listener: (event: Event) => void): void {
        hand.addEventListener("touchstart", listener)
        hand.addEventListener("touchend", listener)
    }

    public static removeTouchListeners(hand: XRHandModel, listener: (event: Event) => void): void {
        hand.removeEventListener("touchstart", listener)
        hand.removeEventListener("touchend", listener)
    }

    public static applyTouchEvents(
        leftHand: XRHandModel,
        rightHand: XRHandModel,
        touchEvents: XRHandTouchEvents,
        listener: (event: Event) => void
    ) {
        for (let i = 0; i < touchEvents.length; i++) {
            let item: XRHandTouchEventsItem = touchEvents[i]

            if (item.hand === XRHandTouchDefaults.ENABLED_LEFT) {
                leftHand.addEventListener(item.name + "start", listener)
                leftHand.addEventListener(item.name + "end", listener)
                XRHandUtils.registerTouchEvent(leftHand, item)
            }

            if (item.hand === XRHandTouchDefaults.ENABLED_RIGHT) {
                rightHand.addEventListener(item.name + "start", listener)
                rightHand.addEventListener(item.name + "end", listener)
                XRHandUtils.registerTouchEvent(rightHand, item)
            }

            if (item.hand === XRHandTouchDefaults.ENABLED_BOTH) {
                rightHand.addEventListener(item.name + "start", listener)
                rightHand.addEventListener(item.name + "end", listener)
                leftHand.addEventListener(item.name + "start", listener)
                leftHand.addEventListener(item.name + "end", listener)

                XRHandUtils.registerTouchEvent(leftHand, item)
                XRHandUtils.registerTouchEvent(rightHand, item)
            }
        }
    }

    private static registerTouchEvent(hand: XRHandModel, item: XRHandTouchEventsItem) {
        !hand.userData.touchEvent ? (hand.userData.touchEvent = {}) : null
        !hand.userData.touchEvent[item.name] ? (hand.userData.touchEvent[item.name] = {}) : null
        hand.userData.touchEvent[item.name].requiredTouchingJoints = item.index
    }

    public static unregisterHandTouchEvents(hand: XRHandModel) {
        hand.userData.touchEvent = undefined
    }

    public static applyTouchEventsX(
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
                XRHandUtils.registerTouchEventX(leftHand, touchXConfig)
            }

            if (touchXConfig.hand === XRHandTouchDefaults.ENABLED_RIGHT) {
                rightHand.addEventListener(touchXConfig.name + "start", listener)
                rightHand.addEventListener(touchXConfig.name + "end", listener)
                XRHandUtils.registerTouchEventX(rightHand, touchXConfig)
            }

            if (touchXConfig.hand === XRHandTouchDefaults.ENABLED_BOTH) {
                rightHand.addEventListener(touchXConfig.name + "start", listener)
                rightHand.addEventListener(touchXConfig.name + "end", listener)
                leftHand.addEventListener(touchXConfig.name + "start", listener)
                leftHand.addEventListener(touchXConfig.name + "end", listener)

                XRHandUtils.registerTouchEventX(leftHand, touchXConfig)
                XRHandUtils.registerTouchEventX(rightHand, touchXConfig)
            }
        }
    }

    private static registerTouchEventX(hand: XRHandModel, touchXConfig: XRHandTouchXConfigItem) {
        !hand.userData.touchEventX ? (hand.userData.touchEventX = {}) : null
        !hand.userData.touchEventX[touchXConfig.name] ? (hand.userData.touchEventX[touchXConfig.name] = {}) : null
        hand.userData.touchEventX[touchXConfig.name].requiredJoints = touchXConfig.indexPairs
        hand.userData.touchEventX[touchXConfig.name].distance = touchXConfig.distance
        hand.userData.touchEventX[touchXConfig.name].touchtime = touchXConfig.touchtime
    }

    public static unregisterHandTouchEventsX(hand: XRHandModel) {
        hand.userData.touchEventX = undefined
    }
}
