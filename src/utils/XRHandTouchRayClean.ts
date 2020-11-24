
import {
    Group,
    Vector3,
    Object3D,
    Scene,
    Raycaster,
    Matrix3,
} from "svelthree-three"

export class XRHandTouchRayClean {
    tip: number[]
    distal: number[]
    intermediate: number[]
    proximal: number[]
    metacarpal: number[]

    joints: number[]
    allJoints: number[]

    enabledJoints: number[]
    currentScene: Scene

    leftHand: Group = undefined
    rightHand: Group = undefined

    toTest: Object3D[]
    useBVH: boolean = false

    touchDistance: number = 0.008

    constructor() {
        this.tip = [4, 9, 14, 19, 24]
        this.distal = [3, 8, 13, 18, 23]
        this.intermediate = [7, 12, 17, 22]
        this.proximal = [2, 6, 11, 16, 21]
        this.metacarpal = [1, 5, 10, 15, 20]

        this.joints = this.distal.concat(this.intermediate, this.proximal, this.metacarpal)
        this.allJoints = this.tip.concat(this.distal, this.intermediate, this.proximal, this.metacarpal)
    }

    // which world objects to test, have to updated on at least every frame...)
    updateToTest(currentScene: Scene) {

        this.currentScene = currentScene
        this.toTest = currentScene.children.filter(
            (child: Object3D) =>
                //all Meshes except the hand joints themselves
                child.type === "Mesh" &&
                child.parent !== this.leftHand &&
                child.parent !== this.rightHand
        )
    }

    updateBVH(useBVH: boolean) {
        this.useBVH = useBVH
    }

    updateTouchDistance(touchDistance: number) {
        this.touchDistance = touchDistance
    }

