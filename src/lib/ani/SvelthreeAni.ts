import type { Scene, Object3D } from "three"
import type { SvelthreeAnimationFunction, SvelthreeAnimation } from "../types/types-extra.js"
import SvelthreeAnimationManager from "./SvelthreeAnimationManager.js"
import SvelthreeAnimationObjectFactory from "./SvelthreeAnimationObjectFactory.js"

export default class SvelthreeAni {
	private ani_obj_factory: SvelthreeAnimationObjectFactory | undefined = undefined
	private ani_manager: SvelthreeAnimationManager | undefined = undefined

	constructor(
		private scene: Scene | undefined | null,
		private foo: Object3D | undefined | null,
		private ani_fn: SvelthreeAnimationFunction,
		private aniauto: boolean
	) {
		this.create_ani_manager()
	}

	private create_ani_manager(): void {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "createAnimationManager!"))

		if (this.foo && !this.ani_manager) {
			this.ani_obj_factory = new SvelthreeAnimationObjectFactory(this.ani_fn)
			this.ani_manager = new SvelthreeAnimationManager(this.ani_obj_factory, this.aniauto, this.foo, this.scene)
		}
	}

	public onCurrentSceneActiveChange(currentSceneActive: boolean): void {
		this.ani_manager ? this.ani_manager.handleCurrentSceneStatus(currentSceneActive) : null
	}

	public getAnimation(): SvelthreeAnimation | undefined {
		if (this.ani_manager) {
			return this.ani_manager.getAnimation()
		} else {
			console.error("SVELTHREE > SvelthreeAnimation > getAnimation : missing SvelthreeAnimationManager!", {
				ani_manager: this.ani_manager
			})

			return undefined
		}
	}

	public destroyAnimation(): void {
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "destroyAnimation!"))
		if (this.ani_manager) {
			this.ani_manager.destroyAnimation()
		} else {
			console.error("SVELTHREE > SvelthreeAnimation > destroyAnimation : missing SvelthreeAnimationManager!", {
				ani_manager: this.ani_manager
			})
		}
	}

	public startAnimation(): void {
		if (this.ani_manager) {
			this.ani_manager.startAnimation()
		} else {
			console.error("SVELTHREE > SvelthreeAnimation > startAni : missing SvelthreeAnimationManager!", {
				ani_manager: this.ani_manager
			})
		}
	}
}
