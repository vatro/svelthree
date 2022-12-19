import type SvelthreeAnimationObjectFactory from "./SvelthreeAnimationObjectFactory.js"
import type { Object3D, Scene } from "three"
import type { SvelthreeAnimation } from "../types/types-extra.js"

export default class SvelthreeAnimationManager {
	/** Generated animation-`Object Literal` (_interface `SvelthreeAnimation`_): result of `this.ani_obj_factory.create(...)`. */
	private ani_obj: SvelthreeAnimation | undefined

	constructor(
		private ani_obj_factory: SvelthreeAnimationObjectFactory,
		private aniauto: boolean,
		private foo: Object3D,
		private scene: Scene | null | undefined
	) {
		this.ani_obj = undefined
	}

	public handleCurrentSceneStatus(currentSceneActive: boolean): void {
		if (currentSceneActive) {
			/* console.info(
				"SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : currentSceneActive = true!"
			) */
			if (this.aniauto) {
				// console.info("SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : this.aniauto = true!")
				this.handle_scene_active()
			}
		} else {
			/* console.info(
				"SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : currentSceneActive = false!"
			) */
			this.handle_scene_inactive()
		}
	}

	// active / reactivated
	private handle_scene_active(): void {
		// console.info("SVELTHREE > SvelthreeAnimationManager > handle_scene_active!")
		// check if animation has been initiated, if so try to execute 'onSceneReactivated'...
		if (this.ani_obj) {
			this.try_on_scene_reactivated()
		} else {
			// ... otherwise initate / start it (aniauto is true)
			this.initiate_animation()
		}
	}

	/*eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }]*/
	private initiate_animation(...args: any[]): void {
		// console.info("SVELTHREE > SvelthreeAnimationManager > initiate_animation!")
		// if animation is a function it has not been initiated / started yet (otherwise object)

		if (this.scene) {
			if (!this.scene.userData.isActive) {
				/* console.warn(
					"SVELTHREE > SvelthreeAnimationManager : initiate_animation : You're about to initiate an animation in an inactive Scene!"
				) */
			}
		} else if (this.scene === null && (this.foo as Scene).isScene) {
			if (!(this.foo as Scene).userData.isActive) {
				/* console.warn(
					"SVELTHREE > SvelthreeAnimationManager : initiate_animation : You're about to initiate an animation in an inactive NESTED Scene!"
				) */
			}
		}

		this.ani_obj = this.ani_obj_factory.create(this.foo, args)

		/* console.info(
			"SVELTHREE > SvelthreeAnimationManager > initiate_animation : after initialization: this.ani_obj:",
			this.ani_obj
		) */

		try {
			if (this.ani_obj) {
				this.ani_obj.onStart()
			}
		} catch (err) {
			throw new Error("SVELTHREE Exception, " + err)
		}
	}

	private try_on_scene_reactivated(): void {
		if (
			this.ani_obj &&
			Object.hasOwn(this.ani_obj, "onSceneReactivated") &&
			typeof this.ani_obj["onSceneReactivated"] === "function"
		) {
			this.ani_obj.onSceneReactivated()
		} else {
			/* console.warn(
				"SVELTHREE > SvelthreeAnimationManager > try_on_scene_reactivated : 'onSceneReactivated' property is missing in 'SvelthreeAnimation'-Object! Please ensure this is correct.",
				this.ani_obj
			) */
		}
	}

	// inactive / deactivated
	private handle_scene_inactive(): void {
		// check if animation has been initiated
		// if it has been initated, try to execute 'onSceneDeactivated'
		if (this.ani_obj) {
			this.try_on_scene_deactivated()
		} else {
			/* console.info(
				"SVELTHREE > SvelthreeAnimationManager > handle_scene_inactive : 'SvelthreeAnimation'-Object not available!"
			) */
		}
	}

	private try_on_scene_deactivated(): void {
		if (
			this.ani_obj &&
			Object.hasOwn(this.ani_obj, "onSceneDeactivated") &&
			typeof this.ani_obj["onSceneDeactivated"] === "function"
		) {
			this.ani_obj.onSceneDeactivated()
		} else {
			/* console.warn(
				"SVELTHREE > SvelthreeAnimationManager > try_on_scene_deactivated : 'onSceneDeactivated' property is missing in 'SvelthreeAnimation'-Object! Please ensure this is correct.",
				this.ani_obj
			) */
		}
	}

	public startAnimation(): void {
		if (!this.ani_obj) {
			this.initiate_animation()
		} else {
			/* console.info(
				"SVELTHREE > SvelthreeAnimationManager > startAnimation : animation has already been initiated! 'animation': ",
				this.ani_obj
			) */
		}
	}

	public destroyAnimation(): void {
		if (
			this.ani_obj &&
			Object.hasOwn(this.ani_obj, "onDestroy") &&
			typeof this.ani_obj["onDestroy"] === "function"
		) {
			this.ani_obj.onDestroy()
		} else {
			console.error(
				"SVELTHREE > SvelthreeAnimationManager > destroyAnimation : required 'onDestroy' property is missing in 'SvelthreeAnimation'-Object!"
			)
		}
	}

	public getAnimation(): SvelthreeAnimation | undefined {
		return this.ani_obj
	}
}
