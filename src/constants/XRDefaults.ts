import type { XrHandProfile, XrHitTestMode, XrSessionVRInputType } from "../xr/types-svelthree"
import type { XRSessionMode } from "../xr/types-webxr"

export default class XRDefaults {
	static SESSION_MODE_INLINE: XRSessionMode = "inline"
	static SESSION_MODE_AR: XRSessionMode = "immersive-ar"
	static SESSION_MODE_VR: XRSessionMode = "immersive-vr"

	static HITTEST_MODE_VIRTUAL: XrHitTestMode = "virtual"
	static HITTEST_MODE_REALWORLD: XrHitTestMode = "realworld"
	static DEFAULT_VR_XR_HITTEST_MODE: XrHitTestMode = XRDefaults.HITTEST_MODE_VIRTUAL

	static VR_INPUT_TYPE_GRIPPABLE: XrSessionVRInputType = "grippable"
	static VR_INPUT_TYPE_HAND: XrSessionVRInputType = "hand"
	// static VR_INPUT_TYPE_HYBRID: SessionVRInputType = "hybrid" // not supported by the hardware / Quest (yet?)!
	static DEFAULT_VR_INPUT_TYPE: XrSessionVRInputType = XRDefaults.VR_INPUT_TYPE_GRIPPABLE

	static HAND_PROFILE_BOXES: XrHandProfile = "boxes"
	static HAND_PROFILE_SPHERES: XrHandProfile = "spheres"
	static HAND_PROFILE_OCULUS: XrHandProfile = "oculus"
	static DEFAULT_HAND_PROFILE: XrHandProfile = XRDefaults.HAND_PROFILE_BOXES

	static some_text = "some text"
}
