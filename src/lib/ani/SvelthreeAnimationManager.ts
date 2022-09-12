import type { Object3D, Scene } from "three"
import SvelthreeAnimationProp from "./SvelthreeAnimationProp"
import { verbose_mode } from "../utils/SvelthreeLogger"

export default class SvelthreeAnimationManager {
	//  TODO  (ESLint -> 'no-explicit-any') see https://github.com/vatro/svelthree/issues/165
	animation: SvelthreeAnimationProp | any
	aniauto: boolean
	obj: Object3D
	scene: Scene

	//  TODO  (ESLint -> 'no-explicit-any') see https://github.com/vatro/svelthree/issues/165
	constructor(animation: SvelthreeAnimationProp | any, aniauto: boolean, obj: Object3D, scene: Scene | null) {
		this.animation = animation
		this.aniauto = aniauto
		this.obj = obj
		this.scene = scene
	}

	handleCurrentSceneStatus(currentSceneActive: boolean) {
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
				this.handleSceneActive()
			}
		} else {
			if (verbose_mode()) {
				console.debug(
					"SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : currentSceneActive = false!"
				)
			}
			this.handleSceneInActive()
		}
	}

	// active / reactivated
	handleSceneActive() {
		if (verbose_mode()) {
			console.debug("SVELTHREE > SvelthreeAnimationManager > handleSceneActive!")
		}
		// check if animation has been initiated, if so try to execute 'onSceneReactivated'...
		if (this.animationInitiated() === true) {
			this.tryOnSceneReactivated()
		} else {
			// ... otherwise initate / start it (aniauto is true)
			this.initiateAnimation()
		}
	}

	/*eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }]*/
	initiateAnimation(...args: any[]): void {
		//if (verbose_mode()) console.debug("SVELTHREE > SvelthreeAnimationManager > initiateAnimation!")
		// if animation is a function it has not been initiated / started yet (otherwise object)

		if (this.scene) {
			if (!this.scene.userData.isActive) {
				console.warn(
					"SVELTHREE > SvelthreeAnimationManager : initiateAnimation : You're about to initiate an animation in an inactive Scene!"
				)
			}
		} else if (this.scene === null && (this.obj as Scene).isScene) {
			if (!(this.obj as Scene).userData.isActive) {
				console.warn(
					"SVELTHREE > SvelthreeAnimationManager : initiateAnimation : You're about to initiate an animation in an inactive NESTED Scene!"
				)
			}
		}

		this.animation = this.animation.initiate(this.obj, args)

		if (verbose_mode())
			console.debug(
				"SVELTHREE > SvelthreeAnimationManager > initiateAnimation : after initialization: this.animation:",
				this.animation
			)
		try {
			this.animation.onStart()
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	tryOnSceneReactivated(): void {
		this.animation.onSceneReactivated
			? this.animation.onSceneReactivated()
			: console.warn(
					"SVELTHREE > SvelthreeAnimationManager > tryOnSceneReactivated : Animation couldn't be started, missing 'onSceneReactivated' method!"
			  )
	}

	// inactive / deactivated
	handleSceneInActive() {
		// check if animation has been initiated
		// if it has been initated, try to execute 'onSceneDeactivated'
		if (this.animationInitiated() === true) {
			this.tryOnSceneDeactivated()
		}
	}

	tryOnSceneDeactivated(): void {
		this.animation.onSceneDeactivated
			? this.animation.onSceneDeactivated()
			: console.warn(
					"SVELTHREE > SvelthreeAnimationManager > tryOnSceneDeactivated : Animation couldn't be stopped, missing 'onSceneDeactivated' method!"
			  )
	}

	startAni(): void {
		if (this.animationInitiated() === false) {
			this.initiateAnimation()
		} else {
			console.warn(
				"SVELTHREE > SvelthreeAnimationManager > startAni : animation has already been initiated! 'animation': ",
				this.animation
			)
		}
	}

	destroyAnimation(): void {
		if (this.animation.prototype.hasOwnProperty.call(this.animation, "onDestroy")) {
			this.animation.onDestroy()
		} else {
			console.warn(
				"SVELTHREE > SvelthreeAnimationManager > Unable to find 'onDestroy' method in 'animation': This may be a BUG in REPL and may be safe to ignore. Please check if your animation is running as intended and consider checking it in another environment. Contributions on this issue are welcome! : this.animation",
				this.animation
			)
		}
	}

	animationInitiated(): boolean {
		if (this.animationIsAnimationProp()) {
			return false
		} else if (this.animationIsObject()) {
			return true
		} else {
			console.warn("SVELTHREE > SvelthreeAnimationManager > animationInitiated? : 'animation': ", this.animation)
			throw new Error(
				"SVELTHREE > SvelthreeAnimationManager > animationInitiated? : 'animation' prop is of unsupported type!"
			)
		}
	}

	animationIsAnimationProp(): boolean {
		if (this.animation) {
			if (this.animation instanceof SvelthreeAnimationProp) {
				return true
			}
		}
		return false
	}

	animationIsObject(): boolean {
		if (this.animation) {
			if (typeof this.animation === "object") {
				return true
			}
		}
		return false
	}

	//  TODO  (ESLint -> 'no-explicit-any') see https://github.com/vatro/svelthree/issues/165
	getAnimation(): any {
		if (this.animationInitiated()) {
			return this.animation
		}
	}
}
