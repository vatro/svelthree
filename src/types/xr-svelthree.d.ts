declare type Scene = import("svelthree-three").Scene
declare type Raycaster = import("svelthree-three").Raycaster
declare type LineDashedMaterial = import("svelthree-three").LineDashedMaterial
declare type LineBasicMaterial = import("svelthree-three").LineBasicMaterial

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

declare type SessionVRInputType = "controller" | "hand"

// VR

// VR SESSION - Configuration

declare type XRHandProfile = "boxes" | "spheres" | "oculus"
declare type XRHandTouchEnabled = "left" | "right" | "both"

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

// VR PINCH - Debugger

declare type XRHandPinchRayMaterial = LineDashedMaterial | LineBasicMaterial

/*
--------- VR TOUCH (HANDS) ----------
*/

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

// Update Props passed to an 'XRHandTouchRayExt' or 'XRHandTouchSphereExt' instance on every XRFrame --> @see 'SessionVR'

declare interface XRTouchRayUpdateParams {
    handProfile: XRHandProfile
    raycaster: Raycaster
    xrFrameDelta: number
}

declare interface XRTouchSphereUpdateParams {
    handProfile: XRHandProfile
    raycaster: Raycaster
    xrFrameDelta: number
}

// VR HAND TOUCH - Events

declare interface XRHandTouchEventsItem {
    name: string
    hand: XRHandTouchEnabled
    distance?: number
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
    hightlightJoints?: {
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
