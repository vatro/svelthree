import { Group, Vector3, Object3D, Scene, Raycaster } from "svelthree-three"

import { RaycasterRayHelper } from "./RaycasterRayHelper"
import { XRHandRayConfigs } from "./XRHandRayConfigs"
export class XRHandHitTester {
    raycasterRay: RaycasterRayHelper

    constructor() {
        this.raycasterRay = new RaycasterRayHelper()
    }

    /*
        // TODO: Remove this functionality, move updating hand distance to XRHandTouch, as it is irrelevant here!
        // directional Ray coming from the hand behaving like touch (negative normal ray check)
        updateHandDistance(
            hand: Group,
            currentScene: Scene,
            raycaster: Raycaster
        ) {
            //console.log("updateForwardDistance!:", hand.userData.handedness)

            let matrixSource = hand.children[10]
            let originXR1loc: Vector3
            let dirLoc: Vector3

            hand.userData.handedness === XRControllerDefaults.HANDEDNESS_LEFT
                ? (originXR1loc = XRHandRayConfigs.dirRayLfwdProps.origin.clone())
                : null
            hand.userData.handedness === XRControllerDefaults.HANDEDNESS_RIGHT
                ? (originXR1loc = XRHandRayConfigs.dirRayRfwdProps.origin.clone())
                : null
            hand.userData.handedness === XRControllerDefaults.HANDEDNESS_LEFT
                ? (dirLoc = XRHandRayConfigs.dirRayLfwdProps.direction.clone())
                : null
            hand.userData.handedness === XRControllerDefaults.HANDEDNESS_RIGHT
                ? (dirLoc = XRHandRayConfigs.dirRayRfwdProps.direction.clone())
                : null

            let originXR2loc: Vector3

            originXR2loc = originXR1loc.clone()
            originXR2loc.add(dirLoc)

            originXR1loc.applyMatrix4(matrixSource.matrixWorld)
            originXR2loc.applyMatrix4(matrixSource.matrixWorld)

            let directionXR = new Vector3()

            directionXR.subVectors(originXR2loc, originXR1loc).normalize()

            raycaster.set(originXR1loc, directionXR)

            let toTest = currentScene.children.filter(
                (child: Object3D) => child.type === "Mesh"
            )

            let intersections = []
            intersections = raycaster.intersectObjects(toTest, true)

            if (intersections.length > 0) {

                if(intersections[0].distance < 0.2) {
                    hand.userData.closeObject = intersections[0].object
                    hand.userData.closeObjectDistance = intersections[0].distance

                }
               

                if (intersections[0].distance < 0.2) {
                    this.raycasterRay.show(
                        originXR1loc,
                        directionXR,
                        currentScene,
                        5,
                        0xff0000,
                        hand.userData.handedness
                    )
                } else {
                    this.raycasterRay.show(
                        originXR1loc,
                        directionXR,
                        currentScene,
                        5,
                        0x0000ff,
                        hand.userData.handedness
                    )
                }
            } else {
                hand.userData.pinchObject = undefined
                hand.userData.pinchDistance = undefined
                this.raycasterRay.show(
                    originXR1loc,
                    directionXR,
                    currentScene,
                    5,
                    0x9ae6b4,
                    hand.userData.handedness
                )
            }

            //console.log("updateForwardDistance!", intersections.length, intersections)
        }
        */

