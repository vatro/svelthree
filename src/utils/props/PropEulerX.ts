import type { Euler } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropEulerX {
	// previous value reference
	prev: Euler
	prevValues: { _x: number; _y: number; _z: number; _order: string }

	public update(obj: any, key: string, value: Euler) {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, key, value, "Euler")
				this.setPrevValues(value)
				break

			case value:
				// same object, perform deep check
				for (let k in this.prevValues) {
					if (not_equal(this.prevValues[k], value[k])) {
						Propeller.update(obj, key, value, "Euler")
						this.setPrevValues(value)
						this.prev = value
						return
					}
				}

				break
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, key, value, "Euler")
				this.setPrevValues(value)
				this.prev = value
				break
		}
	}

	setPrevValues(value: Euler) {
		this.prevValues = { _x: value.x, _y: value.y, _z: value.z, _order: value.order }
	}
}