    /**
     * Limit direction change by lerping the direction.
     * Results is smooth direction change (no zappeln) at cost of accuracy.
     */
    update(
        hand: Group,
        params: XRTouchRayUpdateParams
    ) {
        this.enabledJoints = params.enabledJoints

        // run for all enabled hand-joints...
        for (let i = 0; i < this.enabledJoints.length; i++) {

            let jointIndex: number = this.enabledJoints[i]
            let joint: Group = hand.children[jointIndex] as Group

            if (joint.userData.origin !== undefined) {
                joint.userData.lastOrigin = joint.userData.origin
            }

            let currentOrigin: Vector3 = this.getJointOrigin(joint, jointIndex, params.handProfile, hand.userData.handedness)

            if (joint.userData.origin && joint.userData.direction) {
                joint.userData.direction = this.getJointDirection(joint, currentOrigin, params.lerpFactor)
                joint.userData.speedFac = this.calculateSpeedFac(joint, currentOrigin, params.xrFrameDelta)
                joint.userData.origin = currentOrigin
            } else {
                joint.userData.origin = currentOrigin
                joint.userData.direction = new Vector3(0, 0, 0)
                joint.userData.speedFac = 0
            }

            if (joint.userData.touch === undefined) { joint.userData.touch = false }
            if (joint.userData.touchInside === undefined) { joint.userData.touchInside = false }

            // intersections of the joint-direction-ray 
            let intersectionsPhase1

            // raycast Phase 1
            switch (joint.userData.touch) {
                case false:

                    /**
                     * intersectionsPhase1
                     * Cast a ray from joint's origin in its'direction (lerped).
                     * The raycaster ray's ray is limited to touchDistance*joint.userData.speedFac
                     */
                    intersectionsPhase1 = this.intersectionsPhase1Raycast(params, joint)

                    /**
                     * If the intersectionsPhase1 intersects an object...
                     */
                    if (intersectionsPhase1.length > 0) {


                        if (this.isInTouchDistance(intersectionsPhase1)) {

                            // atm this has an effect on the next frame, 
                            joint.userData.touch = true
                            joint.userData.touchObj = intersectionsPhase1[0].object
                            joint.userData.touchFaceNormal = intersectionsPhase1[0].face.normal
                            joint.userData.touchFaceIndex = intersectionsPhase1[0].faceIndex
                            joint.userData.lastTouchPoint = intersectionsPhase1[0].point
                            joint.userData.lastIntersect = undefined

                            this.addJointToTouchingArray(hand, i)
                            this.dispatchTouch(hand, joint, i, intersectionsPhase1[0])

                            this.touchingOutsideCheck(joint, i, params.raycaster, hand)
                        }
                        else {
                            //  save target
                            console.log("INTERSECTION OUTSIDE OF TOUCH DISTANCE --> SAVING TARGET!")
                            joint.userData.lastIntersect = intersectionsPhase1[0]
                        }
                    }
                    else {

                        if (joint.userData.lastIntersect !== undefined) {

                            // increase speedFac limit to prevent fast touch detection at slow motion 
                            if (joint.userData.speedFac > 2) {

                                //... and unintentional superfast touches (probably resulting from tracking glitches)
                                //if(joint.userData.speedFac < 10) {

                                console.time("FAST TOUCH - TEST")

                                // TODO  Try to make FAST TOUCH check more perfomant, old version up to 5ms, that's too expensive
                                // TASK:
                                // directional ray didn't touch anything but a frame before that it did, where are we?:
                                // ray --> shoot a ray (slightly shorter) from joints origin to last intersection point

                                // no intersection:
                                // a) INSIDE the object (behind the face) --> no intersection (with lastTouchPoint object) + the ray and the touched face normal should be pointing into same direction (dotProd > 0 --> same direction)
                                // b) we're OUTSIDE the object (in front of the face) --> no intersection (with lastTouchPoint object) + the ray and the touched face normal should be pointing into different directions (dotProd < 0 --> facing)

                                // intersection:
                                // c) we're OUTSIDE the object (on the other side) --> intersection (with lastTouchPoint object)

                                // RESOLVE:
                                // 1. shoot the ray origin --> lastIntersect.point
                                let untouchTestRaycasterDir: Vector3 = new Vector3().subVectors(joint.userData.lastIntersect.point, joint.userData.origin).normalize()
                                let untouchTestRaycasterLength: number = joint.userData.origin.distanceTo(joint.userData.lastIntersect.point)
                                let untouchTestRaycast = this.doRaycastObject(params.raycaster, joint.userData.origin, untouchTestRaycasterDir, joint.userData.lastIntersect.object, 0, untouchTestRaycasterLength * 0.99)

                                // 2. intersection / no intersection

                                // intersection
                                if (untouchTestRaycast.length > 0) {

                                    // c) we're OUTSIDE the object (on the other side) 

                                    console.time("TOUCHTHROUGH - CONDITIONAL BLOCK")

                                    joint.userData.touch = false
                                    joint.userData.touchInside = false
                                    joint.userData.lastIntersect = undefined

                                    this.dispatchTouch(hand, joint, i, joint.userData.lastIntersect)
                                    this.dispatchUntouch(hand, joint, i, untouchTestRaycast[0])
                                    this.dispatchTouchThrough(hand, joint, i, { enter: joint.userData.lastIntersect, exit: untouchTestRaycast[0] })

                                    this.resetJointTouchData(joint)

                                    console.timeEnd("TOUCHTHROUGH - CONDITIONAL BLOCK")

                                }
                                // no intersection
                                else {
                                    // get the face normal (transformed). We don't need the face normal if we're intersecting, so calculate only if not intersecting.
                                    let intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(joint.userData.lastIntersect.object.matrixWorld)
                                    let fNormal: Vector3 = joint.userData.lastIntersect.face.normal.clone().applyMatrix3(intersectedObjectNormalMatrixWorld).normalize()

                                    let dotProd: number = untouchTestRaycasterDir.dot(fNormal)

                                    // a) INSIDE the object (behind the face, dotProd > 0 --> same direction)
                                    if (dotProd > 0) {

                                        console.time("FAST TOUCH ENTER (no exit & immediate inside check) - CONDITIONAL BLOCK")
                                        // dispatch "touch" (entered but not exited)
                                        joint.userData.touch = true
                                        joint.userData.touchInside = true
                                        joint.userData.touchObj = joint.userData.lastIntersect.object
                                        joint.userData.lastTouchPoint = joint.userData.lastIntersect.point

                                        this.addJointToTouchingArray(hand, i)
                                        this.dispatchTouch(hand, joint, i, joint.userData.lastIntersect)
                                        joint.userData.lastIntersect = undefined

                                        // continue immediately with touching inside check ...
                                        this.touchingInsideCheck(joint, i, params.raycaster, hand)

                                        console.timeEnd("FAST TOUCH ENTER (no exit & immediate inside check) - CONDITIONAL BLOCK")
                                    }
                                    else if (dotProd < 0) {
                                        // b) we're OUTSIDE the object (in front of the face, dotProd < 0 --> facing)
                                        {
                                            // TODO  Scratch happens too often even at low speed (shadow gentle touch)
                                            console.time("SCRATCH - CONDITIONAL BLOCK")

                                            joint.userData.touch = false
                                            joint.userData.touchInside = false
                                            joint.userData.lastIntersect = undefined

                                            this.dispatchTouch(hand, joint, i, joint.userData.lastIntersect)
                                            this.dispatchUntouch(hand, joint, i, joint.userData.lastIntersect)
                                            this.dispatchScratch(hand, joint, i, joint.userData.lastIntersect)

                                            this.resetJointTouchData(joint)

                                            console.timeEnd("SCRATCH - CONDITIONAL BLOCK")

                                        }

                                    }

                                }
                                //  TODO limit too high speeds in order to filter out glitch-speeds    
                                /*}
                                else {
                                    console.warn("SPEED TOO HIGH --> NO FAST TOUCH!")
                                }*/

                                console.timeEnd("FAST TOUCH - TEST")
                            } else {
                                console.warn("SPEED TOO LOW --> FAST TOUCH BLOCKED (gentle touch)!")
                            }

                        }

                    }
                    break

                case true:
                    // TOUCHED!
                    switch (joint.userData.touchInside) {

                        case false:
                            this.touchingOutsideCheck(joint, i, params.raycaster, hand)
                            break

                        case true:
                            this.touchingInsideCheck(joint, i, params.raycaster, hand)
                            break

                    }
                    break
            }

        }

    }