    updatePinchRay(hand: Group, currentScene: Scene, raycaster: Raycaster) {
        //console.log("updateForwardDistance!:", hand.userData.handedness)

        // Proximal Phalanx (Index & Thumb) --> origin
        let originXR1a_world: Vector3 = new Vector3().setFromMatrixPosition(hand.children[6].matrixWorld) // Index
        let originXR1b_world: Vector3 = new Vector3().setFromMatrixPosition(hand.children[2].matrixWorld) // Thumb

        // Tips (Index & Thumb) --> target
        let originXR2a_world: Vector3 = new Vector3().setFromMatrixPosition(hand.children[9].matrixWorld) // Index
        let originXR2b_world: Vector3 = new Vector3().setFromMatrixPosition(hand.children[4].matrixWorld) // Thumb

        let origin: Vector3 = new Vector3().lerpVectors(originXR1a_world, originXR1b_world, 0.3)
        let target: Vector3 = new Vector3().lerpVectors(originXR2a_world, originXR2b_world, 0.6)

        let directionXR: Vector3
        let pinchRayPoint: Vector3
        let pinchRayLength: number

        if (!hand.userData.lastPinchRayDirection) {
            directionXR = new Vector3().subVectors(target, origin)
            hand.userData.lastPinchRayDirection = directionXR.clone().normalize()
            hand.userData.lastPinchRayPoint = target.clone()
            directionXR = hand.userData.lastPinchRayDirection
            pinchRayPoint = hand.userData.lastPinchRayPoint
        } else {
            //lerp
            directionXR = new Vector3().subVectors(target, origin)

            if (originXR2a_world.distanceTo(originXR2b_world) < 0.05) {
                let lerpedDirection: Vector3 = new Vector3().lerpVectors(
                    hand.userData.lastPinchRayDirection,
                    directionXR.normalize(),
                    0.1
                )
                let lerpedPinchRayPoint: Vector3 = new Vector3().lerpVectors(
                    hand.userData.lastPinchRayPoint,
                    target,
                    0.1
                )
                directionXR = lerpedDirection
                pinchRayPoint = lerpedPinchRayPoint
                hand.userData.lastPinchRayDirection = directionXR.clone()
                hand.userData.lastPinchRayPoint = lerpedPinchRayPoint.clone()
            } else {
                let lerpedDirection: Vector3 = new Vector3().lerpVectors(
                    hand.userData.lastPinchRayDirection,
                    directionXR.normalize(),
                    0.5
                )
                let lerpedPinchRayPoint: Vector3 = new Vector3().lerpVectors(
                    hand.userData.lastPinchRayPoint,
                    target,
                    0.5
                )
                directionXR = lerpedDirection
                pinchRayPoint = lerpedPinchRayPoint
                hand.userData.lastPinchRayDirection = directionXR.clone()
                hand.userData.lastPinchRayPoint = lerpedPinchRayPoint.clone()
            }
        }

        //debugger
        pinchRayLength = origin.distanceTo(pinchRayPoint)
        hand.userData.pinchRayLength = pinchRayLength

        raycaster.set(origin, directionXR) // infinite
        let rayScale: number = 5 // infinite / "remote" and "hybrid"

        //set ray far touch (for "remote" and "hybrid" infinite)
        if (hand.userData.pinchConfig.mode === "touch") {
            raycaster.far = pinchRayLength + hand.userData.pinchConfig.distance.touch
            rayScale = raycaster.far
        }

        let toTest = currentScene.children.filter((child: Object3D) => child.type === "Mesh")

        let intersections = []
        intersections = raycaster.intersectObjects(toTest, true)

        if (intersections.length > 0) {
            hand.userData.pinchObject = intersections[0].object
            hand.userData.pinchDistance = intersections[0].distance
        } else {
            hand.userData.pinchObject = undefined
            hand.userData.pinchDistance = undefined
        }

        let rayData = {
            origin: origin,
            direction: directionXR,
            currentScene: currentScene,
            scale: rayScale
        }

        //debugger

        switch (hand.userData.pinchConfig.mode) {
            case "remote":
                if (intersections.length > 0) {
                    if (
                        intersections[0].object.userData.svelthreeComponent.pinchRemoteEnabled() ||
                        intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                    ) {
                        this.raycasterRay.showPinchRay(
                            rayData,
                            hand.userData.pinchConfig.materials.remote,
                            hand.userData.pinchConfig.colors.remoteHit,
                            hand.userData.handedness
                        )
                    }
                } else {
                    this.raycasterRay.showPinchRay(
                        rayData,
                        hand.userData.pinchConfig.materials.remote,
                        hand.userData.pinchConfig.colors.remote,
                        hand.userData.handedness
                    )
                }
                break
            case "touch":
                if (intersections.length > 0) {
                    if (
                        intersections[0].object.userData.svelthreeComponent.pinchTouchEnabled() ||
                        intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                    ) {
                        this.raycasterRay.showPinchRay(
                            rayData,
                            hand.userData.pinchConfig.materials.touch,
                            hand.userData.pinchConfig.colors.touchHit,
                            hand.userData.handedness
                        )
                    }
                } else {
                    this.raycasterRay.showPinchRay(
                        rayData,
                        hand.userData.pinchConfig.materials.touch,
                        hand.userData.pinchConfig.colors.touch,
                        hand.userData.handedness
                    )
                }
                break
            case "hybrid":
                if (intersections.length > 0) {
                    if (intersections[0].distance <= pinchRayLength + hand.userData.pinchConfig.distance.touch) {
                        if (
                            intersections[0].object.userData.svelthreeComponent.pinchTouchEnabled() ||
                            intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                        ) {
                            //rayData.scale = pinchRayLength + hand.userData.pinchConfig.distance.touch
                            rayData.scale = pinchRayLength + hand.userData.pinchConfig.distance.touch

                            //debugger

                            this.raycasterRay.showPinchRay(
                                rayData,
                                hand.userData.pinchConfig.materials.touch,
                                hand.userData.pinchConfig.colors.touchHit,
                                hand.userData.handedness
                            )
                        } else if (
                            intersections[0].object.userData.svelthreeComponent.pinchRemoteEnabled() ||
                            intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                        ) {
                            this.raycasterRay.showPinchRay(
                                rayData,
                                hand.userData.pinchConfig.materials.remote,
                                hand.userData.pinchConfig.colors.remoteHit,
                                hand.userData.handedness
                            )
                        }
                    } else {
                        if (
                            intersections[0].object.userData.svelthreeComponent.pinchRemoteEnabled() ||
                            intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                        ) {
                            this.raycasterRay.showPinchRay(
                                rayData,
                                hand.userData.pinchConfig.materials.remote,
                                hand.userData.pinchConfig.colors.remoteHit,
                                hand.userData.handedness
                            )
                        } else {
                            this.raycasterRay.showPinchRay(
                                rayData,
                                hand.userData.pinchConfig.materials.remote,
                                hand.userData.pinchConfig.colors.remote,
                                hand.userData.handedness
                            )
                        }
                    }
                } else {
                    this.raycasterRay.showPinchRay(
                        rayData,
                        hand.userData.pinchConfig.materials.remote,
                        hand.userData.pinchConfig.colors.remote,
                        hand.userData.handedness
                    )
                }
                break
        }

        //console.log("updateForwardDistance!", intersections.length, intersections)
    }
}
