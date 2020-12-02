import { Mesh, Group, MeshBasicMaterial } from "svelthree-three"

import XRHandTouchDefaults from "../XRHandTouchDefaults"

export class XRHandTouchJointDebugger {
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

    setJointMesh(hand: Group, joint: Group, i: number) {
        this.jointMesh = this.getJointMesh(hand, joint, i)
    }

    getJointMesh(hand: Group, joint: Group, i: number): Mesh {
        let jointMesh: Mesh

        if (hand.children[25].children.length > 0) {
            if (hand.children[25].children[0].children.length > 2) {
                jointMesh = hand.children[25].children[0].children[i] as Mesh

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
