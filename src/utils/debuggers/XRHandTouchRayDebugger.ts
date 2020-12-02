import { LineBasicMaterial, Scene, Group, Vector3, BufferGeometry, Line } from "svelthree-three"

import XRHandTouchDefaults from "../XRHandTouchDefaults"

export class XRHandTouchRayDebugger {
    currentScene: Scene
    touchDistance: number

    tentacleMat = new LineBasicMaterial({
        color: XRHandTouchDefaults.DBG_RAY_TENTACLE_BASE_COL,
        linewidth: XRHandTouchDefaults.DBG_RAY_TENTACLE_WIDTH_STD
    })

    tentacleTouchMat = new LineBasicMaterial({
        color: XRHandTouchDefaults.DBG_RAY_TENTACLE_TOUCH_COL,
        linewidth: XRHandTouchDefaults.DBG_RAY_TENTACLE_WIDTH_STD
    })

    tentacleNormalRayMat = new LineBasicMaterial({
        color: XRHandTouchDefaults.DBG_RAY_TENTACLE_NRAY_COL,
        linewidth: XRHandTouchDefaults.DBG_RAY_TENTACLE_WIDTH_STD
    })

    tentacleTouchingRayMat = new LineBasicMaterial({
        color: XRHandTouchDefaults.DBG_RAY_TENTACLE_TOCHING_COL,
        linewidth: XRHandTouchDefaults.DBG_RAY_TENTACLE_WIDTH_STD
    })

    tentacleTestRayMat = new LineBasicMaterial({
        color: XRHandTouchDefaults.DBG_RAY_TENTACLE_TESTRAY_COL,
        linewidth: XRHandTouchDefaults.DBG_RAY_TENTACLE_WIDTH_TESTRAY
    })

    drawTentacles = false
    drawTouchDebuggers = false

    tentacleDirScale = XRHandTouchDefaults.DBG_RAY_TENTACLE_DIRSCALE
    tentacleTouchingRayScale = XRHandTouchDefaults.DBG_RAY_TENTACLE_TOUCHINGRAY_SCALE

    constructor(config: XRHandTouchRayDebuggerConfig) {
        if (config) {
            this.drawTentacles = config.drawTentacles === true ? true : false
            this.drawTouchDebuggers = config.drawTouchDebuggers === true ? true : false
        } else {
            this.drawTentacles = true
            this.drawTouchDebuggers = true
        }
    }

    initialize(currentScene: Scene, touchDistance: number = XRHandTouchDefaults.TOUCH_DISTANCE) {
        this.currentScene = currentScene
        this.touchDistance = touchDistance
    }

    update(doUpdate: boolean) {
        //this.drawTentacles = doUpdate
        //this.drawTouchDebuggers = doUpdate
    }

    setTentacleScales(jointSpeedFac: number) {
        if (this.drawTentacles === true) {
            this.tentacleDirScale = this.touchDistance * jointSpeedFac
            this.tentacleTouchingRayScale = this.touchDistance * 3
        }
    }

    showDirectionTentacle(joint: Group, origin: Vector3) {
        if (joint.userData.tentacleDir) {
            this.currentScene.remove(joint.userData.tentacleDir)
            joint.userData.tentacleDir.geometry.dispose()
            joint.userData.tentacleDir = undefined
        }

        let target = origin.clone().add(joint.userData.direction.clone().multiplyScalar(this.tentacleDirScale))
        let lineGeom = new BufferGeometry().setFromPoints([origin, target])
        joint.userData.tentacleDir = new Line(lineGeom, this.tentacleMat)

        this.currentScene.add(joint.userData.tentacleDir)
    }

    addTouchDebugLine(joint: Group) {
        const lineGeom: BufferGeometry = new BufferGeometry().setFromPoints([
            joint.userData.origin,
            joint.userData.lastIntersect.point
        ])
        const line: Line = new Line(lineGeom, this.tentacleTouchingRayMat)
        this.currentScene.add(line)
    }

