import type { XrGrippableEnabled } from "../xr/types-svelthree"
import type { XRHandedness } from "../xr/types-webxr"

export default class XRControllerDefaults {
	/**
	 * WHY?  Somehow the indices of left/right controllers/hands are switched now
	 * There have been several Oculus Quest updates, so I aussumed it's related to them,
	 * yet I couldn't find any informations on this.
	 * TODO  Look at the code and try to figure out if it's maybe svelthree's fault,
	 * if something has changed during the refactoring of XRHandTouch.
	 */
	static INDEX_LEFT: number = 0 // was 0
	static INDEX_RIGHT: number = 1

	static ENABLED_LEFT: XrGrippableEnabled = "left"
	static ENABLED_RIGHT: XrGrippableEnabled = "right"
	static ENABLED_BOTH: XrGrippableEnabled = "both"

	static MAX_CONTROLLERS: number = 2

	static HANDEDNESS_LEFT: XRHandedness = "left"
	static HANDEDNESS_RIGHT: XRHandedness = "right"
	static CONTROLLER_NAME_LEFT = "LEFT CONTROLLER"
	static CONTROLLER_NAME_RIGHT = "RIGHT CONTROLLER"
	static HAND_NAME_LEFT = "LEFT HAND"
	static HAND_NAME_RIGHT = "RIGHT HAND"
}
