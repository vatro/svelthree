import {
    Group,
    Vector3,
    Object3D,
    Scene,
    Raycaster,
    Matrix3
} from "svelthree-three"

import { XRHandTouchRayDebugger } from "./debuggers/XRHandTouchRayDebugger"
import { XRHandTouchSphereDebugger } from "./debuggers/XRHandTouchSphereDebugger"
import { XRHandTouchJointDebugger } from "./debuggers/XRHandTouchJointDebugger"
import { XRHandTouchFaceDebugger } from "./debuggers/XRHandTouchFaceDebugger"

import XRHandJointindices from "./XRHandJointIndices"
import XRHandTouchTestModes from "./XRHandTouchTestModes"

export class XRHandTouch {
    enabledJoints: number[]
    currentScene: Scene

    leftHand: Group = undefined
    rightHand: Group = undefined

    toTest: Object3D[]
    useBVH: boolean = false

    touchDistance: number = 0.008

    debug: boolean = false
    debuggerSphere: XRHandTouchSphereDebugger
    debuggerRay: XRHandTouchRayDebugger
    jointDebugger: XRHandTouchJointDebugger
    faceDebugger: XRHandTouchFaceDebugger
    colorTouchedFaces: boolean = false

    constructor() { }

    setLeftHand(leftHand: Group) {
        this.leftHand = leftHand
    }

    setRightHand(rightHand: Group) {
        this.rightHand = rightHand
    }

    updateToTest(currentScene: Scene) {

        this.currentScene = currentScene
        this.toTest = currentScene.children.filter(
            (child: Object3D) =>
                //all Meshes except the hand joints themselves

                // also ignores XRHandTouchRayDebugger "tentacles" / Lines
                child.type === "Mesh" &&

                // ignores Hand joints etc. attached to a hand
                child.parent !== this.leftHand &&
                child.parent !== this.rightHand &&

                // ignores XRHandTouchSphereDebugger's 'touchSphereDebug' 
                child.name !== XRHandTouchSphereDebugger.touchSphereDebugName
        )
    }

    updateBVH(useBVH: boolean) {
        this.useBVH = useBVH
    }

    updateTouchDistance(touchDistance: number) {
        this.touchDistance = touchDistance
    }

    //dynamic import: we don't want to import any debugger per default
    /*
    async setDebugger(params:XRHandTouchDebuggerParams) {

        switch(params.debugMode) {
            case "ray":
                const rayDebuggerImport = await import("./XRHandTouchRayDebugger");
                const RayDebuggerClass = rayDebuggerImport.XRHandTouchRayDebugger
                this.debugger = new RayDebuggerClass()
                this.debugger.initialize(this.currentScene, this.touchDistance)
                this.debugMode = params.debugMode
                break;
            case "sphere":
                const sphereDebuggerImport = await import("./XRHandTouchSphereDebugger");
                const SphereDebuggerClass = sphereDebuggerImport.XRHandTouchSphereDebugger
                this.debugger = new SphereDebuggerClass()
                this.debugger.initialize(this.currentScene, this.touchDistance)
                this.debugMode = params.debugMode
                break;
            default:
                break;        
        }

        if(params.hightlightJoints) {
            const highlightDebuggerImport = await import("./XRHandTouchJointDebugger");
            const highlightDebuggerClass = highlightDebuggerImport.XRHandTouchJointDebugger
            this.jointDebugger = new highlightDebuggerClass()
            this.jointDebugger.initialize(this.currentScene)
        }
    }
    */

    debuggerInitiated:boolean = false

    /**
     * We can up to two 
     */
    setDebugger(params: XRHandTouchDebuggerConfig): void {

        if (params.debugConfig !== undefined) {
            if (params.debugConfig.length > 0 && params.debugConfig.length <= 2) {
                if (params.debugConfig.length === 1) {
                    this.createDebugger(params.debugConfig[0].mode, params.debugConfig[0].config)
                }

                if (params.debugConfig.length === 2) {
                    this.createDebugger(params.debugConfig[0].mode, params.debugConfig[0].config)
                    this.createDebugger(params.debugConfig[1].mode, params.debugConfig[1].config)
                }
            }
            else {
                if (params.debugConfig.length === 0) {
                    console.warn("SVELTHREE > XRHandTouch > setDebugger : No debug mode specified!")
                }
                if (params.debugConfig.length > 2) {
                    console.error("SVELTHREE > XRHandTouch > setDebugger : Only up to two debug modes allowed!")
                }
            }
        }

        /*
        if (params.debug !== undefined) {
            switch (params.debug.mode) {
                case "ray":
                    this.debugger = new XRHandTouchRayDebugger(params.debug.config as XRHandTouchRayDebuggerConfig)
                    this.debugger.initialize(this.currentScene, this.touchDistance)
                    this.debugMode = params.debug.mode
                    break;
                case "sphere":
                    this.debugger = new XRHandTouchSphereDebugger(params.debug.config as XRHandTouchSphereDebuggerConfig)
                    this.debugger.initialize(this.currentScene, this.touchDistance)
                    this.debugMode = params.debug.mode
                    break;
                default:
                    break;
            }
        }
        */

        if (params.hightlightJoints === true) {
            this.jointDebugger = new XRHandTouchJointDebugger()
            this.jointDebugger.initialize(this.currentScene)
        }

        if (params.colorTouchedFaces !== undefined) {
            this.faceDebugger = new XRHandTouchFaceDebugger()
            this.colorTouchedFaces = params.colorTouchedFaces
        }

        this.debuggerInitiated = true
    }

