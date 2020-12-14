import { Mesh, Group, MeshBasicMaterial } from "svelthree-three"
import XRHandTouchDefaults from "../../defaults/XRHandTouchDefaults"

export default class XRHandTouchJointDebugger {
    currentScene: Scene
    jointMesh: Mesh
    normalCol: number = XRHandTouchDefaults.DBG_JOINT_NORMAL_COL
    touchCol: number = XRHandTouchDefaults.DBG_JOINT_TOUCH_COL

    jointMat = new MeshBasicMaterial({
        color: this.normalCol
    })

    constructor() {}

    initialize(currentScene: Scene, colors: { [key: string]: number }) {
        this.currentScene = currentScene

        if (colors) {
            for (const [key, value] of Object.entries(colors)) {
                value !== undefined ? (this[`${key}Col`] = value) : null
            }
        }
    }

    setJointMesh(handSpace: Group, joint: Group, i: number) {
        this.jointMesh = this.getJointMesh(handSpace, joint, i)
    }

    getJointMesh(handSpace: Group, joint: Group, i: number): Mesh {
        let jointMesh: Mesh

        if (handSpace.children[25].children.length > 0) {
            if (handSpace.children[25].children[0].children.length > 2) {
                jointMesh = handSpace.children[25].children[0].children[i] as Mesh

                if (!joint.userData.hasDebugMaterial) {
                    joint.userData.hasDebugMaterial = true
                    jointMesh.material = this.jointMat.clone()
                }

                return jointMesh
            }
        }

        return undefined
    }

    unhighlightJoint() {
        if (this.jointMesh) {
            this.jointMesh.material["color"].setHex(this.normalCol)
        }
    }

    highlightJoint() {
        if (this.jointMesh) {
            this.jointMesh.material["color"].setHex(this.touchCol)
        }
    }
}
