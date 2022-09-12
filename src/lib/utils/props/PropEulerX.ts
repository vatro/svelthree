import type { Euler } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropEulerX {
	// previous value reference
	prev: Euler
	prevValues: { _x: number; _y: number; _z: number; _order: string }

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: any, value: Euler): boolean {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Euler")
				this.setPrevValues(value)
				return true

			case value:
				// same object, perform deep check
				for (const k in this.prevValues) {
					if (not_equal(this.prevValues[k], value[k])) {
						Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Euler")
						this.setPrevValues(value)
						this.prev = value
						return true
					}
				}

				return false
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Euler")
				this.setPrevValues(value)
				this.prev = value
				return true
		}
	}

	setPrevValues(value: Euler) {
		this.prevValues = { _x: value.x, _y: value.y, _z: value.z, _order: value.order }
	}
}
