//type XRHandTouchRayExt = import("./XRHandTouchRayExt").default
//type XRHandTouchSphereExt = import("./XRHandTouchSphereExt").default

import type { XRHandedness, XRInputSource, XRReferenceSpaceType } from "./types-webxr"

import type XRHandTouchRayExt from "./XRHandTouchRayExt"
import type XRHandTouchSphereExt from "./XRHandTouchSphereExt"

export type XrRequiredFeatures = XRReferenceSpaceType | "hand-tracking" | "hit-test"
export type XrOptionalFeatures = XrRequiredFeatures

export type XrHitTestMode = "realworld" | "virtual"

export type XrSessionVRInputType = "grippable" | "hand"

// Ehm! "hybrid" is not possible 😬 simultaneous usage of hand-tracking and grippable is not supported by the Quest (yet?)
//export type SessionVRInputType = "grippable" | "hand" | "hybrid"

// VR

// VR SESSION - Configuration

export interface XrSessionVRInputConfigItem {
	type: XrSessionVRInputType
	config: XrInputConfigGrippable | XrInputConfigHand
}

export interface XrSessionVRInputConfig extends Array<XrSessionVRInputConfigItem> {}

export type XrHandProfile = "boxes" | "spheres" | "oculus"
export type XrHandTouchEnabled = "left" | "right" | "both"
export type XrHandEnabled = XrHandTouchEnabled

export interface XrHandTouchConfigHandsItem {
	hand: XrHandTouchEnabled
	index: number[]
}

export interface XrHandTouchConfigHands extends Array<XrHandTouchConfigHandsItem> {}

/* --------- VR PINCH -------- */

// VR PINCH - Configuration

export type XrHandPinchMode = "remote" | "touch" | "hybrid"

export interface XrHandPinchConfigItem {
	hand: XrHandTouchEnabled
	mode: XrHandPinchMode
	distance?: {
		remote?: number
		touch?: number
	}
	materials?: {
		remote?: XrHandPinchRayMaterial
		touch?: XrHandPinchRayMaterial
	}
	colors?: {
		remote?: number
		remoteHit?: number
		touch?: number
		touchHit?: number
	}
}

export interface XrHandPinchConfig extends Array<XrHandPinchConfigItem> {}

export interface XrHandEnablePinchResult {
	leftHandPinchEnabled: boolean
	leftHandPinchConfig: XrHandPinchConfigItem
	rightHandPinchEnabled: boolean
	rightHandPinchConfig: XrHandPinchConfigItem
}

// VR PINCH - Debugger

export type XrHandPinchRayMaterial = THREE.LineDashedMaterial | THREE.LineBasicMaterial

/*
--------- VR TOUCH (HANDS) ----------
*/

// HAND INPUT CONFIG

export interface XrInputConfigHandItem {
	hand: XrHandEnabled
	handProfile: XrHandProfile
	pathToHandModels: string
}

export interface XrInputConfigHand extends Array<XrInputConfigHandItem> {}

// VR HAND TOUCH - Configuration

// Aavailable Hit-Test Modes

export type XrHandTouchTestMode = "ray" | "sphere"

// Configuration Prop passed to a 'SessionVR' component

export interface XrHandTouchConfig {
	mode?: XrHandTouchTestMode
	sphereRadius?: number
	touchDistance?: number
	lerpFactor?: number
	debug?: XrHandTouchDebugParams
	hands?: XrHandTouchConfigHands
}

export interface XrHandEnableTouchResult {
	leftHandTouchEnabled: boolean
	leftHandTouchEnabledJoints: number[]
	rightHandTouchEnabled: boolean
	rightHandTouchEnabledJoints: number[]
}

// Update Props passed to an 'XRHandTouchRayExt' or 'XRHandTouchSphereExt' instance on every XRFrame --> @see 'SessionVR'

export interface XrTouchUpdateParams {
	handProfile: XrHandProfile
	raycaster: THREE.Raycaster
	xrFrameDelta: number
}

export type XrTouchUpdateArgs = [
	currentScene: THREE.Scene,
	raycaster: THREE.Raycaster,
	//handProfile: XrHandProfile,
	leftHand: THREE.Group,
	rightHand: THREE.Group,
	xrHandTouch: XRHandTouchRayExt | XRHandTouchSphereExt,
	xrFrameDelta: number,
	useBVH: boolean,
	debug: XrHandTouchDebugParams
]

// VR HAND TOUCH - Events

export interface XrHandTouchEventsItem {
	hand: XrHandEnabled
	name: XrHandTouchEnabled
	touchtime?: number
	index: number[]
}

export interface XrHandTouchEvents extends Array<XrHandTouchEventsItem> {}

// VR HAND TOUCH - Debugger Configuration

export interface XrHandTouchRayDebuggerConfig {
	drawTentacles: boolean
	// TODO: Rename this
	drawTouchDebuggers: boolean
}

