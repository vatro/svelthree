import {
    LineBasicMaterial,
    MeshStandardMaterial,
    Scene,
    Group,
    Vector3,
    BufferGeometry,
    Line
} from "svelthree-three"

export class XRHandTouchRayDebugger {

    currentScene: Scene
    touchDistance: number = 0.008 // default

    tentacleMat = new LineBasicMaterial({
        color: 0x4299e1,
        linewidth: 2
    })

    tentacleTouchMat = new LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2
    })

    tentacleNormalRayMat = new LineBasicMaterial({
        color: 0xffff00,
        linewidth: 2
    })

    tentacleTouchingRayMat = new LineBasicMaterial({
        color: 0xffff00, // yellow thick
        linewidth: 2
    })

    tentacleTestRayMat = new LineBasicMaterial({
        color: 0xff00bf, // fuchsia thin
        linewidth: 1
    })

    jointMat = new MeshStandardMaterial({
        color: 0x4299e1,
        roughness: 0.5,
        metalness: 0.5
    })

    drawTentacles = false
    drawTouchDebuggers = false

    tentacleDirScale = 0.02
    tentacleTouchingRayScale = this.tentacleDirScale * 3

    constructor(config:XRHandTouchRayDebuggerConfig) {
        this.drawTentacles = config.drawTentacles
        this.drawTouchDebuggers = config.drawTouchDebuggers
    }

    initialize(currentScene:Scene, touchDistance:number) {
        this.currentScene = currentScene
        this.touchDistance = touchDistance
    }

    update(doUpdate: boolean) {
        //this.drawTentacles = doUpdate
        //this.drawTouchDebuggers = doUpdate
    }

    setTentacleScales(jointSpeedFac:number) {
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

    addTouchDebugLine(joint:Group) {
        const lineGeom:BufferGeometry = new BufferGeometry().setFromPoints([joint.userData.origin, joint.userData.lastIntersect.point])
        const line:Line = new Line(lineGeom, this.tentacleTouchingRayMat)
        this.currentScene.add(line)
    }

    addTouchDebugLineInside(joint:Group) {
       //let p1Geom:OctahedronBufferGeometry = this.debugPointGeom.clone()
            //let p2Geom:OctahedronBufferGeometry = this.debugPointGeom.clone()

            let lineGeom: BufferGeometry
            //let p3:Mesh = this.debugPointCurrent.clone()
            //joint.userData.lastTouchPoint ?  p1.position.copy(joint.userData.lastTouchPoint) : p1.position.copy(joint.userData.lastOrigin)

            if (joint.userData.lastTouchPoint) {
                //p1Geom.translate(joint.userData.lastTouchPoint.x, joint.userData.lastTouchPoint.y, joint.userData.lastTouchPoint.z)
                lineGeom = new BufferGeometry().setFromPoints([joint.userData.lastTouchPoint, joint.userData.origin])
            }
            else {
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

        let target = origin.clone().add(joint.userData.raycasterTouchingDir.clone().multiplyScalar(this.tentacleTouchingRayScale))
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