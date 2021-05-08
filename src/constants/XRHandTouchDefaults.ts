import type { XrHandEnabled, XrHandTouchConfigHands, XrHandTouchTestMode } from "../xr/types-svelthree"
import XRHandJointIndices from "./XRHandJointIndices"

export default class XRHandTouchDefaults {
	static ENABLED_LEFT: XrHandEnabled = "left"
	static ENABLED_RIGHT: XrHandEnabled = "right"
	static ENABLED_BOTH: XrHandEnabled = "both"

	static TOUCH_TEST_MODE_RAY: XrHandTouchTestMode = "ray"
	static TOUCH_TEST_MODE_SPHERE: XrHandTouchTestMode = "sphere"

	// Lower values result in smoother direction change (less fidgeting) at cost of accuracy
	static LERP_FACTOR = 0.5 // 0-1

	static TOUCH_DISTANCE = 0.008

	// 2000: no "untouch" intersection at very fast exits
	// 3000: ?
	static SPEEDFAC_JOINTSPEED_MULTIPLIER = 2500

	static SPEEDFAC_LIMIT_LOW = 2
	static SPEEDFAC_LIMIT_HIGH: number = undefined // TODO 10?

	static MODE_SPHERE_RADIUS = XRHandTouchDefaults.TOUCH_DISTANCE

	// VISUAL DEBUGGER DEFAULTS

	// Touch types dispatching events
	static DBG_FACE_TOUCH_COL = 0x00ff00
	static DBG_FACE_UNTOUCH_COL = 0x0000ff
	static DBG_FACE_TOUCHTHROUGH_ENTER_COL = 0xffff00
	static DBG_FACE_TOUCHTHROUGH_EXIT_COL = 0xff00ff
	static DBG_FACE_SCRATCH_COL = 0xc7c7c7

	// Touch types NOT dispatching events
	static DBG_GHOST_TOUCH_COL = 0x000000 // black / 100% black
	static DBG_CANCELED_TOUCH_COL = 0x808080 // grey / 50% black

	static DBG_JOINT_NORMAL_COL = 0x4299e1
	static DBG_JOINT_TOUCH_COL = 0x00ff00

	static DBG_RAY_TENTACLE_BASE_COL = 0x4299e1
	static DBG_RAY_TENTACLE_TOUCH_COL = 0xff0000
	static DBG_RAY_TENTACLE_NRAY_COL = 0xffff00
	static DBG_RAY_TENTACLE_TOCHING_COL = 0xffff00
	static DBG_RAY_TENTACLE_TESTRAY_COL = 0xff00bf
	static DBG_RAY_TENTACLE_WIDTH_STD = 2
	static DBG_RAY_TENTACLE_WIDTH_TESTRAY = 1

	static DBG_RAY_TENTACLE_DIRSCALE = 0.02
	static DBG_RAY_TENTACLE_TOUCHINGRAY_SCALE = XRHandTouchDefaults.DBG_RAY_TENTACLE_DIRSCALE * 3

	static DBG_SPHERE_NAME = "debuggerSphere"
	static DBG_SPHERE_SEG_W = 16
	static DBG_SPHERE_SEG_H = 16
	static DBG_SPHERE_TOUCHED_COL = 0x00ff00
	static DBG_SPHERE_UNTOUCH_COL = 0xff0000
	static DBG_SPHERE_MAT_COL = 0x00ff00
	static DBG_SPHERE_MAT_TRANSP = true
	static DBG_SPHERE_MAT_OPACITY = 0.3

	static DBG_SPHERE_DEFAULT_MAT_CONFIG = {
		color: XRHandTouchDefaults.DBG_SPHERE_MAT_COL,
		transparent: XRHandTouchDefaults.DBG_SPHERE_MAT_TRANSP,
		opacity: XRHandTouchDefaults.DBG_SPHERE_MAT_OPACITY
	}

	static ENABLETOUCH_HANDS_DEFAULT: XrHandTouchConfigHands = [
		{ hand: XRHandTouchDefaults.ENABLED_BOTH, index: XRHandJointIndices.ALL }
	]
}
