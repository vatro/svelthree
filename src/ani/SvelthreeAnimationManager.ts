import type { Object3D, Scene } from "three"
import SvelthreeAnimationProp from "./SvelthreeAnimationProp"

// TODO  TOFIX  This seems to be a MESS, DEBUG! (switching Scenes)
export default class SvelthreeAnimationManager {
	animation: SvelthreeAnimationProp | any
	aniauto: boolean
	obj: Object3D
	scene: Scene

	constructor(animation: SvelthreeAnimationProp | any, aniauto: boolean, obj: Object3D, scene: Scene) {
		this.animation = animation
		this.aniauto = aniauto
		this.obj = obj
		this.scene = scene
	}

	handleCurrentSceneStatus(currentSceneActive: boolean) {
		if (currentSceneActive) {
			console.warn(
				"SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : currentSceneActive = true!"
			)
			if (this.aniauto) {
				console.warn("SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : this.aniauto = true!")
				this.handleSceneActive()
			}
		} else {
			console.warn(
				"SVELTHREE > SvelthreeAnimationManager > handleCurrentSceneStatus : currentSceneActive = false!"
			)
			this.handleSceneInActive()
		}
	}

	//active / reactivated
	handleSceneActive() {
		console.warn("SVELTHREE > SvelthreeAnimationManager > handleSceneActive!")
		//check if animation has been initiated, if so try to execute 'onSceneReactivated'...
		if (this.animationInitiated() === true) {
			this.tryOnSceneReactivated()
		} else {
			//... otherwise initate / start it (aniauto is true)
			this.initiateAnimation()
		}
	}

	initiateAnimation(): void {
		//console.info("SVELTHREE > SvelthreeAnimationManager > initiateAnimation!")
		//if animation is a function it has not been initiated / started yet (otherwise object)
		!this.scene.userData.isActive
			? console.warn(
				"SVELTHREE > SvelthreeAnimationManager : initiateAnimation : You're about to initiate an animation in an inactive Scene!"
			)
			: null
		this.animation = this.animation.initiate(this.obj, ...arguments)
		console.info(
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

	//inactive / deactivated
	handleSceneInActive() {
		//check if animation has been initiated
		//if it has been initated, try to execute 'onSceneDeactivated'
		if (this.animationInitiated() === true) {
			// TODO  TOFIX  funktioniert nicht! onSceneDeactivated is not being called!
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

	// --------- user initiated actions ---------

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
		//console.warn("SVELTHREE > SvelthreeAnimationManager > destroyAnimation")

		/** TODO  BUG  WHY?  When testing in a demo, this runs just fine / as intended, however
		 * when testing via REPL (running sapper svelthree-website on localhost:3000) an exception is being thrown
		 * "SVELTHREE Exception, TypeError: this.animation.onDestroy is not a function"
		 * If we check 'this.animation' in a demo, it contains 'onDestroy' etc, with REPL 'AnimationProp' empty
		 *
		 * check aniauto change in a demo...
		 */
		/*
			try {
				console.warn("SVELTHREE > SvelthreeAnimationManager > trying this.animation.onDestroy() : this.animation", this.animation)
				this.animation.onDestroy()
			} catch (error) {
				throw new Error("SVELTHREE Exception, " + error)
			}
			*/

		// WORKAROUND:
		// Don't try / check, just check if this.animation has 'onDestroy', if not just throw a warning, not exception.

		if (this.animation.hasOwnProperty("onDestroy")) {
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

	getAnimation(): any {
		if (this.animationInitiated()) {
			return this.animation
		}
	}
}
