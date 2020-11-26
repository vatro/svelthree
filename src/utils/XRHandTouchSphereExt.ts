import { sphereIntersectTriangle } from "../../node_modules/three-mesh-bvh/src/Utils/MathUtilities"
import { XRHandTouch } from "./XRHandTouch"
import { Mesh, Sphere, Group, Vector3, Color } from "svelthree-three"
import XRHandTouchDefaults from "./XRHandTouchDefaults"

export class XRHandTouchSphereExt extends XRHandTouch {
    touchSphere: Sphere
    // override
    touchSphereRadius: number

    constructor(
        lerpFactor: number = XRHandTouchDefaults.LERP_FACTOR,
        touchDistance:number = XRHandTouchDefaults.TOUCH_DISTANCE,
        sphereRadius:number = XRHandTouchDefaults.MODE_SPHERE_RADIUS) {
        super()
        this.lerpFactor = lerpFactor
        this.touchDistance = touchDistance
        this.touchSphereRadius = sphereRadius
    }

    // override
    checkUntouchOutside(hand: Group, joint: Group, i: number, intersectObj: { [key: string]: any }, logMessage: String, raycaster?: Raycaster, origin?: Vector3) {
        let indices = this.checkSphereIntersection(joint, intersectObj.object)
        if (indices.length > 0) {
            // don't dispatch untouch!
            // we're in touch range with the newly intersected object / face
            // so we update the joint.userData, but NOT yet joint.userData.raycasterTouchingDir
            joint.userData.touchObj = intersectObj.object
            joint.userData.touchFaceNormal = intersectObj.face.normal
            joint.userData.touchFaceIndex = intersectObj.faceIndex

            // should always paint touched faces in debug mode (behaviour not configurable)
            if (this.debug && this.debuggerSphere) {
                this.debuggerSphere.colorSphereTouch(intersectObj.object, indices)
            }

        } else {
            //dispatch untouch!
            console.log(logMessage, intersectObj.distance)
            if (this.debug) {
                if (this.faceDebugger) { this.faceDebugger.colorUnTouch(intersectObj, null) }
                if (this.debuggerRay && this.debuggerRay.drawTentacles) { this.debuggerRay.removeAllTentacles(joint) }
            }
            this.resetJointTouchData(joint)
            this.removeJointFromTouchingArray(hand, i)
            this.dispatchUntouch(hand, joint, i, intersectObj)
        }
    }

    // override
    // replaces distance to face check
    checkSphereIntersection(joint: Group, mesh: Mesh): number[] {
        console.log("checkSphereIntersection!")

        // this doesn't work!
        //this.touchSphere.set(joint.userData.origin, this.touchSphereRadius)
        this.touchSphere = new Sphere(joint.userData.origin, this.touchSphereRadius)

        /*
        if(this.doDebug && joint.userData.debugSphere) {
            joint.userData.debugSphere.position.copy(joint.userData.origin)
        }
        */

        //console.log("joint.userData.origin: ", joint.userData.origin)
        //console.log("this.touchSphere center", this.touchSphere.center)

        let bvh

        if (mesh.geometry['boundsTree']) {
            bvh = mesh.geometry['boundsTree']
            //console.log("has 'boundsTree', bvh: ", bvh)
        }

        //console.log("bvh: ", bvh)

        const indices: number[] = [];

        console.time("bvh.shapecast")
        if (bvh) {
            bvh.shapecast(
                mesh,
                box => this.touchSphere.intersectsBox(box.applyMatrix4(mesh.matrixWorld)),
                (tri, a, b, c) => {

                    tri.a.applyMatrix4(mesh.matrixWorld)
                    tri.b.applyMatrix4(mesh.matrixWorld)
                    tri.c.applyMatrix4(mesh.matrixWorld)

                    if (sphereIntersectTriangle(this.touchSphere, tri)) {
                        indices.push(a, b, c);
                    }

                    return false
                }
            )
        }
        console.timeEnd("bvh.shapecast")

        //console.log("indices: ", indices)

        return indices
    }

    // override
    intersectionsPhase1Raycast(params: XRTouchRayUpdateParams, joint: Group): any {
        return this.doRaycast(params.raycaster, joint.userData.origin, joint.userData.direction, 0, this.touchSphereRadius + this.touchDistance * joint.userData.speedFac)
    }

    // override
    isInTouchDistance(intersections: any[], joint: Group): boolean {
        let indices = this.checkSphereIntersection(joint, intersections[0].object)
        return indices.length > 0
    }
}