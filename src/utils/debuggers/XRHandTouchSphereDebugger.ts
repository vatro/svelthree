import { Group, Mesh, MeshBasicMaterial, SphereBufferGeometry, BufferGeometry, Color, Scene } from "svelthree-three"
import XRHandTouchDefaults from "../../defaults/XRHandTouchDefaults"

export default class XRHandTouchSphereDebugger {
    touchSphereRadius: number
    touchSphereDebug: Mesh
    touchCol = new Color(XRHandTouchDefaults.DBG_SPHERE_TOUCHED_COL)
    unTouchCol = new Color(XRHandTouchDefaults.DBG_SPHERE_UNTOUCH_COL)

    currentScene: Scene
    touchDistance: number

    constructor(touchSphereRadius: number, config: XrHandTouchSphereDebuggerConfig) {
        this.touchSphereRadius = touchSphereRadius

        this.touchSphereDebug = new Mesh(
            new SphereBufferGeometry(
                this.touchSphereRadius,
                config && config.widthSegments ? config.widthSegments : XRHandTouchDefaults.DBG_SPHERE_SEG_W,
                config && config.heightSegments ? config.heightSegments : XRHandTouchDefaults.DBG_SPHERE_SEG_H
            ),

            new MeshBasicMaterial(config && config.mat ? config.mat : XRHandTouchDefaults.DBG_SPHERE_DEFAULT_MAT_CONFIG)
        )

        this.touchSphereDebug.name = XRHandTouchDefaults.DBG_SPHERE_NAME

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

    colorSphereTouch(mesh: Mesh, indices: number[]) {
        this.colorFaces(mesh, indices, this.touchCol)
    }

    colorSphereUnTouch(mesh: Mesh, indices: number[]) {
        this.colorFaces(mesh, indices, this.unTouchCol)
    }

    colorFaces(mesh: Mesh, indices: number[], color: Color) {
        const geom: BufferGeometry = mesh.geometry as BufferGeometry
        const colorAttr = geom.getAttribute("color")

        // Ignore non-paintable geometries (prevents Error: "cannot setX of undefined!")
        if (colorAttr !== undefined) {
            const indexAttr = geom.index

            for (let i = 0, l = indices.length; i < l; i++) {
                const i2 = indexAttr.getX(indices[i])

                colorAttr.setX(i2, color.r)
                colorAttr.setY(i2, color.g)
                colorAttr.setZ(i2, color.b)
            }

            colorAttr.needsUpdate = true
        }
    }

    update(doUpdate: boolean) {
        // tbd
    }
}
