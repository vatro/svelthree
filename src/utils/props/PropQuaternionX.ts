import type { Quaternion } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropQuaternionX {
	// previous value reference
	prev: Quaternion
	prevValues: { x: number; y: number; z: number; w: number }

	public update(obj: any, key: string, value: Quaternion) {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, key, value, "Quaternion")
				this.setPrevValues(value)
				break

			case value:
				// same object, perform deep check
				for (let k in value) {
					if (not_equal(this.prevValues[k], value[k])) {
						Propeller.update(obj, key, value, "Quaternion")
						this.setPrevValues(value)
						this.prev = value
						return
					}
				}

				break
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, key, value, "Quaternion")
				this.setPrevValues(value)
				this.prev = value
				break
		}
	}

	setPrevValues(value: Quaternion) {
		this.prevValues = { x: value.x, y: value.y, z: value.z, w: value.w }
	}
}