    touchingOutsideCheck(joint: Group, i: number, raycaster: Raycaster, hand: Group): void {

        // intersections of normal-direction-ray (when touching)
        let intersectionsPhase2

        // raycasting from OUTSIDE (touching)
        // raycast using negative normal ray of touched face! (in order to get real distance)
        // use joint.userData here

        if (!joint.userData.raycasterTouchingDir) {
            // uses joint.userData.touchFaceNormal & joint.userData.touchObj, can either be set during Phase1 or FAST TOUCH
            this.setInitialRaycasterTouchingDir(joint)
        }

        intersectionsPhase2 = this.doRaycast(raycaster, joint.userData.origin, joint.userData.raycasterTouchingDir)

        if (intersectionsPhase2.length > 0) {
            joint.userData.lastTouchPoint = intersectionsPhase2[0].point

            // if we're hitting the same object and same face
            if (intersectionsPhase2[0].object === joint.userData.touchObj && intersectionsPhase2[0].faceIndex === joint.userData.touchFaceIndex) {
                this.checkUntouchOutside(hand, joint, i, intersectionsPhase2[0], "UNTOUCH - OUT OF RANGE - SAME OBJECT, SAME FACE : ", raycaster, joint.userData.origin)
            }
            // if we're hitting the same object but another face
            else if (intersectionsPhase2[0].object === joint.userData.touchObj && intersectionsPhase2[0].faceIndex !== joint.userData.touchFaceIndex) {
                this.checkUntouchOutside(hand, joint, i, intersectionsPhase2[0], "UNTOUCH - OUT OF RANGE - SAME OBJECT, NEW FACE : ", raycaster, joint.userData.origin)
            }
            // if we're hitting another object    
            else if (intersectionsPhase2[0].object !== joint.userData.touchObj) { /* TODO: ? currently nothing */ }
        }
        else {
            // we're inside
            this.touchingInsideCheck(joint, i, raycaster, hand)
        }
    }

    touchingInsideCheck(joint: Group, i: number, raycaster: Raycaster, hand: Group): void {

        let testRaycasterDir: Vector3
        let testRaycasterLength: number

        if (joint.userData.lastTouchPoint) {
            testRaycasterDir = new Vector3().subVectors(joint.userData.lastTouchPoint, joint.userData.origin)
            testRaycasterLength = joint.userData.origin.distanceTo(joint.userData.lastTouchPoint)
        }
        else {
            testRaycasterDir = new Vector3().subVectors(joint.userData.lastOrigin, joint.userData.origin)
            testRaycasterLength = joint.userData.origin.distanceTo(joint.userData.lastOrigin)
        }

        let testRaycast = this.doRaycastObject(raycaster, joint.userData.origin, testRaycasterDir, joint.userData.touchObj, 0, testRaycasterLength)

        joint.userData.lastTouchPoint = undefined

        if (testRaycast.length > 0) {

            if (testRaycast[0].point.distanceTo(joint.userData.origin) > this.touchDistance || joint.userData.speedFac > 1.1) {
                //dispatch untouch!
                console.log("TOUCH AND TOUCH INSIDE TRUE --> OBJECT EXITED (ray between origins intersected a face!)")
                this.removeJointFromTouchingArray(hand, i)
                this.dispatchUntouch(hand, joint, i, testRaycast[0])
                this.resetJointTouchData(joint)
            }
            else {
                joint.userData.touchInside = false
            }

        }
    }

