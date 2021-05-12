/** 
WebXR types collected from:
@see https://github.com/BabylonJS/Babylon.js/blob/master/src/LibDeclarations/webxr.d.ts
@see https://github.com/google/model-viewer/blob/master/packages/model-viewer/src/types/webxr.ts 
*/

// Model-Viewer

export type XRReferenceSpaceType = "local" | "local-floor" | "bounded-floor" | "unbounded" | "viewer"

export type XRSessionMode = "inline" | "immersive-ar" | "immersive-vr"

export interface XRPresentationContext {
	readonly canvas: HTMLCanvasElement
}

export interface XRHitTestSource {
	cancel(): void
}

export interface XRTransientInputHitTestSource {
	cancel(): void
}

export interface XRHitTestResult {
	getPose(baseSpace: XRSpace): XRPose | null
}

export interface XRTransientInputHitTestResult {
	readonly inputSource: XRInputSource
	readonly results: Array<XRHitTestResult>
}

export interface XR extends EventTarget {
	requestSession(mode: XRSessionMode, options?: any): Promise<XRSession>
	isSessionSupported(mode: XRSessionMode): Promise<boolean>
}

export interface XRRigidTransform {
	readonly position: DOMPointReadOnly
	readonly orientation: DOMPointReadOnly
	readonly matrix: Float32Array
	readonly inverse: XRRigidTransform
}

export interface XRSpace extends EventTarget {}

export interface XRReferenceSpace extends XRSpace {
	getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace
}

type XREye = "left" | "right"

export interface XRView {
	readonly eye: XREye
	readonly projectionMatrix: Float32Array
	readonly viewMatrix: Float32Array
	readonly transform: XRRigidTransform
}

export interface XRViewerPose {
	readonly transform: XRRigidTransform
	readonly views: Array<XRView>
}

export interface XRRayDirectionInit {
	x?: number
	y?: number
	z?: number
	w?: number
}

export class XRRay {
	readonly origin: DOMPointReadOnly
	readonly direction: XRRayDirectionInit
	matrix: Float32Array

	constructor(origin: DOMPointInit, direction: XRRayDirectionInit)
}

export interface XRPose {
	readonly emulatedPosition: boolean
	readonly transform: XRRigidTransform
}

type XRHandedness = "" | "left" | "right"
type XRTargetRayMode = "gaze" | "tracked-pointer" | "screen"

// took babylon version
// export interface XRInputSource

export interface XRInputSourceEvent extends Event {
	readonly frame: XRFrame
	readonly inputSource: XRInputSource
}

type XRFrameRequestCallback = (time: number, frame: XRFrame) => void

export interface XRRenderState {
	readonly depthNear: number
	readonly depthFar: number
	readonly inlineVerticalFieldOfView?: number
	readonly baseLayer?: XRWebGLLayer
}

export interface XRRenderStateInit {
	depthNear?: number
	depthFar?: number
	inlineVerticalFieldOfView?: number
	baseLayer?: XRWebGLLayer
}

export interface XRHitTestOptionsInit {
	space: XRSpace
	offsetRay?: XRRay
}

export interface XRTransientInputHitTestOptionsInit {
	profile: string
	offsetRay?: XRRay
}

/* --strictFunctionTypes:true version */
export interface XRInputSourceChangeEvent extends Event {
	session: XRSession
	removed: Array<XRInputSource>
	added: Array<XRInputSource>
}

/* --strictFunctionTypes:false version 
export interface XRInputSourceChangeEvent extends Event {
	session: XRSession
	removed: Array<XRInputSource>
	added: Array<XRInputSource>
}
*/

export interface XRViewport {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
}

export interface XRLayer {}

export interface XRWebGLLayerInit {
	antialias?: boolean
	depth?: boolean
	stencil?: boolean
	alpha?: boolean
	ignoreDepthValues?: boolean
	framebufferScaleFactor?: number
}

export class XRWebGLLayer implements XRLayer {
	public framebuffer: WebGLFramebuffer
	public framebufferWidth: number
	public framebufferHeight: number

	constructor(session: XRSession, gl: WebGLRenderingContext, options: XRWebGLLayerInit)

	getViewport(view: XRView): XRViewport
}

export interface Window {
	XRSession?: Constructor<XRSession>
	XR?: Constructor<XR>
}

export interface Navigator {
	xr?: XR
}

export interface WebGLRenderingContext {
	makeXRCompatible(): Promise<void>
}

// Babylon.js

export type XREventType =
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

export interface XRSessionEvent extends Event {
	readonly session: XRSession
}

export interface XRJointSpace extends XRSpace {}

export interface XRJointPose extends XRPose {
	radius: number | undefined
}

export interface XRHand extends Iterable<XRJointSpace> {
	readonly length: number

	[index: number]: XRJointSpace

	readonly WRIST: number

	readonly THUMB_METACARPAL: number
	readonly THUMB_PHALANX_PROXIMAL: number
	readonly THUMB_PHALANX_DISTAL: number
	readonly THUMB_PHALANX_TIP: number

	readonly INDEX_METACARPAL: number
	readonly INDEX_PHALANX_PROXIMAL: number
	readonly INDEX_PHALANX_INTERMEDIATE: number
	readonly INDEX_PHALANX_DISTAL: number
	readonly INDEX_PHALANX_TIP: number

	readonly MIDDLE_METACARPAL: number
	readonly MIDDLE_PHALANX_PROXIMAL: number
	readonly MIDDLE_PHALANX_INTERMEDIATE: number
	readonly MIDDLE_PHALANX_DISTAL: number
	readonly MIDDLE_PHALANX_TIP: number

	readonly RING_METACARPAL: number
	readonly RING_PHALANX_PROXIMAL: number
	readonly RING_PHALANX_INTERMEDIATE: number
	readonly RING_PHALANX_DISTAL: number
	readonly RING_PHALANX_TIP: number

	readonly LITTLE_METACARPAL: number
	readonly LITTLE_PHALANX_PROXIMAL: number
	readonly LITTLE_PHALANX_INTERMEDIATE: number
	readonly LITTLE_PHALANX_DISTAL: number
	readonly LITTLE_PHALANX_TIP: number
}

export interface XRInputSource {
	readonly handedness: XRHandedness
	readonly targetRayMode: XRTargetRayMode
	readonly targetRaySpace: XRSpace
	readonly gripSpace?: XRSpace
	readonly gamepad?: Gamepad
	readonly profiles: Array<string>
	readonly hand?: XRHand
}
