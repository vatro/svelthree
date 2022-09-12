import type { Quaternion } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropQuaternionX {
	// previous value reference
	prev: Quaternion
	prevValues: { x: number; y: number; z: number; w: number }

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: any, value: Quaternion): boolean {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Quaternion")
				this.setPrevValues(value)
				return true

			case value:
				// same object, perform deep check
				for (const k in value) {
					if (not_equal(this.prevValues[k], value[k])) {
						Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Quaternion")
						this.setPrevValues(value)
						this.prev = value
						return true
					}
				}

				return false
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Quaternion")
				this.setPrevValues(value)
				this.prev = value
				return true
		}
	}

	setPrevValues(value: Quaternion) {
		this.prevValues = { x: value.x, y: value.y, z: value.z, w: value.w }
	}
}
