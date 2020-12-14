/**
 * @see https://github.com/BabylonJS/Babylon.js/blob/master/src/LibDeclarations/webxr.d.ts
 */

interface XRJointSpace extends XRSpace {}

interface XRJointPose extends XRPose {
    radius: number | undefined
}

interface XRHand extends Iterable<XRJointSpace> {
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

interface XRInputSource {
    readonly handedness: XRHandedness
    readonly targetRayMode: XRTargetRayMode
    readonly targetRaySpace: XRSpace
    readonly gripSpace?: XRSpace
    readonly gamepad?: Gamepad
    readonly profiles: Array<string>
    readonly hand?: XRHand
}
