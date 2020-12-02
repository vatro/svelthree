export default class XRDefaults {
    static SESSION_MODE_INLINE: XRSessionMode = "inline"
    static SESSION_MODE_AR: XRSessionMode = "immersive-ar"
    static SESSION_MODE_VR: XRSessionMode = "immersive-vr"

    static HITTEST_MODE_VIRTUAL: XRHitTestMode = "virtual"
    static HITTEST_MODE_REALWORLD: XRHitTestMode = "realworld"
    static DEFAULT_VR_XR_HITTEST_MODE: XRHitTestMode = XRDefaults.HITTEST_MODE_VIRTUAL

    static VR_INPUT_TYPE_CONTROLLER: SessionVRInputType = "controller"
    static VR_INPUT_TYPE_HAND: SessionVRInputType = "hand"
    static DEFAULT_VR_INPUT_TYPE: SessionVRInputType = XRDefaults.VR_INPUT_TYPE_CONTROLLER

    static HAND_PROFILE_BOXES: XRHandProfile = "boxes"
    static HAND_PROFILE_SPHERES: XRHandProfile = "spheres"
    static HAND_PROFILE_OCULUS: XRHandProfile = "oculus"
    static DEFAULT_HAND_PROFILE: XRHandProfile = XRDefaults.HAND_PROFILE_BOXES
}
