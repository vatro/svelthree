import type { Targetable } from "../types-extra"
import type { Light, Object3D, Scene } from "three"
import type { Empty } from "../components"
import type { Mesh } from "../components"
import { LightUtils } from "../utils"

export default class LightTarget {

	private targetPos: [number, number, number]
	private targetPosPrev: [number, number, number]

    constructor(
        public change: boolean,
        //private target: Object3D | Empty | Mesh<any> | boolean,
		private target: Targetable | boolean,
        private scene: Scene,
        private light: Light,
    ) {
		this.targetPos = [0, 0, 0]
	}

    public on_light_target_change() {
        this.change = false

		/*
        if (this.light.hasOwnProperty("target")) {
            if (this.target["empty"]) {
				// light_comp_ref.target = empty_comp_ref -> use an 'Empty' component as target (already added to the scene)
                this.light["target"] = this.target["empty"]
            } else if (this.target["mesh"]) {
				// light_comp_ref.target = mesh_comp_ref -> use a 'Mesh' component as target (already added to the scene)
                this.light["target"] = this.target["mesh"]
            } else if ((this.target as Object3D).isObject3D) {
				// light_comp_ref.target = obj3d_ref -> use own 'Object3D' as target (already added to the scene)
                this.light["target"] = this.target
            } else if (typeof this.target === "boolean") {
				// light_comp_ref.target = true -> use the built-in 'Object3D' as target (add it to the scene)
                this.scene.add(this.light["target"])
            }
        }
		*/

		if (this.light.hasOwnProperty("target")) {
			// remove current target from parent if it's a built-in target
			if(this.light["target"]?.userData.is_builtin_target && this.light["target"].parent) {
				this.light["target"].parent.remove(this.light["target"])
			}

			const targetable_instance_name: string | boolean = this.has_targetable_instance(this.target)

            if (targetable_instance_name) {
				// light_comp_ref.target = comp_ref -> use any targetable component as target (already added to the scene)
                this.light["target"] = this.target[targetable_instance_name as string]
            } else if ((this.target as Object3D).isObject3D) {
				// light_comp_ref.target = obj3d_ref -> use any 'Object3D' as target (already added to the scene)
                this.light["target"] = this.target
            } else if (typeof this.target === "boolean") {
				// light_comp_ref.target = true -> use the built-in 'Object3D' as target (add it to the scene)
				this.light["target"].userData.is_builtin_target = true
                this.scene.add(this.light["target"])
            }
        }
    }

	// targetable component instances
	private targetable_instance_names = ["empty", "mesh", "light", "camera"]

	private has_targetable_instance (target_to_check: any): string | boolean {
		for (let i = 0; i < this.targetable_instance_names.length; i++ ) {
			if (target_to_check[this.targetable_instance_names[i]]) return this.targetable_instance_names[i]
		}
		return false
	}

	public update(helper: boolean): void {
		// don't check for changes if 'target' is not added to scene (doesn't have parent)

		if (this.change) this.on_light_target_change()

		if (this.light["target"]?.isObject3D && this.light["target"].parent !== null) {
			this.targetPos[0] = (this.light["target"] as Object3D).position.x
			this.targetPos[1] = (this.light["target"] as Object3D).position.y
			this.targetPos[2] = (this.light["target"] as Object3D).position.z

			if (this.targetPosPrev === undefined) {
				this.targetPosPrev = [...this.targetPos]
				this.onTargetPosChanged()
			} else {
				if (this.targetPosChanged()) {
					this.onTargetPosChanged()
				}
			}
		}

		this.light.updateMatrix()
		this.light.updateMatrixWorld()
		if (helper) {
			LightUtils.updateHelper(this.light)
		}
	}

	private targetPosChanged(): boolean {
		for (let i = 0; i < 3; i++) {
			if (this.targetPos[i] !== this.targetPosPrev[i]) {
				this.targetPosPrev = [...this.targetPos]
				return true
			}
		}
		return false
	}

	private onTargetPosChanged(): void {
		if (this.light["target"].matrixAutoUpdate === false) {
			this.light["target"].updateMatrix()
			this.light["target"].updateMatrixWorld()
		}
	}
}