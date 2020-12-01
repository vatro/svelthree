import { sphereIntersectTriangle } from "../../node_modules/three-mesh-bvh/src/Utils/MathUtilities"
import { XRHandTouch } from "./XRHandTouch"
import { Mesh, Sphere, Group, Vector3, Matrix4, Matrix3, Object3D } from "svelthree-three"
import XRHandTouchDefaults from "./XRHandTouchDefaults"

interface SphereTouchingResultsItem {
    mesh:Mesh,
    indices: number[]
}

interface SphereTouchingResults extends Array<SphereTouchingResultsItem> {}

export class XRHandTouchSphereExt extends XRHandTouch {
    touchSphere: Sphere
    // override
    touchSphereRadius: number

    constructor(
        lerpFactor: number = XRHandTouchDefaults.LERP_FACTOR,
        touchDistance: number = XRHandTouchDefaults.TOUCH_DISTANCE,
        sphereRadius: number = XRHandTouchDefaults.MODE_SPHERE_RADIUS) {
        super()
        this.lerpFactor = lerpFactor
        this.touchDistance = touchDistance
        this.touchSphereRadius = sphereRadius
    }

    //override
    update(
        hand: Group,
        params: XRTouchRayUpdateParams,
        enabledJoints: number[]
    ): void {

        for (let i = 0; i < enabledJoints.length; i++) {

            const jointIndex: number = enabledJoints[i]
            const joint: Group = hand.children[jointIndex] as Group

            if (this.debug) {
                if (this.jointDebugger) {
                    this.jointDebugger.setJointMesh(hand, joint, jointIndex)
                }
                if (this.debuggerSphere && !joint.userData.debugSphere) {
                    this.debuggerSphere.createDebugSphere(joint)
                }
            }

            if (joint.userData.origin !== undefined) {
                joint.userData.lastOrigin = joint.userData.origin
            }

            const currentOrigin: Vector3 = this.getJointOrigin(joint, jointIndex, params.handProfile, hand.userData.handedness)

            // SPHERE CLEANUP: we don't want to use direction at all in sphere mode
            // TODO  use direction for insideTouch!
            /*
            if (joint.userData.origin && joint.userData.direction) {
                joint.userData.direction = this.getJointDirection(joint, currentOrigin)
                joint.userData.speedFac = this.calculateSpeedFac(joint, currentOrigin, params.xrFrameDelta)
                joint.userData.origin = currentOrigin
            } else {
                joint.userData.origin = currentOrigin
                joint.userData.direction = new Vector3(0, 0, 0)
                joint.userData.speedFac = 0
            }
            */
            if (joint.userData.origin && joint.userData.direction) {
                //joint.userData.direction = this.getJointDirection(joint, currentOrigin)
                //joint.userData.speedFac = this.calculateSpeedFac(joint, currentOrigin, params.xrFrameDelta)
                joint.userData.origin = currentOrigin
            } else {
                joint.userData.origin = currentOrigin
                //joint.userData.direction = new Vector3(0, 0, 0)
                //joint.userData.speedFac = 0
            }
           

            if (joint.userData.touch === undefined) {
                joint.userData.touch = false
            }

            // SPHERE CLEANUP: don't care about 'touchInside' first
            // TODO  use insideTouch!
            /*
            if (joint.userData.touchInside === undefined) {
                joint.userData.touchInside = false
            }
            */

            if (this.debug) {
                if (joint.userData.debugSphere) {
                    this.debuggerSphere.updateDebugSpherePosition(joint)
                }
                // SPHERE CLEANUP: don't use tentacles! (we may only use touchDebuggers --> insideTouch)
                /*
                if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                    this.debuggerRay.setTentacleScales(joint.userData.speedFac)
                }
                */
            }

            // INTERSECTIONS of "JOINT'S DIRECTIONAL RAY" 
            // SPHERE CLEANUP: we don't want to use direction for 'touch'! (only for insideTouch)
            // let intersectionsPhase1: any[]

            /*
            "Joint Direction Raycast" - Phase 1
            */
            switch (joint.userData.touch) {
                case false:

                    if (this.debug) {
                        if (this.jointDebugger) {
                            this.jointDebugger.unhighlightJoint()
                        }
                        // SPHERE CLEANUP: don't use debuggerRay at all
                        /*
                        if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                            this.debuggerRay.showDirectionTentacle(joint, joint.userData.origin)
                        }
                        */
                    }

                    /**
                     * PHASE 1 Intersections:
                     * Cast a ray from joint's origin into the direction of joint's movement (lerped).
                     * The raycaster's ray length is bound to 'touchDistance*joint.userData.speedFac'
                     * @see XRHandTouchRayExt.intersectionsPhase1Raycast
                     * @see XRHandTouchSphereExt.intersectionsPhase1Raycast
                     * allowing it to grow and shrink. This is primarily to detect FAST TOUCH / TOUCHTHROUGH, otwerwise moving a joint through objects
                     * would/could remain undetected at high speed movements.
                     */
                    // SPHERE CLEANUP: don't use debuggerRay at all
                    // intersectionsPhase1 = this.intersectionsPhase1Raycast(params, joint)

                    // DIRECTIONAL RAY INTERSECTS --> dispatch 'TOUCH' or just SAVE 'joint.userData.lastIntersect'

                    /*
                    SPHERE CLEANUP: we don't want to use direction for 'touch'! (only for insideTouch)
                    [!] perform NEW! isTouching here!
                    */ 
                    //if (intersectionsPhase1.length > 0) {
                    
                    const sphereTouchingResults:SphereTouchingResults = this.isTouching(this.toTest, joint)

                    if (sphereTouchingResults.length > 0) {

                        // SPHERE CLEANUP: Ok, now we have the basis to test for multiple objects, we'll use only [0] for now
                        const sphereTouchingResult:SphereTouchingResultsItem = sphereTouchingResults[0]

                        /*
                        TODO  Currently the 'isInTouchDistance' method is being overriden by both modes, but may need only the RAY mode method.

                        SPHERE Mode:
                        'isInTouchDistance' is only being used here, using the sphere intersection check it on every frame might be more expensive.
                        TODO  Compare performance between RAY and SPHERE mode distance check
                        Since we're keeping the reference to the raycasted face in order to have the 'center face' anyway, we could safely replace it
                        with the RAY mode method. Especially if we ...
                        TODO  Consider setting 'touchDistance' to 'touchSphereRadius' or vice versa by default!
                         */

                        // SPHERE CLEANUP: we already know we're touching, so we don't need this
                        //if (this.isInTouchDistance(intersectionsPhase1, joint)) {

                            /*
                            Reaching this block means:
                            - the 'touch' event occurred OUTSIDE (joint is not inside the object)
                            - on next frame 'case true:' block is being executed performing 'touchingOutsideCheck'

                             */

                            // SPHERE CLEANUP: we need different joint.userData
                            joint.userData.touch = true

                            //joint.userData.touchObj = intersectionsPhase1[0].object
                            joint.userData.touchObj = sphereTouchingResult.mesh
                            joint.userData.touchIndices = sphereTouchingResult.indices

                            //joint.userData.touchFaceNormal = intersectionsPhase1[0].face.normal
                            //joint.userData.touchFaceIndex = intersectionsPhase1[0].faceIndex
                            //joint.userData.lastTouchPoint = intersectionsPhase1[0].point
                            //joint.userData.lastIntersect = undefined

                            // SPHERE CLEANUP: this is ray related...
                        	/*    
                            if (this.debug && this.faceDebugger) {
                                this.faceDebugger.colorTouchedFace(intersectionsPhase1[0], null)
                            }
                            */
                            if (this.debuggerSphere) {
                                this.debuggerSphere.colorSphereTouch(joint.userData.touchObj, joint.userData.touchIndices)
                            }
                            if (this.jointDebugger) {
                                this.jointDebugger.highlightJoint()
                            }

                            this.addJointToTouchingArray(hand, i)
                            this.dispatchTouch(hand, joint, i, sphereTouchingResults)

                            // SPHERE CLEANUP: we don't need this for now
                            // this.touchingOutsideCheck(joint, i, params.raycaster, hand)
                        
                        // SPHERE CLEANUP: we don't need this    
                        /*    
                        } else {
                            // save target
                            console.log("INTERSECTION OUTSIDE OF TOUCH DISTANCE --> SAVING TARGET!")
                            joint.userData.lastIntersect = intersectionsPhase1[0]
                        }
                        */
                    } else {
                        // SPHERE CLEANUP: we completely erased the RAY version here.

                        /*
                         This is the area where FAST TOUCH, TOUCHTHROUGH etc. get detected in the RAY Version
                         so basically we should have all these problems again (?):
                         - fast movements: touch / untouch not being detected?
                         - touch through scenario?
                         etc.
                        */ 

                        // TODO : tbd
                    }
                    break

                case true:
                    // TOUCHED!
                    // First we just want to basically check intersections here ('untouch')
                    // since we're not using any 'insideTouch' logic yet

                    const sphereTouchingResults2:SphereTouchingResults = this.isTouching(this.toTest, joint)

                    if (sphereTouchingResults2.length === 0) {
                        // 'untouch'!

                        if (this.debug) {
                            if (this.jointDebugger) {
                                this.jointDebugger.unhighlightJoint()
                            }
                        }

                        // SPHERE CLEANUP: we'll just leave it like this first ...  
                        this.resetJointTouchData(joint)

                        // SPHERE
                        joint.userData.touchObj = undefined
                        joint.userData.touchIndices = undefined

                        this.removeJointFromTouchingArray(hand, i)
                        this.dispatchUntouch(hand, joint, i, null) // null details

                    }
                    else {
                        joint.userData.touchObj = sphereTouchingResults2[0].mesh
                        joint.userData.touchIndices = sphereTouchingResults2[0].indices

                        if (this.debuggerSphere) {
                            this.debuggerSphere.colorSphereTouch(joint.userData.touchObj, joint.userData.touchIndices)
                        }
                    }


                    // TODO : touchInside --> tbd
                    /*
                    switch (joint.userData.touchInside) {

                        case false:
                            this.touchingOutsideCheck(joint, i, params.raycaster, hand)
                            break

                        case true:
                            this.touchingInsideCheck(joint, i, params.raycaster, hand)
                            break

                    }
                    */
                   break
            }
        }
    }

