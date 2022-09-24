import type { Scene, Object3D } from "three"
import type { SvelthreeAnimationFunction } from "../types/types-extra"
import SvelthreeAnimationManager from "./SvelthreeAnimationManager"
import SvelthreeAnimationProp from "./SvelthreeAnimationProp"

export default class SvelthreeAnimation {
	animationEnabled: boolean
	animation: any
	aniauto: boolean
	obj: Object3D
	scene: Scene
	aniManager: SvelthreeAnimationManager

	constructor(scene: Scene, obj: Object3D, animation: SvelthreeAnimationFunction, aniauto: boolean) {
		this.scene = scene
		this.obj = obj
		this.animation = animation
		this.aniauto = aniauto

		this.createAnimationManager()
	}

	private createAnimationManager(): void {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "createAnimationManager!"))

		if (!this.aniManager) {
			this.animation = new SvelthreeAnimationProp(this.animation)
			this.aniManager = new SvelthreeAnimationManager(this.animation, this.aniauto, this.obj, this.scene)
		}
	}

	public onCurrentSceneActiveChange(currentSceneActive: boolean): void {
		this.aniManager ? this.aniManager.handleCurrentSceneStatus(currentSceneActive) : null
	}

	public getAnimation(): any {
		if (this.aniManager) {
			return this.aniManager.getAnimation()
		} else {
			console.error("SVELTHREE > SvelthreeAnimation > getAnimation : missing SvelthreeAnimationManager!", {
				aniManager: this.aniManager
			})

			return undefined
		}
	}

	public destroyAnimation(): void {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "destroyAnimation!"))
		if (this.aniManager) {
			this.aniManager.destroyAnimation()
		} else {
			if (this.animation && this.animationEnabled) {
				console.error(
					"SVELTHREE > SvelthreeAnimation > destroyAnimation : missing SvelthreeAnimationManager!",
					{ aniManager: this.aniManager }
				)
			}
		}
	}

	public startAni(): void {
		if (this.aniManager) {
			this.aniManager.startAni()
		} else {
			console.error("SVELTHREE > SvelthreeAnimation > startAni : missing SvelthreeAnimationManager!", {
				aniManager: this.aniManager
			})
		}
	}
}
