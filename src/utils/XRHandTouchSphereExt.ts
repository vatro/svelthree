import { sphereIntersectTriangle } from "../../node_modules/three-mesh-bvh/src/Utils/MathUtilities"
import { SeparatingAxisTriangle } from "../../node_modules/three-mesh-bvh/src/Utils/SeparatingAxisTriangle.js"
import { XRHandTouch } from "./XRHandTouch"
import { Mesh, Sphere, Group, Vector3, Matrix4, Matrix3, Object3D, Triangle, XRHandModel } from "svelthree-three"
import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"

interface SphereTouchingResultsItem {
    mesh: Mesh
    indices: number[]
    tris: SeparatingAxisTriangle[]
}

interface SphereTouchingResults extends Array<SphereTouchingResultsItem> {}

export class XRHandTouchSphereExt extends XRHandTouch {
    touchSphere: Sphere
    // override
    touchSphereRadius: number

    constructor(
        lerpFactor: number = XRHandTouchDefaults.LERP_FACTOR,
        touchDistance: number = XRHandTouchDefaults.TOUCH_DISTANCE,
        sphereRadius: number = XRHandTouchDefaults.MODE_SPHERE_RADIUS
    ) {
        super()
        this.lerpFactor = lerpFactor
        this.touchDistance = touchDistance
        this.touchSphereRadius = sphereRadius
    }