    addTouchDebugLineInside(joint: Group) {
        //let p1Geom:OctahedronBufferGeometry = this.debugPointGeom.clone()
        //let p2Geom:OctahedronBufferGeometry = this.debugPointGeom.clone()

        let lineGeom: BufferGeometry
        //let p3:Mesh = this.debugPointCurrent.clone()
        //joint.userData.lastTouchPoint ?  p1.position.copy(joint.userData.lastTouchPoint) : p1.position.copy(joint.userData.lastOrigin)

        if (joint.userData.lastTouchPoint) {
            //p1Geom.translate(joint.userData.lastTouchPoint.x, joint.userData.lastTouchPoint.y, joint.userData.lastTouchPoint.z)
            lineGeom = new BufferGeometry().setFromPoints([joint.userData.lastTouchPoint, joint.userData.origin])
        } else {
            //p1Geom.translate(joint.userData.lastOrigin.x, joint.userData.lastOrigin.y, joint.userData.lastOrigin.z)
            lineGeom = new BufferGeometry().setFromPoints([joint.userData.lastOrigin, joint.userData.origin])
        }

        //p2Geom.translate(joint.userData.origin.x, joint.userData.origin.y, joint.userData.origin.z)

        //p2.position.copy(joint.userData.origin)
        //p3.position.copy(currentOrigin)

        let line = new Line(lineGeom, this.tentacleTouchingRayMat)

        /*
            //somehow doesn't work --> ???
            this.debugPointMeshGeom.merge(p1Geom, 0)
            this.debugPointMeshGeom.merge(p1Geom, this.debugPointGeom.attributes.position.count*3*this.debugPointsCounter)
            console.warn("merge at: " + this.debugPointGeom.attributes.position.count*3*this.debugPointsCounter)
            this.debugPointMeshGeom.merge(p2Geom, this.debugPointGeom.attributes.position.count*3*(this.debugPointsCounter + 1))
            console.warn("merge at: " + this.debugPointGeom.attributes.position.count*3*(this.debugPointsCounter + 1))
            */
        this.currentScene.add(line)
        //this.debugPointsCounter +=2

        //debugger
    }

    removeAllTentacles(joint: Group) {
        this.removeRaycasterTestTentacle(joint)
        this.removeRaycasterTouchingTentacle(joint)
        this.removeDirectionTentacle(joint)
    }

    removeDirectionTentacle(joint: Group) {
        if (joint.userData.tentacleDir) {
            this.currentScene.remove(joint.userData.tentacleDir)
            joint.userData.tentacleDir.geometry.dispose()
            joint.userData.tentacleDir = undefined
        }
    }

    removeRaycasterTouchingTentacle(joint: Group) {
        if (joint.userData.tentacleTouchingRay) {
            this.currentScene.remove(joint.userData.tentacleTouchingRay)
            joint.userData.tentacleTouchingRay.geometry.dispose()
            joint.userData.tentacleTouchingRay = undefined
        }
    }

    removeRaycasterTestTentacle(joint: Group) {
        if (joint.userData.tentacleTestRay) {
            this.currentScene.remove(joint.userData.tentacleTestRay)
            joint.userData.tentacleTestRay.geometry.dispose()
            joint.userData.tentacleTestRay = undefined
        }
    }

    showRaycasterTouchingTentacle(joint: Group, origin: Vector3) {
        if (joint.userData.tentacleTouchingRay) {
            this.currentScene.remove(joint.userData.tentacleTouchingRay)
            joint.userData.tentacleTouchingRay.geometry.dispose()
            joint.userData.tentacleTouchingRay = undefined
        }

        let target = origin
            .clone()
            .add(joint.userData.raycasterTouchingDir.clone().multiplyScalar(this.tentacleTouchingRayScale))
        let lineGeom = new BufferGeometry().setFromPoints([origin, target])
        joint.userData.tentacleTouchingRay = new Line(lineGeom, this.tentacleTouchingRayMat)

        this.currentScene.add(joint.userData.tentacleTouchingRay)
    }
}

// TODO: what to do with this?!
/*
 updateToTest(currentScene: Scene) {
      this.currentScene = currentScene


        if(this.debugMeshesAdded === false && this.drawTouchDebuggers) {
            let MAX_POINTS = 100000;

            this.debugPointMeshGeom = new BufferGeometry()
            let positions = new Float32Array( MAX_POINTS * 3 ); // 3 vertices per point
            this.debugPointMeshGeom.setAttribute( 'position', new BufferAttribute( positions, 3 ) );

            this.debugPointsMesh = new Mesh( this.debugPointMeshGeom, this.debugPointsMeshMat)
            //this.debugPointsMesh.name = "debugMesh"
            this.currentScene.add(this.debugPointsMesh)

            //this.debugLinesMesh.layers.enable( 1 )
            this.debugPointsMesh.layers.enable( 1 )
            //this.debugPointsCounter = 0
            this.debugMeshesAdded = true
        }

        ...

        this.toTest = currentScene.children.filter(
            ...
            //child.name !== "debugMesh"
            //child.name !== "debugPointCurrent"
        )
*/
