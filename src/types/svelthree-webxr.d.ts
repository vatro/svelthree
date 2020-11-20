/**
 * WebXR API
 * Adapted from @see https://github.com/google/model-viewer/blob/master/packages/model-viewer/src/types/webxr.ts
 * Licensed under the Apache License, Version 2.0 (the 'License')
 */

 // ------------------ added by svelthree ---------------------

declare type XRHitTestMode = "realworld" | "virtual"
declare type SessionVRInputType = "controller" | "hand"

declare type XRHandPinchMode = "remote" | "touch" | "hybrid"

declare type LineDashedMaterial = import('svelthree-three').LineDashedMaterial
declare type LineBasicMaterial = import('svelthree-three').LineBasicMaterial

declare type XRHandPinchRayMaterial = LineDashedMaterial | LineBasicMaterial


declare type Scene = import('svelthree-three').Scene
declare type Raycaster = import('svelthree-three').Raycaster

declare interface XRTouchRayUpdateParams {
    handProfile: XRHandProfile
    lerpFactor: number
    raycaster: Raycaster
    enabledJoints: number[]
    xrFrameDelta:number
}

declare interface XRTouchSphereUpdateParams {
    handProfile: XRHandProfile
    lerpFactor: number
    raycaster: Raycaster
    enabledJoints: number[]
    xrFrameDelta:number
}


//{hand: "left", mode:"hybrid",  distance: {remote: 2, touch: 0.01}, materials: {remote: pinchRemoteLineMat, touch: pinchTouchLineMat}, colors: {remote: 0xffffff, touch: 0xff0000}},
declare interface XRHandPinchConfigItem {
    hand:XRHandTouchEnabled, mode:XRHandPinchMode, distance?: {remote?:number, touch?:number}, materials?: {remote?:XRHandPinchRayMaterial, touch?:XRHandPinchRayMaterial }, colors?: {remote?: number, remoteHit?: number, touch?: number, touchHit?: number,}
}

declare interface XRHandPinchConfig extends Array<XRHandPinchConfigItem> { }

declare type XRHandProfile = "boxes" | "spheres" | "oculus"
declare type XRHandTouchEnabled = "left" | "right" | "both"

declare interface XRHandTouchConfigHandsItem {
    hand:XRHandTouchEnabled, index:number[]
}

declare interface XRHandTouchConfigHands extends Array<XRHandTouchConfigHandsItem> { }

declare type XRHandTouchTestMode = "ray" | "sphere"

declare interface XRHandTouchConfig {
    mode?: XRHandTouchTestMode,
    debug?: boolean,
    hands: XRHandTouchConfigHands
}

declare interface XRHandTouchXIndexItem {
    left:number[], right:number[] | number[]
}

declare interface XRHandTouchXIndexPairs extends Array<XRHandTouchXIndexItem>{}

declare interface XRHandTouchXConfigItem {
    hand:XRHandTouchEnabled, name:string, distance?:number, touchtime?:number, indexPairs:XRHandTouchXIndexPairs
}

declare interface XRHandTouchXConfig extends Array<XRHandTouchXConfigItem> { }

declare interface XRHandTouchEventsItem {
    name:string, hand:XRHandTouchEnabled, distance?:number, touchtime?:number, index:number[]
}

declare interface XRHandTouchEvents extends Array<XRHandTouchEventsItem> { }

declare interface XRSessionEvent extends Event {
    readonly session: XRSession
}

//@see https://github.com/BabylonJS/Babylon.js/blob/master/src/LibDeclarations/webxr.d.ts
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
| "reset";

//------------------------------------------------------------

declare type Constructor<T = object> = {
    new (...args: any[]): T
    prototype: T
}

declare type XRReferenceSpaceType =
    | "local"
    | "local-floor"
    | "bounded-floor"
    | "unbounded"
    | "viewer"

declare type XRSessionMode = "inline" | "immersive-ar" | "immersive-vr"

declare interface XRPresentationContext {
    readonly canvas: HTMLCanvasElement
}

declare interface XRHitTestSource {
    cancel(): void
}

declare interface XRTransientInputHitTestSource {
    cancel(): void
}

declare interface XRHitTestResult {
    getPose(baseSpace: XRSpace): XRPose | null
}

declare interface XRTransientInputHitTestResult {
    readonly inputSource: XRInputSource
    readonly results: Array<XRHitTestResult>
}

