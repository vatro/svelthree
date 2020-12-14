declare type Scene = import("svelthree-three").Scene
declare type Raycaster = import("svelthree-three").Raycaster
declare type LineDashedMaterial = import("svelthree-three").LineDashedMaterial
declare type LineBasicMaterial = import("svelthree-three").LineBasicMaterial
declare type Line = import("svelthree-three").Line
declare type XRHandModel = import("svelthree-three").XRHandModel
declare type BufferGeometry = import("svelthree-three").BufferGeometry
declare type Material = import("svelthree-three").Material
declare type Group = import("svelthree-three").Group
declare type Mesh = import("svelthree-three").Mesh
declare type Object3D = import("svelthree-three").Object3D
declare type XRHandTouchRayExt = import("../utils/XRHandTouchRayExt").default
declare type XRHandTouchSphereExt = import("../utils/XRHandTouchSphereExt").default

// based on @see https://github.com/BabylonJS/Babylon.js/blob/master/src/LibDeclarations/webxr.d.ts
declare type XREventType =
    | "devicechange"
    | "visibilitychange"
    | "end"
    | "inputsourceschange"
    | "select"
    | "selectstart"
    | "selectend"
    | "squeeze"
    | "squeezestart"
    | "squeezeend"
    | "reset"

declare type XRRequiredFeatures = XRReferenceSpaceType | "hand-tracking" | "hit-test"
declare type XROptionalFeatures = XRRequiredFeatures

declare interface XRSessionEvent extends Event {
    readonly session: XRSession
}

declare type XRHitTestMode = "realworld" | "virtual"

declare type SessionVRInputType = "grippable" | "hand" | "hybrid"

// VR

// VR SESSION - Configuration

declare interface SessionVRInputConfigItem {
    type: SessionVRInputType
    config: XRInputConfigGrippable | XRInputConfigHand
}

declare interface SessionVRInputConfig extends Array<SessionVRInputConfigItem> {}

declare type XRHandProfile = "boxes" | "spheres" | "oculus"
declare type XRHandTouchEnabled = "left" | "right" | "both"
declare type XRHandEnabled = XRHandTouchEnabled

declare interface XRHandTouchConfigHandsItem {
    hand: XRHandTouchEnabled
    index: number[]
}

declare interface XRHandTouchConfigHands extends Array<XRHandTouchConfigHandsItem> {}

/*
--------- VR PINCH ---------
*/

// VR PINCH - Configuration

declare type XRHandPinchMode = "remote" | "touch" | "hybrid"

declare interface XRHandPinchConfigItem {
    hand: XRHandTouchEnabled
    mode: XRHandPinchMode
    distance?: {
        remote?: number
        touch?: number
    }
    materials?: {
        remote?: XRHandPinchRayMaterial
        touch?: XRHandPinchRayMaterial
    }
    colors?: {
        remote?: number
        remoteHit?: number
        touch?: number
        touchHit?: number
    }
}

declare interface XRHandPinchConfig extends Array<XRHandPinchConfigItem> {}

declare interface XRHandEnablePinchResult {
    leftHandPinchEnabled: boolean
    leftHandPinchConfig: XRHandPinchConfigItem
    rightHandPinchEnabled: boolean
    rightHandPinchConfig: XRHandPinchConfigItem
}

// VR PINCH - Debugger

declare type XRHandPinchRayMaterial = LineDashedMaterial | LineBasicMaterial

/*
--------- VR TOUCH (HANDS) ----------
*/

// HAND INPUT CONFIG

declare interface XRInputConfigHandItem {
    hand: XRHandEnabled
    handProfile: XRHandProfile
    pathToHandModels: string
}

declare interface XRInputConfigHand extends Array<XRInputConfigHandItem> {}

// VR HAND TOUCH - Configuration

// Aavailable Hit-Test Modes

declare type XRHandTouchTestMode = "ray" | "sphere"

// Configuration Prop passed to a 'SessionVR' component

declare interface XRHandTouchConfig {
    mode?: XRHandTouchTestMode
    sphereRadius?: number
    touchDistance?: number
    lerpFactor?: number
    debug?: XRHandTouchDebugParams
    hands?: XRHandTouchConfigHands
}

declare interface XRHandEnableTouchResult {
    leftHandTouchEnabled: boolean
    leftHandTouchEnabledJoints: number[]
    rightHandTouchEnabled: boolean
    rightHandTouchEnabledJoints: number[]
}

// Update Props passed to an 'XRHandTouchRayExt' or 'XRHandTouchSphereExt' instance on every XRFrame --> @see 'SessionVR'

declare interface XRTouchUpdateParams {
    handProfile: XRHandProfile
    raycaster: Raycaster
    xrFrameDelta: number
}