    // override
    /**
     * We don't use "NEGATIVE NORMAL direction ray" raycasting in SPHERE Mode, because we DON'T DETERMINE the DISTANCE to a SINGLE FACE in order to dispatch
     * an 'untouch' event, instead we're using a "bunch" (indices) of faces intersected by the 'touchSphere'
     *
     *  TOFIX  Handle touching multiple objects with the same 'touchSphere', atm this will only set a single object detected by raycasting methods of {@see XRHandTouch}
     */
    checkUntouchOutside(hand: Group, joint: Group, i: number, intersectObj: { [key: string]: any }, logMessage: String, raycaster?: Raycaster, origin?: Vector3) {
        let indices = this.checkSphereIntersection(joint, intersectObj.object)

        //  Don't dispatch 'untouch'!
        if (indices.length > 0) {
            // Determined by raycasting methods of 'XRHandTouch'

            // TOFIX  this is WRONG in SPHERE Mode, because it's possible to touch / intersect multiple objects with the same 'touchSphere'
            joint.userData.touchObj = intersectObj.object

            // We keep this, because we want a reference to the 'center face' of all intersected faces
            joint.userData.touchFaceNormal = intersectObj.face.normal
            joint.userData.touchFaceIndex = intersectObj.faceIndex

            // should always paint touched faces in debug mode (behaviour not configurable)
            if (this.debug) {

                // color faces determined by the result of 'checkSphereIntersection' method
                if (indices.length > 0) {
                    if (this.debuggerSphere) {
                        this.debuggerSphere.colorSphereTouch(intersectObj.object, indices)
                    }
                }

                // color face determined by raycasting methods of 'XRHandTouch' class
                if (this.faceDebugger) {
                    this.faceDebugger.colorTouchedFace(intersectObj, null)
                }
            }

            // Dispatch 'untouch'!
        } else {
            // TOFIX  Handle touching multiple objects with the same 'touchSphere'
            // If we set 'touchDistance' as equal to 'touchSphereRadius', then this log should match 'touchDistance' when dispatching 'untouch'
            // console.log(logMessage, intersectObj.distance)

            if (this.debug) {
                if (this.faceDebugger) {
                    this.faceDebugger.colorUnTouch(intersectObj, null)
                }
                if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                    this.debuggerRay.removeAllTentacles(joint)
                }
            }

            this.resetJointTouchData(joint)
            this.removeJointFromTouchingArray(hand, i)
            this.dispatchUntouch(hand, joint, i, intersectObj)
        }
    }

    // override
    /**
     * replaces distance to face check
     */

    checkSphereIntersection(joint: Group, mesh: Mesh): number[] {
        console.log("checkSphereIntersection!")

        // this doesn't work!
        // this.touchSphere.set(joint.userData.origin, this.touchSphereRadius)
        this.touchSphere = new Sphere(joint.userData.origin, this.touchSphereRadius)

        //console.log("joint.userData.origin: ", joint.userData.origin)
        //console.log("this.touchSphere center", this.touchSphere.center)

        const bvh = mesh.geometry['boundsTree'] || undefined

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
    /**
     * replaces distance to face check
     * @see https://github.com/gkjohnson/three-mesh-bvh/issues/154
     */
    /*
    checkSphereIntersection(joint: Group, mesh: Mesh): number[] {
        console.log("checkSphereIntersection!")
        // TODO test @see https://github.com/gkjohnson/three-mesh-bvh/issues/154 solution

        const inverseMatrix = new Matrix4();
        inverseMatrix.getInverse(mesh.matrixWorld);

        this.touchSphere = new Sphere(joint.userData.origin, this.touchSphereRadius)

        this.touchSphere.applyMatrix4(inverseMatrix)
        const bvh = mesh.geometry['boundsTree'] || undefined

        const indices: number[] = [];

        console.time("bvh.shapecast")

        // @see https://github.com/gkjohnson/three-mesh-bvh/issues/154
        if (bvh) {
            bvh.shapecast(
                mesh,
                box => this.touchSphere.intersectsBox(box),
                (tri, a, b, c) => {

                    if (sphereIntersectTriangle(this.touchSphere, tri)) {
                        indices.push(a, b, c);
                    }

                    return false
                }
            )
        }

        console.timeEnd("bvh.shapecast")

        return indices
    }
    */


    // override
    intersectionsPhase1Raycast(params: XRTouchRayUpdateParams, joint: Group): any {
        return this.doRaycast(params.raycaster, joint.userData.origin, joint.userData.direction, 0, this.touchSphereRadius + this.touchDistance * joint.userData.speedFac)
    }

    // override
    isInTouchDistance(intersections: any[], joint: Group): boolean {
        let indices = this.checkSphereIntersection(joint, intersections[0].object)
        return indices.length > 0
    }

    // new isInTouchDistance alternative!
    isTouching(toTest: Object3D[], joint: Group): SphereTouchingResults {

        let allIndices: SphereTouchingResults = []

        for(let i = 0; i < toTest.length; i++) {
            let mesh:Mesh = toTest[i] as Mesh
            let indices = this.checkSphereIntersection(joint, mesh)
            if(indices.length > 0) {
                let result:SphereTouchingResultsItem = {
                    mesh: mesh,
                    indices: indices
                }

                allIndices.push(result)
            }
        }
        
        return allIndices
    }

    //override
    dispatchTouch(hand: Group, joint: Group, i: number, intersect: SphereTouchingResults) {
        hand.dispatchEvent({ type: "touch", detail: { joint: joint, jointIndex: i, intersect: intersect } })
        console.warn("HAND EVENT: touch!")
    }
}