    createDebugger(mode: string, config: XRHandTouchRayDebuggerConfig | XRHandTouchSphereDebuggerConfig) {
        switch (mode) {
            case XRHandTouchTestModes.RAY:
                if (!this.debuggerRay) { this.setDebuggerRay(config as XRHandTouchRayDebuggerConfig) } else { console.warn("SVELTHREE > XRHandTouch > createDebugger : XRHandTouchRayDebugger was not created, it already exists!") }
                break;
            case XRHandTouchTestModes.SPHERE:
                if (!this.debuggerSphere) { this.setDebuggerSphere(config as XRHandTouchSphereDebuggerConfig) } else { console.warn("SVELTHREE > XRHandTouch > createDebugger : XRHandTouchSphereDebugger was not created, it already exists!") }
                break;
            default:
                console.error("SVELTHREE > XRHandTouch > createDebugger : Debugger was not created, unknown mode! :", { mode: mode })
                break;
        }
    }

    setDebuggerRay(config: XRHandTouchRayDebuggerConfig) {
        this.debuggerRay = new XRHandTouchRayDebugger(config as XRHandTouchRayDebuggerConfig)
        this.debuggerRay.initialize(this.currentScene, this.touchDistance)
    }

    /**
     * Only XRHandTouchSphere overrides, because debug-sphere radius should be equal collision detection sphere radius
     */
    // overriden
    setDebuggerSphere(config: XRHandTouchSphereDebuggerConfig): void {
        return
    }

    updateDebug(debug: boolean): void {
        this.debug = debug
        this.debuggerRay ? this.debuggerRay.update(debug) : null
        this.debuggerSphere ? this.debuggerSphere.update(debug) : null
    }

