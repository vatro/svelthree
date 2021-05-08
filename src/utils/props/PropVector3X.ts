import type { Vector3 } from "svelthree-three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropVector3X {
	// previous value reference
	prev: Vector3
	prevValues: { x: number; y: number; z: number }

	public update(obj: any, key: string, value: Vector3) {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, key, value, "Vector3")
				this.setPrevValues(value)
				break

			case value:
				// same object, perform deep check
				for (let k in value) {
					if (not_equal(this.prevValues[k], value[k])) {
						Propeller.update(obj, key, value, "Vector3")
						this.setPrevValues(value)
						this.prev = value
						return
					}
				}

				break
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, key, value, "Vector3")
				this.setPrevValues(value)
				this.prev = value
				break
		}
	}

	setPrevValues(value: Vector3) {
		this.prevValues = { x: value.x, y: value.y, z: value.z }
	}
}