    //override
    update(hand: XRHandModel, params: XRTouchRayUpdateParams, enabledJoints: number[]): void {
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

            const currentOrigin: Vector3 = this.getJointOrigin(
                joint,
                jointIndex,
                params.handProfile,
                hand.userData.handedness
            )

            // SPHERE CLEANUP: we don't want to use direction at all in sphere mode
            // TODO  maybe save direction and speed?
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

            if (this.debug) {
                if (joint.userData.debugSphere) {
                    this.debuggerSphere.updateDebugSpherePosition(joint)
                }
            }

            switch (joint.userData.touch) {
                case false:
                    console.log("FIRST CHECK!")
                    if (this.debug) {
                        if (this.jointDebugger) {
                            this.jointDebugger.unhighlightJoint()
                        }
                    }

                    const sphereTouchingResults: SphereTouchingResults = this.isTouching(this.toTest, joint)

                    if (sphereTouchingResults.length > 0) {
                        // SPHERE CLEANUP: Ok, now we have the basis to test for multiple objects, we'll use only [0] for now
                        const sphereTouchingResult: SphereTouchingResultsItem = sphereTouchingResults[0]

                        // SPHERE CLEANUP: we need different joint.userData
                        joint.userData.touch = true
                        joint.userData.sphereIntersect = true

                        // as soon as the sphere intersects the surface of an object, we're not considered to be INSIDE anymore
                        // this will intentionally break performInsideCheck()
                        joint.userData.touchInside === false

                        //joint.userData.touchObj = intersectionsPhase1[0].object
                        joint.userData.touchObj = sphereTouchingResult.mesh
                        joint.userData.touchIndices = sphereTouchingResult.indices
                        joint.userData.touchTris = sphereTouchingResult.tris

                        joint.userData.lastTouchIndices = joint.userData.touchIndices
                        joint.userData.lastTouchTris = joint.userData.touchTris

                        if (this.debuggerSphere) {
                            this.debuggerSphere.colorSphereTouch(joint.userData.touchObj, joint.userData.touchIndices)
                        }
                        if (this.jointDebugger) {
                            this.jointDebugger.highlightJoint()
                        }

                        this.addJointToTouchingArray(hand, i)
                        this.dispatchTouch(hand, joint, i, sphereTouchingResults)
                    } else {
                        // TODO : tbd // nothing?
                    }
                    break

                case true:
                    // WE TOUCHED BEFORE!
                    // First we just want to basically check intersections here ('untouch'), ARE WE STILL INTERSECTING?

                    const sphereTouchingResults2: SphereTouchingResults = this.isTouching(this.toTest, joint)

                    // NO INTERSECTION
                    if (sphereTouchingResults2.length === 0) {
                        console.log("WE TOUCHED BEFORE! --> We're touching but NOT INTERSECTING!")
                        // We're touching but NOT INTERSECTING
                        joint.userData.sphereIntersect = false

                        // WHAT DOES THAT MEAN?
                        // first, question: Are we INSIDE or OUTSIDE?
                        // a) We're INSIDE ---> do nothing
                        // b) We're OUTSIDE --> 'untouch'

                        let dotProd: number
                        let jointNormal: Vector3

                        // Run this only if we're not
                        // once we're INSIDE 'joint.userData.lastTouchTris' gets 'undefined'
                        if (joint.userData.lastTouchTris !== undefined) {
                            console.log("WE TOUCHED BEFORE! --> INSIDE / OUTSIDE CHECK!!")
                            //It should be enough to use just one point here (no need to calculate the center of the triangle)
                            jointNormal = new Vector3()
                                .subVectors(joint.userData.lastTouchTris[0].points[0], joint.userData.origin)
                                .normalize()
                            let faceNormal = new Vector3()
                            joint.userData.lastTouchTris[0].getNormal(faceNormal)
                            dotProd = jointNormal.dot(faceNormal)

                            console.log("WE TOUCHED BEFORE! --> INSIDE / OUTSIDE CHECK!! dotProd: ", dotProd)
                            dotProd > 0 ? (joint.userData.touchInside = true) : (joint.userData.touchInside = false)
                        }

                        // a) We're INSIDE ---> do nothing -->  TODO  consider dispatching 'touching'
                        if (joint.userData.touchInside === true) {
                            console.log(
                                "WE TOUCHED BEFORE! --> We're INSIDE ---> do nothing! joint.userData.touchInside: ",
                                joint.userData.touchInside
                            )

                            joint.userData.touch = true

                            joint.userData.touchIndices = undefined
                            joint.userData.touchTris = undefined

                            joint.userData.lastTouchIndices = undefined
                            joint.userData.lastTouchTris = undefined
                        }

                        // b) We're OUTSIDE --> 'untouch'
                        else {
                            console.log("WE TOUCHED BEFORE! --> We're OUTSIDE --> 'untouch'!")
                            // do 'untouch'

                            if (this.debug) {
                                if (this.jointDebugger) {
                                    this.jointDebugger.unhighlightJoint()
                                }

                                if (this.debuggerSphere) {
                                    this.debuggerSphere.colorSphereUnTouch(
                                        joint.userData.touchObj,
                                        joint.userData.touchIndices
                                    )
                                }
                            }

                            this.resetJointTouchData(joint)
                            this.removeJointFromTouchingArray(hand, i)
                            this.dispatchUntouch(hand, joint, i, null) // null details --> TODO  --> consider adding joint.userData.lastTouchIndices & joint.userData.lastTouchTris as detail
                        }
                    }

                    // INTERSECTION : we still touch the surface -->  TODO  consider dispatching 'touching'
                    else {
                        console.log("WE TOUCHED BEFORE! --> INTERSECTION : we still touch the surface!")

                        joint.userData.sphereIntersect = true
                        joint.userData.touch = true
                        joint.userData.touchInside = false

                        joint.userData.touchIndices = sphereTouchingResults2[0].indices
                        joint.userData.touchTris = sphereTouchingResults2[0].tris

                        joint.userData.lastTouchIndices = joint.userData.touchIndices
                        joint.userData.lastTouchTris = joint.userData.touchTris

                        if (this.debug) {
                            if (this.debuggerSphere) {
                                this.debuggerSphere.colorSphereTouch(
                                    joint.userData.touchObj,
                                    joint.userData.touchIndices
                                )
                            }
                        }
                    }
                    break
            }
        }
    }

    // override
    /**
     * replaces distance to face check
     */

    checkSphereIntersection(joint: Group, mesh: Mesh): checkSphereIntersectionResult {
        //console.log("checkSphereIntersection!")

        // this doesn't work!
        // this.touchSphere.set(joint.userData.origin, this.touchSphereRadius)
        this.touchSphere = new Sphere(joint.userData.origin, this.touchSphereRadius)

        //console.log("joint.userData.origin: ", joint.userData.origin)
        //console.log("this.touchSphere center", this.touchSphere.center)

        const bvh = mesh.geometry["boundsTree"] || undefined

        //console.log("bvh: ", bvh)

        const indices: number[] = []

        // @see https://threejs.org/docs/#api/en/math/Triangle
        const tris: SeparatingAxisTriangle[] = []

        //console.time("bvh.shapecast")

        if (bvh) {
            // @see MeshBVH.shapecast()
            bvh.shapecast(
                mesh,
                (box) => this.touchSphere.intersectsBox(box.applyMatrix4(mesh.matrixWorld)),
                (tri, a, b, c) => {
                    tri.a.applyMatrix4(mesh.matrixWorld)
                    tri.b.applyMatrix4(mesh.matrixWorld)
                    tri.c.applyMatrix4(mesh.matrixWorld)

                    if (sphereIntersectTriangle(this.touchSphere, tri)) {
                        indices.push(a, b, c)
                        //console.log("tri:", tri) // SeparatingAxisTriangle
                        tris.push(tri)
                    }

                    return false
                }
            )
        }

        //console.timeEnd("bvh.shapecast")

        //console.log("indices: ", indices)

        return { indices: indices, tris: tris }
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
        return this.doRaycast(
            params.raycaster,
            joint.userData.origin,
            joint.userData.direction,
            0,
            this.touchSphereRadius + this.touchDistance * joint.userData.speedFac
        )
    }

    // override
    isInTouchDistance(intersections: any[], joint: Group): boolean {
        let result: checkSphereIntersectionResult = this.checkSphereIntersection(joint, intersections[0].object)
        return result.indices.length > 0
    }

    // new isInTouchDistance alternative!
    isTouching(toTest: Object3D[], joint: Group): SphereTouchingResults {
        let allResults: SphereTouchingResults = []

        for (let i = 0; i < toTest.length; i++) {
            let mesh: Mesh = toTest[i] as Mesh
            let result: checkSphereIntersectionResult = this.checkSphereIntersection(joint, mesh)
            if (result.indices.length > 0) {
                let item: SphereTouchingResultsItem = {
                    mesh: mesh,
                    indices: result.indices,
                    tris: result.tris
                }

                allResults.push(item)
            }
        }

        return allResults
    }

    //override
    dispatchTouch(hand: XRHandModel, joint: Group, i: number, intersect: SphereTouchingResults) {
        hand.dispatchEvent({ type: "touch", detail: { joint: joint, jointIndex: i, intersect: intersect } })
        console.warn("HAND EVENT: touch!")
    }

    //override & extend
    resetJointTouchData(joint: Group) {
        super.resetJointTouchData(joint)
        joint.userData.touch = false
        joint.userData.touchInside = false
        joint.userData.touchObj = undefined
        joint.userData.touchFaceIndex = undefined
        joint.userData.touchFaceNormal = undefined
        joint.userData.raycasterTouchingDir = undefined
        joint.userData.lastTouchPoint = undefined

        //SPHERE
        joint.userData.touchIndices = undefined
        joint.userData.touchTris = undefined
        joint.userData.lastTouchIndices = undefined
        joint.userData.lastTouchTris = undefined
        joint.userData.sphereIntersect = false
    }
}

interface checkSphereIntersectionResult {
    indices: number[]
    tris: any[]
}
