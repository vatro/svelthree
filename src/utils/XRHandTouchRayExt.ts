import { XRHandTouch } from "./XRHandTouch"
import { Group, Vector3 } from "svelthree-three"
import { XRHandTouchRayDebugger } from "./debuggers/XRHandTouchRayDebugger"

export class XRHandTouchRayExt extends XRHandTouch {
    constructor() {
        super()
    }

    // override
    checkUntouchOutside(hand: Group, joint: Group, i: number, intersectObj: { [key: string]: any }, logMessage: String, raycaster?: Raycaster, origin?: Vector3) {

        if (intersectObj.distance < this.touchDistance) {
            // don't dispatch untouch!
            // we're in touch range with the newly intersected object / face
            // so we update the joint.userData, but NOT yet joint.userData.raycasterTouchingDir
            joint.userData.touchObj = intersectObj.object
            joint.userData.touchFaceNormal = intersectObj.face.normal
            joint.userData.touchFaceIndex = intersectObj.faceIndex

            // - check if can switch to negative normal ray of the new face (means we're above new object/face) otherwise keep the old direction!
            // re-raycast using negative normal ray! (in order to get real distance)
            let nnRayHitDirection: Vector3 = this.nnRayIntersectsFace(joint, raycaster, origin, intersectObj)
            if (nnRayHitDirection) {
                // negative normal raycast hits the same face means we can safely update raycasterTouchingDir
                joint.userData.raycasterTouchingDir = nnRayHitDirection
            }
        } else {
            // we're outside of touch range, but before dispatching untouch check if maybe the negative normal ray ist inside touch range
            let nnRayIsInsideTouchDir: Vector3 = this.nnRayIntersectsFaceAndIsInTouchRange(joint, raycaster, origin, intersectObj)
            if (nnRayIsInsideTouchDir) {
                // we're in touch range with the newly intersected object / face after negative normal raycast check
                // so we update the joint.userData ...
                joint.userData.touchObj = intersectObj.object
                joint.userData.touchFaceNormal = intersectObj.face.normal
                joint.userData.touchFaceIndex = intersectObj.faceIndex

                // ... we can also safely update raycasterTouchingDir
                joint.userData.raycasterTouchingDir = nnRayIsInsideTouchDir
            }
            else {
                //dispatch untouch!
                console.log(logMessage, intersectObj.distance)
                this.resetJointTouchData(joint)
                this.removeJointFromTouchingArray(hand, i)
                this.dispatchUntouch(hand, joint, i, intersectObj)
            }
        }
    }

    // override
    nnRayIntersectsFaceAndIsInTouchRangeCheck(testRaycast: any[], intersectObj: { [key: string]: any }): boolean {
        if (testRaycast.length > 0 &&
            testRaycast[0].object === intersectObj.object &&
            testRaycast[0].faceIndex === intersectObj.faceIndex &&
            this.isInTouchDistance(testRaycast)) {
            return true
        }
        return false
    }

    // override
    intersectionsPhase1Raycast(params: XRTouchRayUpdateParams, joint: Group): any {
        return this.doRaycast(params.raycaster, joint.userData.origin, joint.userData.direction, 0, this.touchDistance * joint.userData.speedFac)
    }

    // override
    isInTouchDistance(intersections: any[], joint?: Group): boolean {
        return intersections[0].distance <= this.touchDistance
    }
}