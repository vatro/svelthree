import { Vector3, Object3D, Scene, Raycaster, Group } from "svelthree-three"

import { RaycasterRayHelper } from "./RaycasterRayHelper"
import XRHandTouchDefaults from "../defaults/XRHandTouchDefaults"
import XRControllerDefaults from "../defaults/XRControllerDefaults"

export default class XRHandPinch {
    raycasterRay: RaycasterRayHelper

    constructor() {
        this.raycasterRay = new RaycasterRayHelper()
    }

    updatePinchRay(handSpace: Group, currentScene: Scene, raycaster: Raycaster) {
        //console.log("updateForwardDistance!:", handSpace.userData.handedness)

        // Proximal Phalanx (Index & Thumb) --> origin
        let originXR1a_world: Vector3 = new Vector3().setFromMatrixPosition(handSpace.children[6].matrixWorld) // Index
        let originXR1b_world: Vector3 = new Vector3().setFromMatrixPosition(handSpace.children[2].matrixWorld) // Thumb

        // Tips (Index & Thumb) --> target
        let originXR2a_world: Vector3 = new Vector3().setFromMatrixPosition(handSpace.children[9].matrixWorld) // Index
        let originXR2b_world: Vector3 = new Vector3().setFromMatrixPosition(handSpace.children[4].matrixWorld) // Thumb

        let origin: Vector3 = new Vector3().lerpVectors(originXR1a_world, originXR1b_world, 0.3)
        let target: Vector3 = new Vector3().lerpVectors(originXR2a_world, originXR2b_world, 0.6)

        let directionXR: Vector3
        let pinchRayPoint: Vector3
        let pinchRayLength: number

        if (!handSpace.userData.lastPinchRayDirection) {
            directionXR = new Vector3().subVectors(target, origin)
            handSpace.userData.lastPinchRayDirection = directionXR.clone().normalize()
            handSpace.userData.lastPinchRayPoint = target.clone()
            directionXR = handSpace.userData.lastPinchRayDirection
            pinchRayPoint = handSpace.userData.lastPinchRayPoint
        } else {
            //lerp
            directionXR = new Vector3().subVectors(target, origin)

            if (originXR2a_world.distanceTo(originXR2b_world) < 0.05) {
                let lerpedDirection: Vector3 = new Vector3().lerpVectors(
                    handSpace.userData.lastPinchRayDirection,
                    directionXR.normalize(),
                    0.1
                )
                let lerpedPinchRayPoint: Vector3 = new Vector3().lerpVectors(
                    handSpace.userData.lastPinchRayPoint,
                    target,
                    0.1
                )
                directionXR = lerpedDirection
                pinchRayPoint = lerpedPinchRayPoint
                handSpace.userData.lastPinchRayDirection = directionXR.clone()
                handSpace.userData.lastPinchRayPoint = lerpedPinchRayPoint.clone()
            } else {
                let lerpedDirection: Vector3 = new Vector3().lerpVectors(
                    handSpace.userData.lastPinchRayDirection,
                    directionXR.normalize(),
                    0.5
                )
                let lerpedPinchRayPoint: Vector3 = new Vector3().lerpVectors(
                    handSpace.userData.lastPinchRayPoint,
                    target,
                    0.5
                )
                directionXR = lerpedDirection
                pinchRayPoint = lerpedPinchRayPoint
                handSpace.userData.lastPinchRayDirection = directionXR.clone()
                handSpace.userData.lastPinchRayPoint = lerpedPinchRayPoint.clone()
            }
        }

        // PINCH VISUALIZER

        pinchRayLength = origin.distanceTo(pinchRayPoint)
        handSpace.userData.pinchRayLength = pinchRayLength

        raycaster.set(origin, directionXR) // infinite
        let rayScale: number = 5 // infinite / "remote" and "hybrid"

        //set ray far touch (for "remote" and "hybrid" infinite)
        if (handSpace.userData.pinchConfig.mode === "touch") {
            raycaster.far = pinchRayLength + handSpace.userData.pinchConfig.distance.touch
            rayScale = raycaster.far
        }

        const toTest = currentScene.children.filter(
            (child: Object3D) =>
                // all Meshes except the handSpace joints themselves
                // also ignores XRHandTouchRayDebugger "tentacles" / Lines
                child.type === "Mesh" &&
                // ignores Hand joints etc. attached to any of the hands
                child.parent.name !== XRControllerDefaults.HAND_NAME_LEFT &&
                child.parent.name !== XRControllerDefaults.HAND_NAME_RIGHT &&
                // ignores XRHandTouchSphereDebugger's 'touchSphereDebug'
                child.name !== XRHandTouchDefaults.DBG_SPHERE_NAME
        )

        let intersections = []
        intersections = raycaster.intersectObjects(toTest, true)

        if (intersections.length > 0) {
            handSpace.userData.pinchObject = intersections[0].object
            handSpace.userData.pinchDistance = intersections[0].distance
        } else {
            handSpace.userData.pinchObject = undefined
            handSpace.userData.pinchDistance = undefined
        }

        let rayData = {
            origin: origin,
            direction: directionXR,
            currentScene: currentScene,
            scale: rayScale
        }

        switch (handSpace.userData.pinchConfig.mode) {
            case "remote":
                if (intersections.length > 0) {
                    if (
                        intersections[0].object.userData.svelthreeComponent.pinchRemoteEnabled() ||
                        intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                    ) {
                        this.raycasterRay.showPinchRay(
                            rayData,
                            handSpace.userData.pinchConfig.materials.remote,
                            handSpace.userData.pinchConfig.colors.remoteHit,
                            handSpace.userData.handedness
                        )
                    }
                } else {
                    this.raycasterRay.showPinchRay(
                        rayData,
                        handSpace.userData.pinchConfig.materials.remote,
                        handSpace.userData.pinchConfig.colors.remote,
                        handSpace.userData.handedness
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
                            handSpace.userData.pinchConfig.materials.touch,
                            handSpace.userData.pinchConfig.colors.touchHit,
                            handSpace.userData.handedness
                        )
                    }
                } else {
                    this.raycasterRay.showPinchRay(
                        rayData,
                        handSpace.userData.pinchConfig.materials.touch,
                        handSpace.userData.pinchConfig.colors.touch,
                        handSpace.userData.handedness
                    )
                }
                break
            case "hybrid":
                if (intersections.length > 0) {
                    if (intersections[0].distance <= pinchRayLength + handSpace.userData.pinchConfig.distance.touch) {
                        if (
                            intersections[0].object.userData.svelthreeComponent.pinchTouchEnabled() ||
                            intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                        ) {
                            //rayData.scale = pinchRayLength + handSpace.userData.pinchConfig.distance.touch
                            rayData.scale = pinchRayLength + handSpace.userData.pinchConfig.distance.touch

                            //debugger

                            this.raycasterRay.showPinchRay(
                                rayData,
                                handSpace.userData.pinchConfig.materials.touch,
                                handSpace.userData.pinchConfig.colors.touchHit,
                                handSpace.userData.handedness
                            )
                        } else if (
                            intersections[0].object.userData.svelthreeComponent.pinchRemoteEnabled() ||
                            intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                        ) {
                            this.raycasterRay.showPinchRay(
                                rayData,
                                handSpace.userData.pinchConfig.materials.remote,
                                handSpace.userData.pinchConfig.colors.remoteHit,
                                handSpace.userData.handedness
                            )
                        }
                    } else {
                        if (
                            intersections[0].object.userData.svelthreeComponent.pinchRemoteEnabled() ||
                            intersections[0].object.userData.svelthreeComponent.pinchHybridEnabled()
                        ) {
                            this.raycasterRay.showPinchRay(
                                rayData,
                                handSpace.userData.pinchConfig.materials.remote,
                                handSpace.userData.pinchConfig.colors.remoteHit,
                                handSpace.userData.handedness
                            )
                        } else {
                            this.raycasterRay.showPinchRay(
                                rayData,
                                handSpace.userData.pinchConfig.materials.remote,
                                handSpace.userData.pinchConfig.colors.remote,
                                handSpace.userData.handedness
                            )
                        }
                    }
                } else {
                    this.raycasterRay.showPinchRay(
                        rayData,
                        handSpace.userData.pinchConfig.materials.remote,
                        handSpace.userData.pinchConfig.colors.remote,
                        handSpace.userData.handedness
                    )
                }
                break
        }

        //console.log("updateForwardDistance!", intersections.length, intersections)
    }
}