declare interface XRTouchUpdateArgsItem {}

declare type XRTouchUpdateArgs = [
    currentScene: Scene,
    raycaster: Raycaster,
    //handProfile: XRHandProfile,
    leftHand: Group,
    rightHand: Group,
    xrHandTouch: XRHandTouchRayExt | XRHandTouchSphereExt,
    xrFrameDelta: number,
    useBVH: boolean,
    debug: XRHandTouchDebugParams
]

// VR HAND TOUCH - Events

declare interface XRHandTouchEventsItem {
    hand: XRHandEnabled
    name: XRHandTouchEnabled
    touchtime?: number
    index: number[]
}

declare interface XRHandTouchEvents extends Array<XRHandTouchEventsItem> {}

// VR HAND TOUCH - Debugger Configuration

declare interface XRHandTouchRayDebuggerConfig {
    drawTentacles: boolean
    // TODO: Rename this
    drawTouchDebuggers: boolean
}

declare interface XRHandTouchSphereDebuggerConfig {
    widthSegments: number
    heightSegments: number
    colors: {
        touch: number
        unTouch: number
    }
    mat: { [key: string]: any }
}

declare interface XRHandTouchDebugConfigItem {
    mode: XRHandTouchTestMode
    config?: XRHandTouchRayDebuggerConfig | XRHandTouchSphereDebuggerConfig
}

declare interface XRHandTouchDebugConfig extends Array<XRHandTouchDebugConfigItem> {}

declare interface XRHandTouchDebugParams {
    enabled: boolean
    debugConfig: XRHandTouchDebugConfig
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

declare interface XRHandTouchXIndexItem {
    left: number[]
    right: number[] | number[]
}

declare interface XRHandTouchXIndexPairs extends Array<XRHandTouchXIndexItem> {}

declare interface XRHandTouchXConfigItem {
    hand: XRHandTouchEnabled
    name: string
    distance?: number
    touchtime?: number
    indexPairs: XRHandTouchXIndexPairs
}

declare interface XRHandTouchXConfig extends Array<XRHandTouchXConfigItem> {}

// CONTROLLER Config

// TODO  provide the ability to customize grip model via config, atm. only the (straight Line) ray is configurable atm
/*
declare interface XRControllerSpaceModelConfig{
    geometry?: BufferGeometry
    material: Material | Material[]
    mesh?: Mesh
    scene?: Scene
    pathToModel?: string
}
*/

declare interface XRControllerTargetRayConfig {
    name: string
    material?: LineBasicMaterial | LineDashedMaterial
    scaleZ?: number // 1*ScaleZ
}

declare type XRGrippableEnabled = "left" | "right" | "both"

declare interface XRInputConfigGrippableItem {
    controller: XRGrippableEnabled
    targetRay?: XRControllerTargetRayConfig
    // grip?: XRControllerSpaceModelConfig
    // distance?: number
}

declare interface XRInputConfigGrippable extends Array<XRInputConfigGrippableItem> {}

// CONTROLLER EVENTS

declare type XRControllerSpaceType = "targetray" | "grip" | "hand"
declare type XRControllerEventType = "select" | "selectstart" | "selectend" | "squeeze" | "squeezestart" | "squeezeend"
declare type XRControllerEventTypeMissed =
    | "missed_interactive_select"
    | "missed_interactive_squeeze"
    | "missed_all_select"
    | "missed_all_squeeze"

declare type XRControllerSpaceEvent = {
    type: XRControllerEventType
    data: XRInputSource
    target: Group
}

declare type XRControllerEventDetailObj = {
    xrInputSource: XRInputSource
    controllerSpace: Group
    controllerSpaceType: XRControllerSpaceType
    controllerHandedness: XRHandedness
    targetObj: Object3D
}

declare type XRControllerEventDetailSession = {
    xrInputSource: XRInputSource
    controllerSpace: Group
    controllerSpaceType: XRControllerSpaceType
    controllerHandedness: XRHandedness
    intersectedObj: Object3D
}

declare type XRControllerEventSession = {
    type: XRControllerEventType | XRControllerEventTypeMissed
    detail: XRControllerEventDetailSession
}

declare type XRControllerEventSessionDispatcher = {
    select: XRControllerEventDetailSession
    selectstart: XRControllerEventDetailSession
    selectend: XRControllerEventDetailSession
    squeeze: XRControllerEventDetailSession
    squeezestart: XRControllerEventDetailSession
    squeezeend: XRControllerEventDetailSession
    missed_interactive_select: XRControllerEventDetailSession
    missed_interactive_squeeze: XRControllerEventDetailSession
    missed_all_select: XRControllerEventDetailSession
    missed_all_squeeze: XRControllerEventDetailSession
}

// HAND EVENTS
// TODO  tbd
