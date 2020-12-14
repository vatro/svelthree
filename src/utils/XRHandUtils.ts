import XRControllerDefaults from "../defaults/XRControllerDefaults"
import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
import XRHandUtilsPinch from "./XRHandUtilsPinch"
import XRHandUtilsTouch from "./XRHandUtilsTouch"
import XRHandUtilsTouchX from "./XRHandUtilsTouchX"

export default class XRHandUtils {
    public static addName(handSpace: Group): void {
        let handInputSource: XRInputSource = handSpace.userData.xrInputSource
        handInputSource.handedness === XRControllerDefaults.HANDEDNESS_LEFT
            ? (handSpace.name = XRControllerDefaults.HAND_NAME_LEFT)
            : null
        handInputSource.handedness === XRControllerDefaults.HANDEDNESS_RIGHT
            ? (handSpace.name = XRControllerDefaults.HAND_NAME_LEFT)
            : null
    }

    public static addUserDataHandedness(handSpace: Group): void {
        let handInputSource: XRInputSource = handSpace.userData.xrInputSource
        handSpace.userData.handedness = handInputSource.handedness
    }

    public static applyEnablePinch(enablePinch: XRHandPinchConfig): XRHandEnablePinchResult {
        let result: XRHandEnablePinchResult = {
            leftHandPinchEnabled: false,
            leftHandPinchConfig: undefined,
            rightHandPinchEnabled: false,
            rightHandPinchConfig: undefined
        }

        for (let i = 0; i < enablePinch.length; i++) {
            let item: XRHandPinchConfigItem = enablePinch[i]

            if (item.hand === XRHandTouchDefaults.ENABLED_LEFT) {
                result.leftHandPinchConfig = item
                result.leftHandPinchEnabled = true
            }
            if (item.hand === XRHandTouchDefaults.ENABLED_RIGHT) {
                result.rightHandPinchConfig = item
                result.rightHandPinchEnabled = true
            }

            if (item.hand === XRHandTouchDefaults.ENABLED_BOTH) {
                /* We have to clone the materials here, otherwise ray color change
                of one hand will also affect the ray color of the other hand */

                result.leftHandPinchConfig = { ...item }
                result.rightHandPinchConfig = { ...item }

                if (item.materials) {
                    result.leftHandPinchConfig.materials = {}
                    result.rightHandPinchConfig.materials = {}

                    if (item.materials.remote) {
                        result.leftHandPinchConfig.materials.remote = item.materials.remote.clone()
                        result.rightHandPinchConfig.materials.remote = item.materials.remote.clone()
                    }

                    if (item.materials.touch) {
                        result.leftHandPinchConfig.materials.touch = item.materials.touch.clone()
                        result.rightHandPinchConfig.materials.touch = item.materials.touch.clone()
                    }
                }

                result.leftHandPinchEnabled = true
                result.rightHandPinchEnabled = true
            }
        }

        return result
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

    public static getInputConfigGrippable(inputConfig: SessionVRInputConfig): XRInputConfigGrippable {
        for (let i = 0; i < inputConfig.length; i++) {
            let c = inputConfig[i]
            if (c.type === "grippable") {
                return c.config as XRInputConfigGrippable
            }
        }

        return null
    }

    public static getInputConfigHand(inputConfig: SessionVRInputConfig): XRInputConfigHand {
        for (let i = 0; i < inputConfig.length; i++) {
            let c = inputConfig[i]
            if (c.type === "hand") {
                return c.config as XRInputConfigHand
            }
        }

        return null
    }

    public static applyHandConfig(
        inputConfigHand: XRInputConfigHand,
        handedness: XRHandedness,
        handSpace: Group
    ): boolean {
        for (let i = 0; i < inputConfigHand.length; i++) {
            if (inputConfigHand[i].hand === handedness) {
                handSpace.userData.handProfile = inputConfigHand[i].handProfile
                handSpace.userData.pathToHandModels = inputConfigHand[i].pathToHandModels
                return true
            } else if (inputConfigHand[i].hand === XRHandTouchDefaults.ENABLED_BOTH) {
                handSpace.userData.handProfile = inputConfigHand[i].handProfile
                handSpace.userData.pathToHandModels = inputConfigHand[i].pathToHandModels
                return true
            }
        }

        return false
    }

    static PINCH: XRHandUtilsPinch = new XRHandUtilsPinch()
    static TOUCH: XRHandUtilsTouch = new XRHandUtilsTouch()
    static TOUCHX: XRHandUtilsTouchX = new XRHandUtilsTouchX()
}