    setInitialRaycasterTouchingDir(joint: Group) {
        // TODO  check one more time why we're doing this like this (normals) and write it down!
        let touchedFaceNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(joint.userData.touchObj.matrixWorld)
        let raycasterDir: Vector3 = joint.userData.touchFaceNormal.clone().applyMatrix3(touchedFaceNormalMatrixWorld).normalize().negate()
        joint.userData.raycasterTouchingDir = raycasterDir
    }

    /**
     *  Checks distance to intersected face / objects and dispatches the untouch event if needed.
     *  Changes 'joint.userData.raycasterTouchingDir' accordingly
     */
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

    /**
     * Checks if the the detected (intersected) face is also being intersected by the negative normal direction ray (from joint origin)
     * If so, a new direction is being returned 'testRaycasterDir' which will replace 'joint.userData.raycasterTouchingDir'
     */
    nnRayIntersectsFace(joint: Group, raycaster: Raycaster, origin: Vector3, intersectObj: { [key: string]: any }): Vector3 {

        // TODO  check one more time why we're doing this like this (normals) and write it down!
        let intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(intersectObj.object.matrixWorld)
        let testRaycasterDir: Vector3 = intersectObj.face.normal.clone().applyMatrix3(intersectedObjectNormalMatrixWorld).normalize().negate()

        let testRaycast = this.doRaycast(raycaster, origin, testRaycasterDir)

        if (testRaycast.length > 0 &&
            testRaycast[0].object === intersectObj.object &&
            testRaycast[0].faceIndex === intersectObj.faceIndex) {
            return testRaycasterDir
        }

        return undefined
    }

    nnRayIntersectsFaceAndIsInTouchRange(joint: Group, raycaster: Raycaster, origin: Vector3, intersectObj: { [key: string]: any }): Vector3 {

        // TODO  check one more time why we're doing this like this (normals) and write it down!
        let intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(intersectObj.object.matrixWorld)
        let testRaycasterDir: Vector3 = intersectObj.face.normal.clone().applyMatrix3(intersectedObjectNormalMatrixWorld).normalize().negate()

        let testRaycast: any[] = this.doRaycast(raycaster, origin, testRaycasterDir)

        if (this.nnRayIntersectsFaceAndIsInTouchRangeCheck(testRaycast, intersectObj)) {
            return testRaycasterDir
        }

        return undefined
    }

    /**
     * Casts a ray into a given direction and returns the intersections object limted by 'far' parameter
     */
    doRaycast(raycaster: Raycaster, origin: Vector3, direction: Vector3, near: number = 0, far: number = 0.04): any[] {

        if (this.useBVH) {
            raycaster["firstHitOnly"] = true
        }
        raycaster.set(origin, direction)
        raycaster.near = near
        raycaster.far = far

        return raycaster.intersectObjects(this.toTest, true)
    }

    /**
     * Casts a ray into a given direction and returns the intersections object limted by 'far' parameter
     */
    doRaycastObject(raycaster: Raycaster, origin: Vector3, direction: Vector3, obj: Object3D, near: number = 0, far: number = 0.04): any[] {

        if (this.useBVH) {
            raycaster["firstHitOnly"] = true
        }

        raycaster.set(origin, direction)

        raycaster.near = near
        raycaster.far = far

        return raycaster.intersectObject(obj, true)
    }

    resetJointTouchData(joint: Group) {
        joint.userData.touch = false
        joint.userData.touchInside = false
        joint.userData.touchObj = undefined
        joint.userData.touchFaceIndex = undefined
        joint.userData.touchFaceNormal = undefined
        joint.userData.raycasterTouchingDir = undefined
        joint.userData.lastTouchPoint = undefined
    }

    addJointToTouchingArray(hand: Group, i: number) {

        if (hand.userData.jointsTouching === undefined) {
            hand.userData.jointsTouching = []
        }

        if (hand.userData.jointsTouching.indexOf(i) < 0) {
            hand.userData.jointsTouching.push[i]
        }
    }