export interface XrHandTouchSphereDebuggerConfig {
	widthSegments: number
	heightSegments: number
	colors: {
		touch: number
		unTouch: number
	}
	mat: { [key: string]: any }
}

export interface XrHandTouchDebugConfigItem {
	mode: XrHandTouchTestMode
	config?: XrHandTouchRayDebuggerConfig | XrHandTouchSphereDebuggerConfig
}

export interface XrHandTouchDebugConfig extends Array<XrHandTouchDebugConfigItem> {}

export interface XrHandTouchDebugParams {
	enabled: boolean
	debugConfig: XrHandTouchDebugConfig
	highlightJoints?: {
		enabled: boolean
		colors?: {
			normal?: number
			touch?: number
		}
	}
	colorFaces?: {
		enabled: boolean
		colors?: {
			touch?: number
			unTouch?: number
			touchThroughEnter?: number
			touchThroughExit?: number
			scratch?: number
		}
	}
}

// VR HAND TOUCH X

// VR HAND TOUCH X - Configuration

export interface XrHandTouchXIndexItem {
	left: number[]
	right: number[] | number[]
}

export interface XrHandTouchXIndexPairs extends Array<XrHandTouchXIndexItem> {}

export interface XrHandTouchXConfigItem {
	hand: XrHandTouchEnabled
	name: string
	distance?: number
	touchtime?: number
	indexPairs: XrHandTouchXIndexPairs
}

export interface XrHandTouchXConfig extends Array<XrHandTouchXConfigItem> {}

// CONTROLLER Config

// TODO  provide the ability to customize grip model via config, atm. only the (straight Line) ray is configurable atm
export interface XrControllerSpaceModelConfig {
	geometry?: THREE.BufferGeometry
	material: THREE.Material | THREE.Material[]
	mesh?: THREE.Mesh
	scene?: THREE.Scene
	pathToModel?: string
}

export interface XrControllerTargetRayConfig {
	name: string
	material?: THREE.LineBasicMaterial | THREE.LineDashedMaterial
	scaleZ?: number // 1*ScaleZ
}

export type XrGrippableEnabled = "left" | "right" | "both"

export interface XrInputConfigGrippableItem {
	controller: XrGrippableEnabled
	useGrip?: boolean
	targetRay?: XrControllerTargetRayConfig
	grip?: XrControllerSpaceModelConfig
	// distance?: number
}

/**
 * [{}]
 */
export interface XrInputConfigGrippable extends Array<XrInputConfigGrippableItem> {}

// CONTROLLER EVENTS

export type XrControllerSpaceType = "targetray" | "grip" | "hand"
export type XrControllerEventType = "select" | "selectstart" | "selectend" | "squeeze" | "squeezestart" | "squeezeend"
export type XrControllerEventTypeMissed =
	| "missed_interactive_select"
	| "missed_interactive_squeeze"
	| "missed_all_select"
	| "missed_all_squeeze"

/* --strictFunctionTypes:true version */
export interface XrControllerSpaceEvent extends THREE.Event {
	type: XrControllerEventType | string
	target?: THREE.Group | any
	data?: XRInputSource
}

/* --strictFunctionTypes:false version 
export interface XrControllerSpaceEvent {
	type: XrControllerEventType
	target: THREE.Group
	data: XRInputSource
}
*/

export type XrControllerEventDetailObj = {
	xrInputSource: XRInputSource
	controllerSpace: THREE.Group
	controllerSpaceType: XrControllerSpaceType
	controllerHandedness: XRHandedness
	targetObj: THREE.Object3D
}

export type XrControllerEventDetailSession = {
	xrInputSource: XRInputSource
	controllerSpace: THREE.Group
	controllerSpaceType: XrControllerSpaceType
	controllerHandedness: XRHandedness
	intersectedObj: THREE.Object3D
}

export interface XrControllerEventSession extends THREE.Event {
	type: XrControllerEventType | XrControllerEventTypeMissed
	detail: XrControllerEventDetailSession
}

export type XrControllerEventObject = {
	type: XrControllerEventType | XrControllerEventTypeMissed
	detail: XrControllerEventDetailObj
}

export type XrControllerEventSessionDispatcher = {
	select: XrControllerEventDetailSession
	selectstart: XrControllerEventDetailSession
	selectend: XrControllerEventDetailSession
	squeeze: XrControllerEventDetailSession
	squeezestart: XrControllerEventDetailSession
	squeezeend: XrControllerEventDetailSession
	missed_interactive_select: XrControllerEventDetailSession
	missed_interactive_squeeze: XrControllerEventDetailSession
	missed_all_select: XrControllerEventDetailSession
	missed_all_squeeze: XrControllerEventDetailSession
}

// HAND EVENTS
// TODO  tbd
