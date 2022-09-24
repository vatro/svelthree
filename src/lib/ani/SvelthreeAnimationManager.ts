import type SvelthreeAnimationObjectFactory from "./SvelthreeAnimationObjectFactory"
import type { Object3D, Scene } from "three"
import type { SvelthreeAnimation } from "../types/types-extra"
import { verbose_mode } from "../utils/SvelthreeLogger"

export default class SvelthreeAnimationManager {
	/** Generated animation-`Object Literal` (_interface `SvelthreeAnimation`_): result of `this.ani_obj_factory.create(...)`. */
	ani_obj: SvelthreeAnimation

	constructor(
		private ani_obj_factory: SvelthreeAnimationObjectFactory,
		private aniauto: boolean,
		private foo: Object3D,
		private scene: Scene | null
	) {}

	public handleCurrentSceneStatus(currentSceneActive: boolean): void {
		if (currentSceneActive) {
			if (verbose_mode()) {
				console.debug(
					"SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : currentSceneActive = true!"
				)
			}
			if (this.aniauto) {
				if (verbose_mode()) {
					console.debug(
						"SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : this.aniauto = true!"
					)
				}
				this.handle_scene_active()
			}
		} else {
			if (verbose_mode()) {
				console.debug(
					"SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : currentSceneActive = false!"
				)
			}
			this.handle_scene_inactive()
		}
	}

	// active / reactivated
	private handle_scene_active(): void {
		if (verbose_mode()) {
			console.debug("SVELTHREE > SvelthreeAnimationManager > handle_scene_active!")
		}
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
		//if (verbose_mode()) console.debug("SVELTHREE > SvelthreeAnimationManager > initiate_animation!")
		// if animation is a function it has not been initiated / started yet (otherwise object)

		if (this.scene) {
			if (!this.scene.userData.isActive) {
				console.warn(
					"SVELTHREE > SvelthreeAnimationManager : initiate_animation : You're about to initiate an animation in an inactive Scene!"
				)
			}
		} else if (this.scene === null && (this.foo as Scene).isScene) {
			if (!(this.foo as Scene).userData.isActive) {
				console.warn(
					"SVELTHREE > SvelthreeAnimationManager : initiate_animation : You're about to initiate an animation in an inactive NESTED Scene!"
				)
			}
		}

		this.ani_obj = this.ani_obj_factory.create(this.foo, args)

		console.debug(
			"SVELTHREE > SvelthreeAnimationManager > initiate_animation : after initialization: this.ani_obj:",
			this.ani_obj
		)

		try {
			this.ani_obj.onStart()
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	private try_on_scene_reactivated(): void {
		Object.prototype.hasOwnProperty.call(this.ani_obj, "onSceneReactivated")
			? this.ani_obj.onSceneReactivated()
			: console.warn(
					"SVELTHREE > SvelthreeAnimationManager > try_on_scene_reactivated : 'onSceneReactivated' property is missing in 'SvelthreeAnimation'-Object! Please ensure this is correct.",
					this.ani_obj
			  )
	}

	// inactive / deactivated
	private handle_scene_inactive(): void {
		// check if animation has been initiated
		// if it has been initated, try to execute 'onSceneDeactivated'
		this.ani_obj
			? this.try_on_scene_deactivated()
			: console.error("SVELTHREE > SvelthreeAnimationManager > 'SvelthreeAnimation'-Object not available!")
	}

	private try_on_scene_deactivated(): void {
		Object.prototype.hasOwnProperty.call(this.ani_obj, "onSceneDeactivated")
			? this.ani_obj.onSceneDeactivated()
			: console.warn(
					"SVELTHREE > SvelthreeAnimationManager > try_on_scene_deactivated : 'onSceneDeactivated' property is missing in 'SvelthreeAnimation'-Object! Please ensure this is correct.",
					this.ani_obj
			  )
	}

	public startAnimation(): void {
		if (!this.ani_obj) {
			this.initiate_animation()
		} else {
			console.debug(
				"SVELTHREE > SvelthreeAnimationManager > startAnimation : animation has already been initiated! 'animation': ",
				this.ani_obj
			)
		}
	}

	public destroyAnimation(): void {
		Object.prototype.hasOwnProperty.call(this.ani_obj, "onDestroy")
			? this.ani_obj.onDestroy()
			: console.error(
					"SVELTHREE > SvelthreeAnimationManager > destroyAnimation : required 'onDestroy' property is missing in 'SvelthreeAnimation'-Object!"
			  )
	}

	public getAnimation(): SvelthreeAnimation {
		return this.ani_obj
	}
}