declare interface XR extends EventTarget {
    requestSession(mode: XRSessionMode, options?: any): Promise<XRSession>
    isSessionSupported(mode: XRSessionMode): Promise<boolean>
}

declare interface XRRigidTransform {
    readonly position: DOMPointReadOnly
    readonly orientation: DOMPointReadOnly
    readonly matrix: Float32Array
    readonly inverse: XRRigidTransform
}

declare interface XRSpace extends EventTarget {}

declare interface XRReferenceSpace extends XRSpace {
    getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace
}

type XREye = "left" | "right"

declare interface XRView {
    readonly eye: XREye
    readonly projectionMatrix: Float32Array
    readonly viewMatrix: Float32Array
    readonly transform: XRRigidTransform
}

declare interface XRViewerPose {
    readonly transform: XRRigidTransform
    readonly views: Array<XRView>
}

declare interface XRRayDirectionInit {
    x?: number
    y?: number
    z?: number
    w?: number
}

declare class XRRay {
    readonly origin: DOMPointReadOnly
    readonly direction: XRRayDirectionInit
    matrix: Float32Array

    constructor(origin: DOMPointInit, direction: XRRayDirectionInit)
}

declare interface XRPose {
    readonly emulatedPosition: boolean
    readonly transform: XRRigidTransform
}

type XRHandedness = "" | "left" | "right"
type XRTargetRayMode = "gaze" | "tracked-pointer" | "screen"

declare interface XRInputSource {
    readonly handedness: XRHandedness
    readonly targetRayMode: XRTargetRayMode
    readonly targetRaySpace: XRSpace
    readonly gripSpace?: XRSpace
    readonly profiles: Array<String>
    readonly gamepad: Gamepad
}

declare interface XRInputSourceEvent extends Event {
    readonly frame: XRFrame
    readonly inputSource: XRInputSource
}

declare interface XRFrame {
    readonly session: XRSession
    getViewerPose(referenceSpace?: XRReferenceSpace): XRViewerPose
    getPose(space: XRSpace, referenceSpace: XRReferenceSpace): XRPose
    getHitTestResults(hitTestSource: XRHitTestSource): Array<XRHitTestResult>
    getHitTestResultsForTransientInput(
        hitTestSource: XRTransientInputHitTestSource
    ): Array<XRTransientInputHitTestResult>
}

type XRFrameRequestCallback = (time: number, frame: XRFrame) => void

declare interface XRRenderState {
    readonly depthNear: number
    readonly depthFar: number
    readonly inlineVerticalFieldOfView?: number
    readonly baseLayer?: XRWebGLLayer
}

declare interface XRRenderStateInit {
    depthNear?: number
    depthFar?: number
    inlineVerticalFieldOfView?: number
    baseLayer?: XRWebGLLayer
}

declare interface XRHitTestOptionsInit {
    space: XRSpace
    offsetRay?: XRRay
}

declare interface XRTransientInputHitTestOptionsInit {
    profile: string
    offsetRay?: XRRay
}

declare interface XRSession extends EventTarget {
    renderState: XRRenderState
    updateRenderState(state?: XRRenderStateInit): any
    requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>
    requestHitTestSource(
        options: XRHitTestOptionsInit
    ): Promise<XRHitTestSource>
    requestHitTestSourceForTransientInput(
        options: XRTransientInputHitTestOptionsInit
    ): Promise<XRTransientInputHitTestSource>
    inputSources: Array<XRInputSource>
    requestAnimationFrame(callback: XRFrameRequestCallback): number
    cancelAnimationFrame(id: number): void
    end(): Promise<void>
}

declare interface XRViewport {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
}

declare interface XRLayer {}

declare interface XRWebGLLayerInit {
    antialias?: boolean
    depth?: boolean
    stencil?: boolean
    alpha?: boolean
    ignoreDepthValues?: boolean
    framebufferScaleFactor?: number
}

declare class XRWebGLLayer implements XRLayer {
    public framebuffer: WebGLFramebuffer
    public framebufferWidth: number
    public framebufferHeight: number

    constructor(
        session: XRSession,
        gl: WebGLRenderingContext,
        options: XRWebGLLayerInit
    )

    getViewport(view: XRView): XRViewport
}

declare interface Window {
    XRSession?: Constructor<XRSession>
    XR?: Constructor<XR>
}

declare interface Navigator {
    xr?: XR
}

declare interface WebGLRenderingContext {
    makeXRCompatible(): Promise<void>
}
