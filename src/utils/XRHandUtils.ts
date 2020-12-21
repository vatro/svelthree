import { Group, WebXRController, WebXRManager, XRHandModel, XRHandModelFactory } from "svelthree-three"
import XRControllerDefaults from "../defaults/XRControllerDefaults"
import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
import XRHandUtilsPinch from "./XRHandUtilsPinch"
import XRHandUtilsTouch from "./XRHandUtilsTouch"
import XRHandUtilsTouchX from "./XRHandUtilsTouchX"

export default class XRHandUtils {
    public static addName(handSpace: Group): void {
        const handInputSource: XRInputSource = handSpace.userData.xrInputSource
        handInputSource.handedness === XRControllerDefaults.HANDEDNESS_LEFT
            ? (handSpace.name = XRControllerDefaults.HAND_NAME_LEFT)
            : null
        handInputSource.handedness === XRControllerDefaults.HANDEDNESS_RIGHT
            ? (handSpace.name = XRControllerDefaults.HAND_NAME_LEFT)
            : null
    }

    public static addUserDataHandedness(handSpace: Group): void {
        const handInputSource: XRInputSource = handSpace.userData.xrInputSource
        handSpace.userData.handedness = handInputSource.handedness
    }

    public static applyEnablePinch(enablePinch: XrHandPinchConfig): XrHandEnablePinchResult {
        const result: XrHandEnablePinchResult = {
            leftHandPinchEnabled: false,
            leftHandPinchConfig: undefined,
            rightHandPinchEnabled: false,
            rightHandPinchConfig: undefined
        }

        for (let i = 0; i < enablePinch.length; i++) {
            const item: XrHandPinchConfigItem = enablePinch[i]

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

    public static applyEnableTouch(hands: XrHandTouchConfigHands): XrHandEnableTouchResult {
        const result: XrHandEnableTouchResult = {
            leftHandTouchEnabled: false,
            leftHandTouchEnabledJoints: [],
            rightHandTouchEnabled: false,
            rightHandTouchEnabledJoints: []
        }

        for (let i = 0; i < hands.length; i++) {
            const item: XrHandTouchConfigHandsItem = hands[i]
            const hand: XrHandTouchEnabled = item.hand

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

    public static getInputConfigHand(inputConfig: SessionVRInputConfig): XrInputConfigHand {
        for (let i = 0; i < inputConfig.length; i++) {
            const c = inputConfig[i]
            if (c.type === "hand") {
                return c.config as XrInputConfigHand
            }
        }

        return null
    }

    public static applyHandConfig(
        inputConfigHand: XrInputConfigHand,
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

        console.warn(
            "SVELTHREE > SessionVR > XRHandUtils > applyHandConfig : Failed! No applicable hand configuration was found! ",
            inputConfigHand
        )
        return false
    }

    public static getHandSpaceByHandedness(manager: WebXRManager, handedness: XRHandedness): Group {
        for (let i = 0; i < manager.getControllers().length; i++) {
            const controller: WebXRController = manager.getControllers()[i]

            // let gripSpaceAvailable:boolean = controller['_grip'] ? true : false
            // let targetRayAvailable:boolean = controller['_targetRay'] ? true : false

            // we can get handSpace directly from controller in order to prevent using manager.getHand(i), which will create a new handSpace, but we may not want that.
            let handSpaceAvailable: boolean = controller["_hand"] ? true : false

            if (handSpaceAvailable) {
                const handSpace: Group = manager.getHand(i)

                /**
                 * If 'inputSource' is null it means Hand was not connected yet, or it shouldn't be available
                 * @see SessionVR.onConnectedHandSpace
                 */
                const inputSource: XRInputSource = handSpace.userData.xrInputSource || null

                if (inputSource && inputSource.handedness === handedness) {
                    return handSpace
                }
            }
        }

        return null
    }

    public static addXRHandModelCheck(handSpace: Group): boolean {
        const existingHandModels: XRHandModel[] = XRHandUtils.getAllHandModelsInside(handSpace)

        if (existingHandModels.length === 0) {
            return true
        } else {
            if (existingHandModels.length === 1) {
                console.warn(
                    "SVELTHREE > SessionVR > XRHandUtils > addXRHandModelCheck : XRHandModel is already existing inside handSpace! ",
                    handSpace,
                    existingHandModels
                )
            }

            if (existingHandModels.length > 1) {
                // This shouldn't happen -->  TODO  Is there a scenario where we want to use more than one hand model?
                console.error(
                    "SVELTHREE > SessionVR > XRHandUtils > addXRHandModelCheck : There are more than one XRHandModel inside handSpace! ",
                    handSpace,
                    existingHandModels
                )
            }
        }

        return false
    }

    public static getAllHandModelsInside(handSpace: Group): XRHandModel[] {
        const handModels: XRHandModel[] = []

        for (let i = 0; i < handSpace.children.length; i++) {
            let child: any = handSpace.children[i]

            if (child instanceof XRHandModel) {
                handModels.push(child as XRHandModel)
            }
        }

        return handModels
    }

    public static addNewXRHandModelToSpace(handSpace: Group): XRHandModel {
        console.warn("SVELTHREE > SessionVR > XRHandUtils > addNewXRHandModelToSpace!", handSpace)

        const handModelFactory: XRHandModelFactory = new XRHandModelFactory().setPath(
            handSpace.userData.pathToHandModels
        )

        const handModel = handModelFactory.createHandModel(handSpace, handSpace.userData.handProfile, null)

        handSpace.add(handModel)

        return handModel
    }

    public static removeAllExistingXRHandModelsFromSpace(handSpace: Group): void {
        const existingHandModels: XRHandModel[] = XRHandUtils.getAllHandModelsInside(handSpace)

        if (existingHandModels.length > 0) {
            console.warn(
                "SVELTHREE > SessionVR > XRHandUtils > removeAllExistingXRHandModelsFromSpace : Removing all existing XRHandModel inside handSpace! ",
                handSpace,
                existingHandModels
            )

            for (let i = existingHandModels.length - 1; i >= 0; i--) {
                handSpace.remove(existingHandModels[i])
            }
        }
    }

    static PINCH: XRHandUtilsPinch = new XRHandUtilsPinch()
    static TOUCH: XRHandUtilsTouch = new XRHandUtilsTouch()
    static TOUCHX: XRHandUtilsTouchX = new XRHandUtilsTouchX()
}
