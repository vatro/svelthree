import { Group, Matrix3, Object3D, Raycaster, Scene, Vector3 } from "svelthree-three"

import { XRHandTouchRayDebugger } from "./debuggers/XRHandTouchRayDebugger"
import { XRHandTouchSphereDebugger } from "./debuggers/XRHandTouchSphereDebugger"
import { XRHandTouchJointDebugger } from "./debuggers/XRHandTouchJointDebugger"
import { XRHandTouchFaceDebugger } from "./debuggers/XRHandTouchFaceDebugger"

import XRHandJointIndices from "./XRHandJointIndices"
import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
import XRControllerDefaults from "../defaults/XRControllerDefaults"
import XRDefaults from "../defaults/XRDefaults"

export class XRHandTouch {
    currentScene: Scene

    leftHand: Group = undefined
    rightHand: Group = undefined

    toTest: Object3D[]
    useBVH: boolean = false

    lerpFactor: number
    touchDistance: number

    //overridden
    touchSphereRadius: number

    debug: boolean = false
    debuggerSphere: XRHandTouchSphereDebugger
    debuggerRay: XRHandTouchRayDebugger
    jointDebugger: XRHandTouchJointDebugger
    faceDebugger: XRHandTouchFaceDebugger

    constructor() {}

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

    debuggerInitiated: boolean = false

    /**
     * We can up to two
     */
    setDebugger(params: XRHandTouchDebugParams): void {
        if (params.debugConfig) {
            if (params.debugConfig.length > 0 && params.debugConfig.length <= 2) {
                if (params.debugConfig.length === 1) {
                    this.createDebugger(params.debugConfig[0].mode, params.debugConfig[0].config)
                }

                if (params.debugConfig.length === 2) {
                    this.createDebugger(params.debugConfig[0].mode, params.debugConfig[0].config)
                    this.createDebugger(params.debugConfig[1].mode, params.debugConfig[1].config)
                }
            } else {
                if (params.debugConfig.length === 0) {
                    console.warn("SVELTHREE > XRHandTouch > setDebugger : No debug mode specified!")
                }
                if (params.debugConfig.length > 2) {
                    console.error("SVELTHREE > XRHandTouch > setDebugger : Only up to two debug modes allowed!")
                }
            }
        } else {
            // RECONSIDER: currently intended --> if there is no debug config debugger will not be created at all
        }

        if (params.hightlightJoints && params.hightlightJoints.enabled === true && !this.faceDebugger) {
            this.jointDebugger = new XRHandTouchJointDebugger()
            this.jointDebugger.initialize(this.currentScene, params.hightlightJoints.colors)
        }

        if (params.colorFaces && params.colorFaces.enabled === true && !this.faceDebugger) {
            this.faceDebugger = new XRHandTouchFaceDebugger()
            this.faceDebugger.initialize(params.colorFaces.colors)
        }

        this.debuggerInitiated = true
    }

    createDebugger(mode: string, config: XRHandTouchRayDebuggerConfig | XRHandTouchSphereDebuggerConfig) {
        switch (mode) {
            case XRHandTouchDefaults.TOUCH_TEST_MODE_RAY:
                if (!this.debuggerRay) {
                    this.setDebuggerRay(config as XRHandTouchRayDebuggerConfig)
                } else {
                    console.warn(
                        "SVELTHREE > XRHandTouch > createDebugger : XRHandTouchRayDebugger was not created, it already exists!"
                    )
                }
                break
            case XRHandTouchDefaults.TOUCH_TEST_MODE_SPHERE:
                if (!this.debuggerSphere) {
                    this.setDebuggerSphere(config as XRHandTouchSphereDebuggerConfig)
                } else {
                    console.warn(
                        "SVELTHREE > XRHandTouch > createDebugger : XRHandTouchSphereDebugger was not created, it already exists!"
                    )
                }
                break
            default:
                console.error("SVELTHREE > XRHandTouch > createDebugger : Debugger was not created, unknown mode! :", {
                    mode: mode
                })
                break
        }
    }

    setDebuggerRay(config: XRHandTouchRayDebuggerConfig) {
        this.debuggerRay = new XRHandTouchRayDebugger(config as XRHandTouchRayDebuggerConfig)
        this.debuggerRay.initialize(this.currentScene, this.touchDistance)
    }

    setDebuggerSphere(config: XRHandTouchSphereDebuggerConfig) {
        this.debuggerSphere = new XRHandTouchSphereDebugger(
            this.touchSphereRadius,
            config as XRHandTouchSphereDebuggerConfig
        )
        this.debuggerSphere.initialize(this.currentScene, this.touchDistance)
    }

