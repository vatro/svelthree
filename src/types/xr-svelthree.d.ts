/*
import {
    Scene,
    Raycaster,
    LineDashedMaterial,
    LineBasicMaterial,
    BufferGeometry,
    Material,
    Group,
    Mesh,
    Object3D
} from "svelthree-three"
*/

declare type XRHandTouchRayExt = import("../utils/XRHandTouchRayExt").default
declare type XRHandTouchSphereExt = import("../utils/XRHandTouchSphereExt").default

declare type XrRequiredFeatures = XRReferenceSpaceType | "hand-tracking" | "hit-test"
declare type XrOptionalFeatures = XrRequiredFeatures

declare type XrHitTestMode = "realworld" | "virtual"

declare type SessionVRInputType = "grippable" | "hand"

// Ehm! "hybrid" is not possible 😬 simultaneous usage of hand-tracking and grippable is not supported by the Quest (yet?)
//type SessionVRInputType = "grippable" | "hand" | "hybrid"

// VR

// VR SESSION - Configuration

declare interface SessionVRInputConfigItem {
    type: SessionVRInputType
    config: XrInputConfigGrippable | XrInputConfigHand
}

declare interface SessionVRInputConfig extends Array<SessionVRInputConfigItem> {}

declare type XrHandProfile = "boxes" | "spheres" | "oculus"
declare type XrHandTouchEnabled = "left" | "right" | "both"
declare type XrHandEnabled = XrHandTouchEnabled

declare interface XrHandTouchConfigHandsItem {
    hand: XrHandTouchEnabled
    index: number[]
}

declare interface XrHandTouchConfigHands extends Array<XrHandTouchConfigHandsItem> {}

/* --------- VR PINCH -------- */

// VR PINCH - Configuration

declare type XrHandPinchMode = "remote" | "touch" | "hybrid"

declare interface XrHandPinchConfigItem {
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

declare interface XrHandPinchConfig extends Array<XrHandPinchConfigItem> {}

declare interface XrHandEnablePinchResult {
    leftHandPinchEnabled: boolean
    leftHandPinchConfig: XrHandPinchConfigItem
    rightHandPinchEnabled: boolean
    rightHandPinchConfig: XrHandPinchConfigItem
}

// VR PINCH - Debugger

declare type XrHandPinchRayMaterial = THREE.LineDashedMaterial | THREE.LineBasicMaterial

/*
--------- VR TOUCH (HANDS) ----------
*/

// HAND INPUT CONFIG

declare interface XrInputConfigHandItem {
    hand: XrHandEnabled
    handProfile: XrHandProfile
    pathToHandModels: string
}

declare interface XrInputConfigHand extends Array<XrInputConfigHandItem> {}

// VR HAND TOUCH - Configuration

// Aavailable Hit-Test Modes

declare type XrHandTouchTestMode = "ray" | "sphere"

// Configuration Prop passed to a 'SessionVR' component

declare interface XrHandTouchConfig {
    mode?: XrHandTouchTestMode
    sphereRadius?: number
    touchDistance?: number
    lerpFactor?: number
    debug?: XrHandTouchDebugParams
    hands?: XrHandTouchConfigHands
}

declare interface XrHandEnableTouchResult {
    leftHandTouchEnabled: boolean
    leftHandTouchEnabledJoints: number[]
    rightHandTouchEnabled: boolean
    rightHandTouchEnabledJoints: number[]
}

// Update Props passed to an 'XRHandTouchRayExt' or 'XRHandTouchSphereExt' instance on every XRFrame --> @see 'SessionVR'

declare interface XrTouchUpdateParams {
    handProfile: XrHandProfile
    raycaster: THREE.Raycaster
    xrFrameDelta: number
}

declare interface TouchUpdateArgsItem {}

declare type XrTouchUpdateArgs = [
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

declare interface XrHandTouchEventsItem {
    hand: XrHandEnabled
    name: XrHandTouchEnabled
    touchtime?: number
    index: number[]
}

declare interface XrHandTouchEvents extends Array<XrHandTouchEventsItem> {}

// VR HAND TOUCH - Debugger Configuration

declare interface XrHandTouchRayDebuggerConfig {
    drawTentacles: boolean
    // TODO: Rename this
    drawTouchDebuggers: boolean
}

declare interface XrHandTouchSphereDebuggerConfig {
    widthSegments: number
    heightSegments: number
    colors: {
        touch: number
        unTouch: number
    }
    mat: { [key: string]: any }
}

declare interface XrHandTouchDebugConfigItem {
    mode: XrHandTouchTestMode
    config?: XrHandTouchRayDebuggerConfig | XrHandTouchSphereDebuggerConfig
}

declare interface XrHandTouchDebugConfig extends Array<XrHandTouchDebugConfigItem> {}

declare interface XrHandTouchDebugParams {
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

declare interface XrHandTouchXIndexItem {
    left: number[]
    right: number[] | number[]
}

declare interface XrHandTouchXIndexPairs extends Array<XrHandTouchXIndexItem> {}

interface XrHandTouchXConfigItem {
    hand: XrHandTouchEnabled
    name: string
    distance?: number
    touchtime?: number
    indexPairs: XrHandTouchXIndexPairs
}

declare interface XrHandTouchXConfig extends Array<XrHandTouchXConfigItem> {}

// CONTROLLER Config

// TODO  provide the ability to customize grip model via config, atm. only the (straight Line) ray is configurable atm
declare interface XrControllerSpaceModelConfig {
    geometry?: THREE.BufferGeometry
    material: THREE.Material | THREE.Material[]
    mesh?: THREE.Mesh
    scene?: THREE.Scene
    pathToModel?: string
}

declare interface XrControllerTargetRayConfig {
    name: string
    material?: THREE.LineBasicMaterial | THREE.LineDashedMaterial
    scaleZ?: number // 1*ScaleZ
}

declare type XrGrippableEnabled = "left" | "right" | "both"

declare interface XrInputConfigGrippableItem {
    controller: XrGrippableEnabled
    useGrip?: boolean
    targetRay?: XrControllerTargetRayConfig
    grip?: XrControllerSpaceModelConfig
    // distance?: number
}

declare interface XrInputConfigGrippable extends Array<XrInputConfigGrippableItem> {}

// CONTROLLER EVENTS

declare type XrControllerSpaceType = "targetray" | "grip" | "hand"
declare type XrControllerEventType = "select" | "selectstart" | "selectend" | "squeeze" | "squeezestart" | "squeezeend"
declare type XrControllerEventTypeMissed =
    | "missed_interactive_select"
    | "missed_interactive_squeeze"
    | "missed_all_select"
    | "missed_all_squeeze"

declare type XrControllerSpaceEvent = {
    type: XrControllerEventType
    data: XRInputSource
    target: THREE.Group
}

declare type XrControllerEventDetailObj = {
    xrInputSource: XRInputSource
    controllerSpace: THREE.Group
    controllerSpaceType: XrControllerSpaceType
    controllerHandedness: XRHandedness
    targetObj: THREE.Object3D
}

declare type XrControllerEventDetailSession = {
    xrInputSource: XRInputSource
    controllerSpace: THREE.Group
    controllerSpaceType: XrControllerSpaceType
    controllerHandedness: XRHandedness
    intersectedObj: THREE.Object3D
}

declare type XrControllerEventSession = {
    type: XrControllerEventType | XrControllerEventTypeMissed
    detail: XrControllerEventDetailSession
}

declare type XrControllerEventObject = {
    type: XrControllerEventType | XrControllerEventTypeMissed
    detail: XrControllerEventDetailObj
}

declare type XrControllerEventSessionDispatcher = {
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
