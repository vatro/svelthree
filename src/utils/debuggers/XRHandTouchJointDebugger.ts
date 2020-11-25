import {
    Mesh,
    Group
} from "svelthree-three"

import XRHandJointindices from "../XRHandJointIndices"

export class XRHandTouchJointDebugger {
    currentScene: Scene
    jointMesh: Mesh

    constructor() { }

    initialize(currentScene: Scene) {
        this.currentScene = currentScene
    }

    setJointMesh(hand: Group, joint: Group, i: number) {
        this.jointMesh = this.getJointMesh(hand, joint, i)
    }

    // TODO: Check --> this returns only fingertip joints!
    getJointMesh(hand: Group, joint: Group, i: number): Mesh {
        let jointMesh: Mesh

        if (hand.children[25].children.length > 0) {

            if (hand.children[25].children[0].children.length > 2) {

                jointMesh = hand.children[25].children[0].children[XRHandJointindices.TIP[i]] as Mesh

                /*
                if (!joint.userData.hasDebugMaterial) {
                    joint.userData.hasDebugMaterial = true
                    jointMesh.material = this.jointMat.clone()
                }
                */

                return jointMesh
            }
        }

        return undefined
    }

    unhighlightJoint() {
        if (this.jointMesh) { this.jointMesh.material["emissive"].setHex(0x000000) }
    }

    highlightJoint() {
        if (this.jointMesh) { this.jointMesh.material["emissive"].setHex(0x00ff00) }
    }
}