    updateDebug(debug: boolean): void {
        this.debug = debug
        this.debuggerRay ? this.debuggerRay.update(debug) : null
        this.debuggerSphere ? this.debuggerSphere.update(debug) : null
    }

    /**
     * VATRO'S "DIRECTIONAL RAY HIT-TEST" PHASE 1
     *
     * RAY & SPHERE Mode!
     *
     * CURRENT CAVEATS:
     * - works only with "volume" objects: a joint entering space behind a plane would currently result in 'INSIDE'-object / 'continuous touching'-state
     *
     * Limit direction change by lerping the direction (see XRHandTouchDefaults.LERP_FACTOR)
     * Lower XRHandTouchDefaults.LERP_FACTOR values result in smoother direction change (less fidgeting) at cost of accuracy.
     */
    update(hand: Group, params: XRTouchRayUpdateParams, enabledJoints: number[]): void {
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

            if (joint.userData.origin && joint.userData.direction) {
                joint.userData.direction = this.getJointDirection(joint, currentOrigin)
                joint.userData.speedFac = this.calculateSpeedFac(joint, currentOrigin, params.xrFrameDelta)
                joint.userData.origin = currentOrigin
            } else {
                joint.userData.origin = currentOrigin
                joint.userData.direction = new Vector3(0, 0, 0)
                joint.userData.speedFac = 0
            }

            if (joint.userData.touch === undefined) {
                joint.userData.touch = false
            }
            if (joint.userData.touchInside === undefined) {
                joint.userData.touchInside = false
            }

            if (this.debug) {
                if (joint.userData.debugSphere) {
                    this.debuggerSphere.updateDebugSpherePosition(joint)
                }
                if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                    this.debuggerRay.setTentacleScales(joint.userData.speedFac)
                }
            }

            // INTERSECTIONS of "JOINT'S DIRECTIONAL RAY"
            let intersectionsPhase1: any[]

