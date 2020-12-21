export default class XRDefaults {
    static SESSION_MODE_INLINE: XRSessionMode = "inline"
    static SESSION_MODE_AR: XRSessionMode = "immersive-ar"
    static SESSION_MODE_VR: XRSessionMode = "immersive-vr"

    static HITTEST_MODE_VIRTUAL: XrHitTestMode = "virtual"
    static HITTEST_MODE_REALWORLD: XrHitTestMode = "realworld"
    static DEFAULT_VR_XR_HITTEST_MODE: XrHitTestMode = XRDefaults.HITTEST_MODE_VIRTUAL

    static VR_INPUT_TYPE_GRIPPABLE: SessionVRInputType = "grippable"
    static VR_INPUT_TYPE_HAND: SessionVRInputType = "hand"
    // static VR_INPUT_TYPE_HYBRID: SessionVRInputType = "hybrid" // not supported by the hardware / Quest (yet?)!
    static DEFAULT_VR_INPUT_TYPE: SessionVRInputType = XRDefaults.VR_INPUT_TYPE_GRIPPABLE

    static HAND_PROFILE_BOXES: XrHandProfile = "boxes"
    static HAND_PROFILE_SPHERES: XrHandProfile = "spheres"
    static HAND_PROFILE_OCULUS: XrHandProfile = "oculus"
    static DEFAULT_HAND_PROFILE: XrHandProfile = XRDefaults.HAND_PROFILE_BOXES
}
