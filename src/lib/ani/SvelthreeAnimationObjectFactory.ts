import type { Object3D } from "three"
import type { SvelthreeAnimationFunction } from "../types/types-extra"

export default class SvelthreeAnimationProp {
	fn: SvelthreeAnimationFunction

	constructor(fn: SvelthreeAnimationFunction) {
		this.fn = fn
	}

	initiate(obj: Object3D, ...args: any[]): any {
		let initiatedFn: any

		try {
			initiatedFn = this.fn(obj, args)

			if (!Object.prototype.hasOwnProperty.call(initiatedFn, "onStart")) {
				console.error("SVELTHREE > Provided animation is missing 'onStart' function!", {
					animation: initiatedFn
				})
				//throw new Error("SVELTHREE Exception (see warning above)")
			}

			if (!Object.prototype.hasOwnProperty.call(initiatedFn, "onDestroy")) {
				console.error("SVELTHREE > Provided animation has no 'onDestroy' function!", {
					animation: initiatedFn
				})
				//throw new Error("SVELTHREE Exception (see warning above)")
			}
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}

		return initiatedFn
	}
}
