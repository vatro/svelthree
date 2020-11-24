import { Group, Mesh, MeshBasicMaterial, SphereBufferGeometry, Vector3 } from "svelthree-three"

export class XRHandTouchSphereDebugger {
    static touchSphereDebugName: string = "touchSphereDebug"

    touchSphereRadius: number
    touchSphereDebug: Mesh

    currentScene: Scene
    touchDistance: number = 0.008 // default

    constructor(touchSphereRadius: number, config: XRHandTouchSphereDebuggerConfig) {
        this.touchSphereRadius = touchSphereRadius
        this.touchSphereDebug = new Mesh(
            new SphereBufferGeometry(this.touchSphereRadius, config.widthSegments, config.heightSegments),
            //new MeshBasicMaterial({color: 0xffff00, transparent: true, opacity: 0.5})
            new MeshBasicMaterial(config.mat)
        )
        this.touchSphereDebug.name = XRHandTouchSphereDebugger.touchSphereDebugName
    }

    initialize(currentScene: Scene, touchDistance: number) {
        this.currentScene = currentScene
        this.touchDistance = touchDistance
    }

    createDebugSphere(joint: Group) {
        joint.userData.debugSphere = this.touchSphereDebug.clone()
        this.currentScene.add(joint.userData.debugSphere)
    }

    updateDebugSpherePosition(joint: Group) {
        joint.userData.debugSphere.position.copy(joint.userData.origin)
    }

    update(doUpdate: boolean) {
        // tbd
    }
}