    /**
     * Limit direction change by lerping the direction.
     * Results is smooth direction change (no zappeln) at cost of accuracy.
     */
    update(
        hand: Group,
        params: XRTouchRayUpdateParams
    ): void {
        // run for all enabled hand-joints...
        for (let i = 0; i < params.enabledJoints.length; i++) {

            let jointIndex: number = params.enabledJoints[i]
            let joint: Group = hand.children[jointIndex] as Group

            // TODO: Check --> this sets only fingertip joints!
            if (this.debug) {
                if (this.jointDebugger) { this.jointDebugger.setJointMesh(hand, joint, i) }
                if (this.debuggerSphere && !joint.userData.debugSphere) { this.debuggerSphere.createDebugSphere(joint) }
            }

            if (joint.userData.origin !== undefined) {
                joint.userData.lastOrigin = joint.userData.origin
                if (this.debug && joint.userData.debugSphere) { this.debuggerSphere.updateDebugSpherePosition(joint) }
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

            if (this.debug && this.debuggerRay && this.debuggerRay.drawTentacles) {
                this.debuggerRay.setTentacleScales(joint.userData.speedFac)
            }

            // intersections of the joint-direction-ray 
            let intersectionsPhase1: any[]

            // raycast Phase 1
            switch (joint.userData.touch) {
                case false:

                    if (this.debug) {
                        if (this.jointDebugger) { this.jointDebugger.unhighlightJoint() }
                        if (this.debuggerRay && this.debuggerRay.drawTentacles) { this.debuggerRay.showDirectionTentacle(joint, joint.userData.origin) }
                    }

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


                        if (this.isInTouchDistance(intersectionsPhase1, joint)) {

                            // atm this has an effect on the next frame, 
                            joint.userData.touch = true
                            joint.userData.touchObj = intersectionsPhase1[0].object
                            joint.userData.touchFaceNormal = intersectionsPhase1[0].face.normal
                            joint.userData.touchFaceIndex = intersectionsPhase1[0].faceIndex
                            joint.userData.lastTouchPoint = intersectionsPhase1[0].point
                            joint.userData.lastIntersect = undefined

                            if (this.debug && this.faceDebugger) { this.faceDebugger.colorTouchedFace(intersectionsPhase1[0]) }

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

                                if (this.debug && this.debuggerRay && this.debuggerRay.drawTouchDebuggers) {
                                    this.debuggerRay.addTouchDebugLine(joint)
                                }

                                // 2. intersection / no intersection

                                // intersection
                                if (untouchTestRaycast.length > 0) {

                                    // c) we're OUTSIDE the object (on the other side) 

                                    console.time("TOUCHTHROUGH - CONDITIONAL BLOCK")

                                    if (this.debug) {
                                        if (this.faceDebugger) {
                                            this.faceDebugger.colorTouchThroughEnter(joint.userData.lastIntersect, "TOUCHTHROUGH ENTER!")
                                            this.faceDebugger.colorTouchThroughExit(untouchTestRaycast[0], "TOUCHTHROUGH EXIT!")
                                        }
                                        if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                                            this.debuggerRay.removeAllTentacles(joint)
                                        }
                                    }

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
                                        if (this.debug && this.faceDebugger) {
                                            this.faceDebugger.colorFastTouchEnter(joint.userData.lastIntersect, "FAST TOUCH ENTER!")
                                        }

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

                                            if (this.debug) {
                                                if (this.faceDebugger) { this.faceDebugger.colorScratch(joint.userData.lastIntersect, "SCRATCH!") }
                                                if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                                                    this.debuggerRay.removeAllTentacles(joint)
                                                }
                                            }

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
        if (this.debug && this.debuggerRay && this.debuggerRay.drawTentacles) {
            this.debuggerRay.removeRaycasterTestTentacle(joint)
            this.debuggerRay.removeDirectionTentacle(joint)
            this.debuggerRay.showRaycasterTouchingTentacle(joint, joint.userData.origin)
        }

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

        if (this.debug) {
            if (this.jointDebugger) { this.jointDebugger.highlightJoint() }
            if (this.debuggerRay && this.debuggerRay.drawTentacles) { this.debuggerRay.removeAllTentacles(joint) }
        }

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

        if (this.debug && this.debuggerRay && this.debuggerRay.drawTentacles) {
            this.debuggerRay.addTouchDebugLineInside(joint)
        }

        joint.userData.lastTouchPoint = undefined

        if (testRaycast.length > 0) {

            if (testRaycast[0].point.distanceTo(joint.userData.origin) > this.touchDistance || joint.userData.speedFac > 1.1) {
                //dispatch untouch!
                console.log("TOUCH AND TOUCH INSIDE TRUE --> OBJECT EXITED (ray between origins intersected a face!)")

                if (this.debug) {
                    if (this.faceDebugger) { this.faceDebugger.colorUnTouch(testRaycast[0], "TOUCH AND TOUCH INSIDE TRUE --> OBJECT EXITED!") }
                    if (this.debuggerRay && this.debuggerRay.drawTentacles) { this.debuggerRay.removeAllTentacles(joint) }
                }

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

    // overriden
    /**
     *  Checks distance to intersected face / objects and dispatches the untouch event if needed.
     *  Changes 'joint.userData.raycasterTouchingDir' accordingly
     */
    checkUntouchOutside(hand: Group, joint: Group, i: number, intersectObj: { [key: string]: any }, logMessage: String, raycaster?: Raycaster, origin?: Vector3) { }

    /**
    * Checks if the the detected (intersected) face is also being intersected by the negative normal direction ray (from joint origin)
    * If so, a new direction is being returned 'testRaycasterDir' which will replace 'joint.userData.raycasterTouchingDir'
    */
    nnRayIntersectsFace(joint: Group, raycaster: Raycaster, origin: Vector3, intersectObj: { [key: string]: any }): Vector3 {

        // TODO  check one more time why we're doing this like this (normals) and write it down!
        let intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(intersectObj.object.matrixWorld)
        let testRaycasterDir: Vector3 = intersectObj.face.normal.clone().applyMatrix3(intersectedObjectNormalMatrixWorld).normalize().negate()

        let testRaycast: any[] = this.doRaycast(raycaster, origin, testRaycasterDir)

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

        if (this.nnRayIntersectsFaceAndIsInTouchRangeCheck(testRaycast, intersectObj, joint)) {
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
        handedness === "left" ? tipOriginOffset = 0.005 : null
        handedness === "right" ? tipOriginOffset = 0.005 * -1 : null

        return tipOriginOffset
    }

    getJointOrigin(joint: Group, jointIndex: number, handProfile: string, handedness: string): Vector3 {
        let origin: Vector3 = new Vector3().setFromMatrixPosition(joint.matrixWorld)

        if (handProfile === "oculus" && XRHandJointindices.TIP.indexOf(jointIndex) > -1) {
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

    // overriden
    intersectionsPhase1Raycast(params: XRTouchRayUpdateParams, joint: Group): any {
        return {}
    }

    // overriden
    isInTouchDistance(objToCheck: any[] | number[], joint?: Group): boolean {
        return false
    }

    // overriden
    nnRayIntersectsFaceAndIsInTouchRangeCheck(testRaycast: any[], intersectObj: { [key: string]: any }, joint: Group): boolean {
        return false
    }
}