            /*
            "Joint Direction Raycast" - Phase 1
            */
            switch (joint.userData.touch) {
                case false:
                    if (this.debug) {
                        if (this.jointDebugger) {
                            this.jointDebugger.unhighlightJoint()
                        }
                        if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                            this.debuggerRay.showDirectionTentacle(joint, joint.userData.origin)
                        }
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
                    intersectionsPhase1 = this.intersectionsPhase1Raycast(params, joint)

                    // DIRECTIONAL RAY INTERSECTS --> dispatch 'TOUCH' or just SAVE 'joint.userData.lastIntersect'
                    if (intersectionsPhase1.length > 0) {
                        /*
                        TODO  Currently the 'isInTouchDistance' method is being overriden by both modes, but may need only the RAY mode method.

                        SPHERE Mode:
                        'isInTouchDistance' is only being used here, using the sphere intersection check it on every frame might be more expensive.
                        TODO  Compare performance between RAY and SPHERE mode distance check
                        Since we're keeping the reference to the raycasted face in order to have the 'center face' anyway, we could safely replace it
                        with the RAY mode method. Especially if we ...
                        TODO  Consider setting 'touchDistance' to 'touchSphereRadius' or vice versa by default!
                         */

                        if (this.isInTouchDistance(intersectionsPhase1, joint)) {
                            /*
                            Reaching this block means:
                            - the 'touch' event occurred OUTSIDE (joint is not inside the object)
                            - on next frame 'case true:' block is being executed performing 'touchingOutsideCheck'

                             */

                            joint.userData.touch = true
                            joint.userData.touchObj = intersectionsPhase1[0].object
                            joint.userData.touchFaceNormal = intersectionsPhase1[0].face.normal
                            joint.userData.touchFaceIndex = intersectionsPhase1[0].faceIndex
                            joint.userData.lastTouchPoint = intersectionsPhase1[0].point
                            joint.userData.lastIntersect = undefined

                            if (this.debug && this.faceDebugger) {
                                this.faceDebugger.colorTouchedFace(intersectionsPhase1[0], null)
                            }

                            this.addJointToTouchingArray(hand, i)
                            this.dispatchTouch(hand, joint, i, intersectionsPhase1[0])

                            this.touchingOutsideCheck(joint, i, params.raycaster, hand)
                        } else {
                            // save target
                            console.log("INTERSECTION OUTSIDE OF TOUCH DISTANCE --> SAVING TARGET!")
                            joint.userData.lastIntersect = intersectionsPhase1[0]
                        }
                    } else {
                        /*
                          Reaching this block means:
                          - the directional joint ray didn't intersect something, which could again mean:
                            [!] It cannot mean joint entered the object while 'touching', because this block is part of (joint.userData.touch === FALSE) block!

                            a) Joint is NOT TOUCHING YET but is INSIDE the object --> 'FAST TOUCH': should dispatch 'touch' event!
                               In this case 'joint.userData.touch' should be set to TRUE

                            b) Joint is NOT TOUCHING, it went through the object and is now OUTSIDE the object again --> 'TOUCH THROUGH': should dispatch 'touchthrough' event!
                               In this case 'joint.userData.touch' should still be / set to FALSE

                            c) Joint is NOT TOUCHING and it didn't enter / exit the object

                         */

                        if (joint.userData.lastIntersect !== undefined) {
                            /*
                            Reaching this block means:
                            Joint direction ray DID intersect something before reaching this block, but no 'touch' event was dispatched, because it was too fast:
                            It was outside of 'touchDistance' at the moment of intersection, so only the intersection (joint.userData.lastIntersect) was saved,
                            see above 'if (intersectionsPhase1.length > 0) {}' --> 'ELSE {...}'
                            On the next frame though (NOW) it's suddenly (because too fast) either INSIDE or OUTSIDE the object [see above: a) or b) or c)]
                             */

                            /*
                            Increase speedFac limit to prevent fast touch detection at lower motion speed.
                            Higher 'SPEEDFAC_LIMIT_LOW' will allow only faster joints (longer directional rays) to enter the 'FAST TOUCH' check block otherwise
                            nothing will happen and 'joint.userData.lastIntersect'
                            they will be internally specified as 'CANCELED TOUCH', which means:
                            TODO  CONFIRM THIS!!!
                            TOFIX  Atm we're getting 'glitches' identified as 'scratches'
                            a joint was fast approaching (long directional ray) the object, initially caught / saved the intersection (directional ray intersected object),
                            but on next frame it got slower (shrinking the directional ray) still outside of 'touchDistance', or moved in the opposite direction.
                             */
                            if (joint.userData.speedFac > XRHandTouchDefaults.SPEEDFAC_LIMIT_LOW) {
                                /*
                                TODO  Find upper speedFac limit value for adding unintentional superfast touches detection (resulting from tracking glitches)
                                We want to detect "real" scratches but sort out tracking glitches.
                                if (joint.userData.speedFac < XRHandTouchDefaults.SPEEDFAC_LIMIT_HIGH) {
                                TODO  or maybe just limit the LENGTH of the ray (means NOT using XRHandTouchDefaults.SPEEDFAC_LIMIT_HIGH)

                                 */

                                // TODO  Check FAST TOUCH check performance (old version was 5 ms, which was too expensive)
                                console.time("FAST TOUCH - TEST")

                                /*
                                TO SOLVE:
                                --------
                                Directional ray didn't intersect (intersectionsPhase1.length === 0) but in the previous frame it did.
                                SPECIFY AND HANDLE THE LOCATION OF THE JOINT!

                                 */

                                /*
                                SOLUTION CONCEPT:
                                ----------------

                                1. Shoot a slightly shorter ray from joint's origin to 'lastIntersect'-point
                                    a) Calculate ray's direction and length
                                    b) Raycast with slightly shorter than calculated ray (*0.99) in order to detect empty space inside the object

                                2. Check intersection with lastTouchPoint object
                                    if true (intersection.length > 0) then
                                    a) OUTSIDE the object and behind the 'lastIntersect'-face --> the RAY from joint's origin to 'lastIntersect'-point INTERSECTS!

                                if false (intersection.length === 0) then

                                    b) INSIDE the object (behind the face):
                                       --> the RAY from joint's origin to 'lastIntersect'-point DOESN'T INTERSECT!
                                           + the RAY and the 'lastIntersect'-FACE-NORMAL should be pointing into SAME DIRECTION (dotProd > 0 --> same direction)

                                    c) OUTSIDE the object (not inside and did not enter space behind the face, so we cannot be on the other side either):
                                       --> the RAY from joint's origin to 'lastIntersect'-point DOESN'T INTERSECT!
                                           + the RAY and the 'lastIntersect'-FACE-NORMAL should be pointing into DIFFERENT DIRECTIONS (dotProd < 0 --> facing)

                                 */

                                /*
                                APPLIED SOLUTION:
                                ----------------
                                */

                                // 1 a) Calculate ray's direction and length
                                const untouchTestRaycasterDir: Vector3 = new Vector3()
                                    .subVectors(joint.userData.lastIntersect.point, joint.userData.origin)
                                    .normalize()
                                const untouchTestRaycasterLength: number = joint.userData.origin.distanceTo(
                                    joint.userData.lastIntersect.point
                                )

                                // 1 b) Raycast with slightly shorter than calculated ray (*0.99)
                                const untouchTestRaycast = this.doRaycastObject(
                                    params.raycaster,
                                    joint.userData.origin,
                                    untouchTestRaycasterDir,
                                    joint.userData.lastIntersect.object,
                                    0,
                                    untouchTestRaycasterLength * 0.99
                                )

                                if (this.debug && this.debuggerRay && this.debuggerRay.drawTouchDebuggers) {
                                    this.debuggerRay.addTouchDebugLine(joint)
                                }

                                // 2 Check intersection with lastTouchPoint object

                                // 2 a) 'TOUCHTHROUGH' (also 'TOUCH' + 'UNTOUCH'): OUTSIDE the object and behind the 'lastIntersect'-face
                                if (untouchTestRaycast.length > 0) {
                                    console.time("TOUCHTHROUGH - CONDITIONAL BLOCK")

                                    if (this.debug) {
                                        if (this.faceDebugger) {
                                            this.faceDebugger.colorTouchThroughEnter(
                                                joint.userData.lastIntersect,
                                                "TOUCHTHROUGH ENTER!"
                                            )
                                            this.faceDebugger.colorTouchThroughExit(
                                                untouchTestRaycast[0],
                                                "TOUCHTHROUGH EXIT!"
                                            )
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
                                    this.dispatchTouchThrough(hand, joint, i, {
                                        enter: joint.userData.lastIntersect,
                                        exit: untouchTestRaycast[0]
                                    })

                                    this.resetJointTouchData(joint)

                                    console.timeEnd("TOUCHTHROUGH - CONDITIONAL BLOCK")
                                }
                                // No intersection --> 'TOUCH' (inside) or 'SCRATCH' (outside) based on 'dotProd' (facing of normals)
                                else {
                                    // get the face normal (transformed). We don't need the face normal if we're intersecting, so calculate only if not intersecting.
                                    const intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(
                                        joint.userData.lastIntersect.object.matrixWorld
                                    )
                                    const fNormal: Vector3 = joint.userData.lastIntersect.face.normal
                                        .clone()
                                        .applyMatrix3(intersectedObjectNormalMatrixWorld)
                                        .normalize()

                                    const dotProd: number = untouchTestRaycasterDir.dot(fNormal)

                                    // 2 b) 'TOUCH' : INSIDE the object (behind the face) : dispatch 'touch' then --> touchingInsideCheck
                                    if (dotProd > 0) {
                                        console.time(
                                            "FAST TOUCH ENTER (no exit & immediate inside check) - CONDITIONAL BLOCK"
                                        )
                                        // dispatch "touch" (entered but not exited)
                                        if (this.debug && this.faceDebugger) {
                                            this.faceDebugger.colorFastTouchEnter(
                                                joint.userData.lastIntersect,
                                                "FAST TOUCH ENTER!"
                                            )
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

                                        console.timeEnd(
                                            "FAST TOUCH ENTER (no exit & immediate inside check) - CONDITIONAL BLOCK"
                                        )
                                    }

                                    // 2 c) 'SCRATCH' : OUTSIDE the object (not inside and did not enter space behind the face, so we cannot be on the other side either)
                                    else if (dotProd < 0) {
                                        console.time("SCRATCH - CONDITIONAL BLOCK")

                                        if (this.debug) {
                                            if (this.faceDebugger) {
                                                this.faceDebugger.colorScratch(joint.userData.lastIntersect, "SCRATCH!")
                                            }
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
                                // TODO  see above: Find upper speedFac limit value for adding unintentional superfast touches detection
                                /*}
                                else {
                                    console.warn("SPEED TOO HIGH --> NO FAST TOUCH!")
                                }*/

                                console.timeEnd("FAST TOUCH - TEST")
                            } else {
                                console.warn("SPEED TOO LOW --> FAST TOUCH CHECK BLOCKED ('CANCELED TOUCH')!")
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

    /**
     * VATRO'S "DIRECTIONAL RAY HIT-TEST" - PHASE 2 - TOUCHING & OUTSIDE
     *
     * RAY & SPHERE Mode!
     * [!] the 'checkUntouchOutside' method is being overridden by both modes!
     * @see XRHandTouchSphereExt.checkUntouchOutside
     * @see XRHandTouchRayExt.checkUntouchOutside
     *
     * Joint's status: TOUCH (joint.userData.touch === true) OUTSIDE (joint.userData.touchInside === false)!
     *
     * Second set of raycasts performed after a joint has touched a face being OUTSIDE of the object in order to prevent
     * multiple 'touch' event dispatching, check if the joint maybe moved INSIDE the object or if it's OUT OF 'touchDistance'
     * and we should dispatch an 'untouch' event.
     *
     * Perform raycast via "NEGATIVE NORMAL direction ray" and handle the result:
     *
     * a) SAME : SAME
     *    "NEGATIVE NORMAL direction ray" is intersecting (joint is "above") the SAME face of the SAME object:
     *    Check if 'untouch' event should be dispatched: {@see XRHandTouchRayExt.checkUntouchOutside}
     *
     * b) DIFFERENT : SAME
     *    "NEGATIVE NORMAL direction ray" is intersecting (joint is "above") a DIFFERENT face of the SAME object:
     *    Check if joint.userData should be updated or if an 'untouch' event should be dispatched: {@see XRHandTouchRayExt.checkUntouchOutside}
     *
     * c) DIFFERENT : DIFFERENT
     *    "NEGATIVE NORMAL direction ray" is intersecting (joint is "above") a DIFFERENT face of a DIFFERENT object?
     *    TODO  tbd
     *
     * d) NO INTERSECT:
     *    "NEGATIVE NORMAL direction ray" doesn't intersect!
     *    Check if joint is INSIDE the object or OUTSIDE out of 'touchDistance' and should 'untouch': {@see touchingInsideCheck}
     */
    touchingOutsideCheck(joint: Group, i: number, raycaster: Raycaster, hand: Group): void {
        /*
        Raycasting from OUTSIDE (touching)
        Raycast using negative normal ray of touched face! (in order to get real distance)
        */

        if (!joint.userData.raycasterTouchingDir) {
            joint.userData.raycasterTouchingDir = this.getNegativeNormalRay(joint)
        }

        /**
         * Intersections of "NEGATIVE NORMAL direction ray" during Phase 2 (while touching)
         */
        const intersectionsPhase2 = this.doRaycast(
            raycaster,
            joint.userData.origin,
            joint.userData.raycasterTouchingDir
        )

        if (this.debug && this.debuggerRay && this.debuggerRay.drawTentacles) {
            this.debuggerRay.removeRaycasterTestTentacle(joint)
            this.debuggerRay.removeDirectionTentacle(joint)
            this.debuggerRay.showRaycasterTouchingTentacle(joint, joint.userData.origin)
        }

        /*
        Perform raycast via "NORMAL direction ray" and analyze intersection
         */

        // INTERSECTS:
        if (intersectionsPhase2.length > 0) {
            if (this.debug && this.jointDebugger) {
                this.jointDebugger.highlightJoint()
            }
            joint.userData.lastTouchPoint = intersectionsPhase2[0].point

            // a) SAME : SAME
            if (
                intersectionsPhase2[0].object === joint.userData.touchObj &&
                intersectionsPhase2[0].faceIndex === joint.userData.touchFaceIndex
            ) {
                this.checkUntouchOutside(
                    hand,
                    joint,
                    i,
                    intersectionsPhase2[0],
                    "UNTOUCH - OUT OF RANGE - SAME OBJECT, SAME FACE : ",
                    raycaster,
                    joint.userData.origin
                )
            }
            // b) DIFFERENT : SAME
            else if (
                intersectionsPhase2[0].object === joint.userData.touchObj &&
                intersectionsPhase2[0].faceIndex !== joint.userData.touchFaceIndex
            ) {
                this.checkUntouchOutside(
                    hand,
                    joint,
                    i,
                    intersectionsPhase2[0],
                    "UNTOUCH - OUT OF RANGE - SAME OBJECT, NEW FACE : ",
                    raycaster,
                    joint.userData.origin
                )
            }
            // c) DIFFERENT : DIFFERENT
            else if (intersectionsPhase2[0].object !== joint.userData.touchObj) {
                /* currently nothing happens here */
                // TODO  tbd
            }

            // d) NO INTERSECT:
        } else {
            this.touchingInsideCheck(joint, i, raycaster, hand)
        }
    }

    /**
     * VATRO'S "DIRECTIONAL RAY HIT-TEST" - TOUCHING & INSIDE
     *
     * RAY & SPHERE Mode!
     * [!] ATM we're using {@see XRHandTouchSphereExt.checkSphereIntersection} {@see touchingOutsideCheck} only the detect UNTOUCH OUTSIDE! This means in SPHERE Mode we're also raycasting
     * and keeping track of the single touched face as well as all faces intersected by the sphere. This could be useful, because this way we have access to
     * a 'center face' of all touched faces (raytraced face + sphere intersected faces)
     *
     * TODO  Check touching inside in SPHERE Mode!
     *
     * Joint is INSIDE the object and is TOUCHING!
     * This function will only be executed if 'joint.userData.touchInside === true' in following cases:
     *
     * 1. "Joint Direction Raycast" - Phase 2 / {@see touchingOutsideCheck}
     *    [ Phase 1 -> (intersectionsPhase1.length > 0) -> touchingOutsideCheck() --> Phase 2 -> (else)(intersectionsPhase2.length === 0) -> touchingInsideCheck() ]
     *
     * 2. During the execution of "2 b) 'TOUCH' : INSIDE the object (behind the face)" block / check
     *
     *  a) This function gets called ONCE immediately after a 'touch' event has been dispatched during the execution of "2 b) 'TOUCH' : INSIDE the object (behind the face)" block / check
     *     in order to visualize 'inside movement trail' via 'debuggerRay' (if active) {@see XRHandTouchRayDebugger.addTouchDebugLineInside}
     *
     *  b) It will then be executed on every frame as long as the joint is still 'touching' inside ( joint.userData.touchInside === true).
     *     If this function detects joint's EXIT out of the object it will check if the joint is still in 'touchDistance' (on exit):
     *      - if no: it will dispatch an 'untouch' event and won't be automatically executed on next frame
     *      - if yes: it will 'do nothing' except visualizing the 'inside movement trail' of the joint via 'debuggerRay' (if active)
     *                + changing 'joint.userData.touchInside' to 'false' --> on next frame 'touchingOutsideCheck' will be executed instead of this function.
     */
    touchingInsideCheck(joint: Group, i: number, raycaster: Raycaster, hand: Group): void {
        if (this.debug) {
            if (this.jointDebugger) {
                this.jointDebugger.highlightJoint()
            }
            if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                this.debuggerRay.removeAllTentacles(joint)
            }
        }

        let testRaycasterDir: Vector3
        let testRaycasterLength: number

        /*
        Cast a ray from joint's origin to 'joint.userData.lastTouchPoint' (being set every time a 'touch' event was dispatched) if available. It's always available
        on first run, but is then being set to undefined, because we actually want to check for intersections of a ray between joint's current (origin) and previous (lastOrigin)
        position in order to verify that the joint is still inside the object (ray not intersecting --> empty space inside object)
         */

        // RAYCAST : origin --> lastTouchPoint (on first run)
        if (joint.userData.lastTouchPoint) {
            testRaycasterDir = new Vector3()
                .subVectors(joint.userData.lastTouchPoint, joint.userData.origin)
                .normalize()
            testRaycasterLength = joint.userData.origin.distanceTo(joint.userData.lastTouchPoint)

            // RAYCAST : origin --> lastOrigin (on every subsequent run while the joint is still 'inside')
        } else {
            testRaycasterDir = new Vector3().subVectors(joint.userData.lastOrigin, joint.userData.origin).normalize()
            testRaycasterLength = joint.userData.origin.distanceTo(joint.userData.lastOrigin)
        }

        const testRaycast = this.doRaycastObject(
            raycaster,
            joint.userData.origin,
            testRaycasterDir,
            joint.userData.touchObj,
            0,
            testRaycasterLength
        )

        if (this.debug && this.debuggerRay && this.debuggerRay.drawTouchDebuggers) {
            this.debuggerRay.addTouchDebugLineInside(joint)
        }

        // RESET 'lastTouchPoint' --> in order to use joint's origins only for the next raycast
        joint.userData.lastTouchPoint = undefined

        if (testRaycast.length > 0) {
            // 'UNTOUCH' --> EXITED and is OUT OF 'touchDistance'
            // TODO  what is it about speedFac here?
            if (
                testRaycast[0].point.distanceTo(joint.userData.origin) > this.touchDistance ||
                joint.userData.speedFac > 1.1
            ) {
                console.log("TOUCH AND TOUCH INSIDE TRUE --> OBJECT EXITED (ray between origins intersected a face!)")

                if (this.debug) {
                    if (this.faceDebugger) {
                        this.faceDebugger.colorUnTouch(testRaycast[0], "TOUCH AND TOUCH INSIDE TRUE --> OBJECT EXITED!")
                    }
                    if (this.debuggerRay && this.debuggerRay.drawTentacles) {
                        this.debuggerRay.removeAllTentacles(joint)
                    }
                }

                this.removeJointFromTouchingArray(hand, i)
                this.dispatchUntouch(hand, joint, i, testRaycast[0])
                this.resetJointTouchData(joint)

                // EXITED (outside) but still TOUCHING (in 'touchDistance') --> change 'touchInside' to false
            } else {
                joint.userData.touchInside = false
            }
        }
    }

    /**
     * RAY & SPHERE Mode!
     *
     * Get the normal of touched face, convert it to world space and negate it's direction.
     * The negated and normalized direction is used for casting a PERPENDICULAR ray from joint's origin towards the face
     * during VATRO'S "DIRECTIONAL RAY HIT-TEST" - PHASE 2 - TOUCHING & OUTSIDE {@see touchingOutsideCheck}.
     * The result of this function is being applied to 'joint.userData.raycasterTouchingDir' inside {@see touchingOutsideCheck}
     */
    getNegativeNormalRay(joint: Group): Vector3 {
        const touchedFaceNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(joint.userData.touchObj.matrixWorld)
        return joint.userData.touchFaceNormal.clone().applyMatrix3(touchedFaceNormalMatrixWorld).normalize().negate()
    }

    // overriden
    /**
     * RAY & SPHERE Mode!
     *
     *  Checks distance to intersected face / objects and dispatches the untouch event if needed.
     *  - RAY Mode: alters / uses 'joint.userData.raycasterTouchingDir' if using {@see XRHandTouchRayExt}
     *  - SPHERE Mode: uses the result of {@see XRHandTouchSphereExt.checkSphereIntersection} (indices) if using {@see XRHandTouchSphereExt}
     */
    checkUntouchOutside(
        hand: Group,
        joint: Group,
        i: number,
        intersectObj: { [key: string]: any },
        logMessage: String,
        raycaster?: Raycaster,
        origin?: Vector3
    ) {}

    /**
     * RAY Mode only!
     *
     * Checks if the the intersected face is also being intersected by the "NEGATIVE NORMAL direction ray" (starting from joint's origin)
     * If so, a new direction 'testRaycasterDir' is being returned and applied to 'joint.userData.raycasterTouchingDir' {@see XRHandTouchRayExt.checkUntouchOutside}
     */
    nnRayIntersectsFace(
        joint: Group,
        raycaster: Raycaster,
        origin: Vector3,
        intersectObj: { [key: string]: any }
    ): Vector3 {
        const intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(
            intersectObj.object.matrixWorld
        )
        const testRaycasterDir: Vector3 = intersectObj.face.normal
            .clone()
            .applyMatrix3(intersectedObjectNormalMatrixWorld)
            .normalize()
            .negate()

        const testRaycast: any[] = this.doRaycast(raycaster, origin, testRaycasterDir)

        if (
            testRaycast.length > 0 &&
            testRaycast[0].object === intersectObj.object &&
            testRaycast[0].faceIndex === intersectObj.faceIndex
        ) {
            return testRaycasterDir
        }

        return undefined
    }

    /**
     * RAY Mode only!
     *
     * Checks if the the intersected face is also being intersected by the "NEGATIVE NORMAL direction ray" (starting from joint's origin)
     * and if it's in 'touchDistance', if so it retruns the new direction
     */
    nnRayIntersectsFaceAndIsInTouchRange(
        joint: Group,
        raycaster: Raycaster,
        origin: Vector3,
        intersectObj: { [key: string]: any }
    ): Vector3 {
        const intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(
            intersectObj.object.matrixWorld
        )
        const testRaycasterDir: Vector3 = intersectObj.face.normal
            .clone()
            .applyMatrix3(intersectedObjectNormalMatrixWorld)
            .normalize()
            .negate()

        const testRaycast: any[] = this.doRaycast(raycaster, origin, testRaycasterDir)

        if (this.nnRayIntersectsFaceAndIsInTouchRangeCheck(testRaycast, intersectObj, joint)) {
            return testRaycasterDir
        }

        return undefined
    }

    /**
     * Casts a ray into a given direction and returns the intersections object limited by 'far' parameter
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
     * Casts a ray into a given direction and returns the intersections object limited by 'far' parameter
     */
    doRaycastObject(
        raycaster: Raycaster,
        origin: Vector3,
        direction: Vector3,
        obj: Object3D,
        near: number = 0,
        far: number = 0.04
    ): any[] {
        if (this.useBVH) {
            raycaster["firstHitOnly"] = true
        }

        raycaster.set(origin, direction)

        raycaster.near = near
        raycaster.far = far

        return raycaster.intersectObject(obj, true)
    }

    // overridden & extended by SPHERE
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

    getTipOriginOffset(handedness: string): number {
        let tipOriginOffset: number = 0

        // set tips offset for oculus hands to feel more natural
        handedness === XRControllerDefaults.HANDEDNESS_LEFT ? (tipOriginOffset = 0.005) : null
        handedness === XRControllerDefaults.HANDEDNESS_RIGHT ? (tipOriginOffset = 0.005 * -1) : null

        return tipOriginOffset
    }

    /**
     * Returns joint's origin.
     * Slightly offset if using XRDefaults.HAND_PROFILE_OCULUS 'handProfile'
     */
    getJointOrigin(joint: Group, jointIndex: number, handProfile: string, handedness: string): Vector3 {
        let origin: Vector3 = new Vector3().setFromMatrixPosition(joint.matrixWorld)

        if (handProfile === XRDefaults.HAND_PROFILE_OCULUS && XRHandJointIndices.TIP.indexOf(jointIndex) > -1) {
            const tipOriginOffset: number = this.getTipOriginOffset(handedness)
            origin = new Vector3(tipOriginOffset, 0, 0).applyMatrix4(joint.matrixWorld)
        }

        return origin
    }

    getJointDirection(joint: Group, currentOrigin: Vector3): Vector3 {
        const realDir = new Vector3().subVectors(currentOrigin, joint.userData.origin).normalize()

        if (this.lerpFactor > 0) {
            return new Vector3().lerpVectors(joint.userData.direction, realDir, this.lerpFactor).normalize()
        }

        return realDir
    }

    /**
     * Calculates joint speedFactor
     * How to calculate speed? Distance from last to new position / time delta
     * Speed near to zero would have to return speedFac near 1. the greater the speed, the greater the speedFac.
     */
    calculateSpeedFac(joint: Group, currentOrigin: Vector3, xrFrameDelta: number): number {
        let speedFac: number = 0

        if (joint.userData.origin) {
            const jointDistance: number = joint.userData.origin.distanceTo(currentOrigin)
            const jointSpeed: number = jointDistance / xrFrameDelta
            speedFac = 1 + jointSpeed * XRHandTouchDefaults.SPEEDFAC_JOINTSPEED_MULTIPLIER
        }

        return speedFac
    }

    // overridden
    intersectionsPhase1Raycast(params: XRTouchRayUpdateParams, joint: Group): any {
        return {}
    }

    // overridden
    isInTouchDistance(objToCheck: any[] | number[], joint?: Group): boolean {
        return false
    }

    // overridden
    nnRayIntersectsFaceAndIsInTouchRangeCheck(
        testRaycast: any[],
        intersectObj: { [key: string]: any },
        joint: Group
    ): boolean {
        return false
    }

    // Dispatching Events

    dispatchUntouch(hand: Group, joint: Group, i: number, intersect: { [key: string]: any }) {
        hand.dispatchEvent({ type: "untouch", detail: { joint: joint, jointIndex: i, intersect: intersect } })
        console.warn("HAND EVENT: untouch!")
    }

    // overridden by SPHERE
    dispatchTouch(hand: Group, joint: Group, i: number, intersect: { [key: string]: any }) {
        hand.dispatchEvent({ type: "touch", detail: { joint: joint, jointIndex: i, intersect: intersect } })
        console.warn("HAND EVENT: touch!")
    }

    dispatchTouchThrough(
        hand: Group,
        joint: Group,
        i: number,
        intersects: { enter: { [key: string]: any }; exit: { [key: string]: any } }
    ) {
        hand.dispatchEvent({ type: "touchthrough", detail: { joint: joint, jointIndex: i, intersects: intersects } })
        console.warn("HAND EVENT: touchthrough!")
    }

    dispatchScratch(hand: Group, joint: Group, i: number, intersect: { [key: string]: any }) {
        hand.dispatchEvent({ type: "scratch", detail: { joint: joint, jointIndex: i, intersect: intersect } })
        console.warn("HAND EVENT: scratch!")
    }
}