    removeJointFromTouchingArray(hand: Group, i: number) {
        if (hand.userData.jointsTouching.indexOf(i) > 0) {
            hand.userData.jointsTouching.splice(hand.userData.jointsTouching.indexOf(i), 1)
        }
    }

    dispatchUntouch(hand: Group, joint: Group, i: number, intersect: { [key: string]: any }) {
        hand.dispatchEvent({ type: "untouch", detail: { joint: joint, jointIndex: i, intersect: intersect } })
        console.warn("HAND EVENT: untouch!")
    }

    dispatchTouch(hand: Group, joint: Group, i: number, intersect: { [key: string]: any }) {
        hand.dispatchEvent({ type: "touch", detail: { joint: joint, jointIndex: i, intersect: intersect } })
        console.warn("HAND EVENT: touch!")
    }

    dispatchTouchThrough(hand: Group, joint: Group, i: number, intersects: { enter: { [key: string]: any }, exit: { [key: string]: any } }) {
        hand.dispatchEvent({ type: "touchthrough", detail: { joint: joint, jointIndex: i, intersects: intersects } })
        console.warn("HAND EVENT: touchthrough!")
    }

    dispatchScratch(hand: Group, joint: Group, i: number, intersect: { [key: string]: any }) {
        hand.dispatchEvent({ type: "scratch", detail: { joint: joint, jointIndex: i, intersect: intersect } })
        console.warn("HAND EVENT: scratch!")
    }

    getTipOriginOffset(handedness: string): number {
        let tipOriginOffset: number = 0

        // set tips offset for oculus hands to feel more natural
        handedness === "left" ? tipOriginOffset = 0.005 * -1 : null
        handedness === "right" ? tipOriginOffset = 0.005 : null

        return tipOriginOffset
    }

    getJointOrigin(joint: Group, jointIndex: number, handProfile: string, handedness: string): Vector3 {
        let origin: Vector3 = new Vector3().setFromMatrixPosition(joint.matrixWorld)

        if (handProfile === "oculus" && this.tip.indexOf(jointIndex) > -1) {
            let tipOriginOffset: number = this.getTipOriginOffset(handedness)
            origin = new Vector3(tipOriginOffset, 0, 0).applyMatrix4(joint.matrixWorld)
        }

        return origin
    }

    getJointDirection(joint: Group, currentOrigin: Vector3, lerpFactor: number = 0): Vector3 {

        let realDir = new Vector3().subVectors(currentOrigin, joint.userData.origin).normalize()

        if (lerpFactor > 0) {
            let lerpedDir = new Vector3().lerpVectors(
                joint.userData.direction,
                realDir,
                lerpFactor
            ).normalize()

            return lerpedDir
        }

        return realDir
    }

    /**
    * calculate joint speedFactor
    * How to calculate speed? Distance from last to new position / time delta
    * Speed near to zero would have to return speedFac near 1. the greater the speed, the greater the speedFac.
    */
    calculateSpeedFac(joint: Group, currentOrigin: Vector3, xrFrameDelta: number): number {
        let speedFac: number = 0

        if (joint.userData.origin) {
            let jointDistance: number = joint.userData.origin.distanceTo(currentOrigin)
            let jointSpeed: number = jointDistance / xrFrameDelta
            //speedFac = 1 + jointSpeed*2000 // no "untouch" intersection at very fast exits
            speedFac = 1 + jointSpeed * 2500 // no "untouch" intersection at very fast exits
            //speedFac = 1 + jointSpeed*3000 // 
        }

        return speedFac
    }

    intersectionsPhase1Raycast(params: XRTouchRayUpdateParams, joint: Group): any {
        return this.doRaycast(params.raycaster, joint.userData.origin, joint.userData.direction, 0, this.touchDistance * joint.userData.speedFac)
    }

    isInTouchDistance(intersections: any[]): boolean {
        return intersections[0].distance <= this.touchDistance
    }

    nnRayIntersectsFaceAndIsInTouchRangeCheck(testRaycast: any[], intersectObj: { [key: string]: any }): boolean {
        if (testRaycast.length > 0 &&
            testRaycast[0].object === intersectObj.object &&
            testRaycast[0].faceIndex === intersectObj.faceIndex &&
            this.isInTouchDistance(testRaycast)) {
            return true
        }
        return false
    }
}