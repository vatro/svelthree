import { Group, Mesh, MeshBasicMaterial, SphereBufferGeometry, BufferGeometry, Color } from "svelthree-three"
import XRHandTouchDefaults from "../XRHandTouchDefaults"

export class XRHandTouchSphereDebugger {
    static touchSphereDebugName: string = "touchSphereDebug"

    touchSphereRadius: number
    touchSphereDebug: Mesh
    touchCol = new Color(XRHandTouchDefaults.DBG_SPHERE_TOUCHED_COL)
    unTouchCol = new Color(XRHandTouchDefaults.DBG_SPHERE_UNTOUCH_COL)

    currentScene: Scene
    touchDistance: number

    constructor(touchSphereRadius: number, config: XRHandTouchSphereDebuggerConfig) {
        this.touchSphereRadius = touchSphereRadius

        this.touchSphereDebug = new Mesh(
            new SphereBufferGeometry(
                this.touchSphereRadius,
                config && config.widthSegments ? config.widthSegments : XRHandTouchDefaults.DBG_SPHERE_SEG_W,
                config && config.heightSegments ? config.heightSegments : XRHandTouchDefaults.DBG_SPHERE_SEG_H
            ),

            new MeshBasicMaterial(config && config.mat ? config.mat : XRHandTouchDefaults.DBG_SPHERE_DEFAULT_MAT_CONFIG)
        )

        this.touchSphereDebug.name = XRHandTouchSphereDebugger.touchSphereDebugName

        if (config && config.colors) {
            for (const [key, value] of Object.entries(config.colors)) {
                value !== undefined ? (this[`${key}Col`] = new Color(value)) : null
            }
        }
    }

    initialize(currentScene: Scene, touchDistance: number = XRHandTouchDefaults.TOUCH_DISTANCE) {
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

    // paint sphere touch
    colorSphereTouch(mesh: Mesh, indices: number[]) {
        const geom: BufferGeometry = mesh.geometry as BufferGeometry
        const colorAttr = geom.getAttribute("color")
        const indexAttr = geom.index

        //debugger
        //const indexAttr = geom.getAttribute( 'index' );

        for (let i = 0, l = indices.length; i < l; i++) {
            const i2 = indexAttr.getX(indices[i])
            colorAttr.setX(i2, this.touchCol.r)
            colorAttr.setY(i2, this.touchCol.g)
            colorAttr.setZ(i2, this.touchCol.b)
        }

        colorAttr.needsUpdate = true
    }

    // paint sphere touch
    colorSphereUnTouch(mesh: Mesh, indices: number[]) {
        const geom: BufferGeometry = mesh.geometry as BufferGeometry
        const colorAttr = geom.getAttribute("color")
        const indexAttr = geom.index

        //debugger
        //const indexAttr = geom.getAttribute( 'index' );

        for (let i = 0, l = indices.length; i < l; i++) {
            const i2 = indexAttr.getX(indices[i])
            colorAttr.setX(i2, this.unTouchCol.r)
            colorAttr.setY(i2, this.unTouchCol.g)
            colorAttr.setZ(i2, this.unTouchCol.b)
        }

        colorAttr.needsUpdate = true
    }

    update(doUpdate: boolean) {
        // tbd
    }
}
