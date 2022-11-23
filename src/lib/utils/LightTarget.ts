import type { Targetable, LightWithTarget, TargetableSvelthreeComponent } from "../types/types-extra"
import type { Object3D, Scene } from "three"
import { LightUtils } from "../utils"

export default class LightTarget {
	private targetPos: [number, number, number] = [0, 0, 0]
	private targetPosPrev: [number, number, number] | undefined

	constructor(
		public change: boolean,
		private target: Targetable | boolean,
		private scene: Scene,
		private light: LightWithTarget
	) {}

	public on_light_target_change() {
		this.change = false

		if (Object.hasOwn(this.light, "target")) {
			// remove current target from parent if it's a built-in target
			if (this.light["target"].userData.is_builtin_target && this.light["target"].parent) {
				this.light["target"].parent.remove(this.light["target"])
			}

			// Check if provided `this.target` is a (targetable) `svelthree`-component -> check if it has a targetable instance prop (see `targetable_instance_names`) e.g. `mesh` or `object3d`
			// retrun undefined if it's a `boolean` value
			const targetable_instance_name: string | undefined = this.has_targetable_instance(this.target)

			// if `this.target` is truthy -> `true` (boolean) or some instance reference
			if (this.target) {
				if (targetable_instance_name) {
					// provided 'this.target' is a (targetable) `svelthree`-component -> we've found a valid (see `targetable_instance_names`) instance prop (e.g. `mesh` or `object3d`) inside `this.target`
					// e.g. light_comp_ref.target = comp_ref
					// -> use any (created) three.js object instance (e.g. "mesh" or "object3d") of a provided targetable `svelthree`-component (reference) as `light`-target (already added to the scene)
					this.light["target"] = (this.target as TargetableSvelthreeComponent)[
						targetable_instance_name as keyof TargetableSvelthreeComponent
					]
				} else if ((this.target as Object3D).isObject3D) {
					// provided `this.target` is a THREE.Object3D instance
					// e.g. light_comp_ref.target = obj3d_ref
					// -> use any 'THREE.Object3D' as target (already added to the scene)
					this.light["target"] = this.target as Object3D
				} else if (typeof this.target === "boolean") {
					// provided `this.target` is a boolean value (`true`)
					// light_comp_ref.target = true -> use the built-in 'Object3D' as target (add it to the scene)
					this.light["target"].userData.is_builtin_target = true
					this.scene.add(this.light["target"])
				}
			} else if (typeof this.target === "boolean") {
				// provided `this.target` is a boolean value (`false`)
				// TODO  ...
			}
		}
	}

	// targetable component instances
	private targetable_instance_names = ["scene", "object3d", "group", "mesh", "light", "camera", "container", "points"]

	// TODO  see https://github.com/vatro/svelthree/issues/135
	private has_targetable_instance(target_to_check: boolean | Targetable): string | undefined {
		if (typeof target_to_check !== "boolean") {
			for (let i = 0; i < this.targetable_instance_names.length; i++) {
				if (
					(target_to_check as TargetableSvelthreeComponent)[
						this.targetable_instance_names[i] as keyof TargetableSvelthreeComponent
					]
				)
					return this.targetable_instance_names[i]
			}
		}
		return undefined
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
			if (!this.targetPosPrev || (this.targetPosPrev && this.targetPos[i] !== this.targetPosPrev[i])) {
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
