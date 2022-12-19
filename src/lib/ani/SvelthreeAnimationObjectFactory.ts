import type { Object3D } from "three"
import type { SvelthreeAnimationFunction, SvelthreeAnimation } from "../types/types-extra.js"

export default class SvelthreeAnimationObjectFactory {
	constructor(private ani_fn: SvelthreeAnimationFunction) {}

	/*eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }]*/
	public create(foo: Object3D, ...args: any[]): SvelthreeAnimation {
		let ani_obj: SvelthreeAnimation

		try {
			ani_obj = this.ani_fn(foo, args)

			if (!Object.hasOwn(ani_obj, "onStart")) {
				console.error("SVELTHREE > Provided animation is missing 'onStart' function!", {
					animation: ani_obj
				})
				//throw new Error("SVELTHREE Exception (see warning above)")
			}

			if (!Object.hasOwn(ani_obj, "onDestroy")) {
				console.error("SVELTHREE > Provided animation has no 'onDestroy' function!", {
					animation: ani_obj
				})
				//throw new Error("SVELTHREE Exception (see warning above)")
			}
		} catch (err) {
			throw new Error("SVELTHREE Exception, " + err)
		}

		return ani_obj
	}
}
