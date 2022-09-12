import type { Color } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropColorX {
	// previous value reference
	prev: Color
	prevValues: { r: number; g: number; b: number }

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: any, value: Color): boolean {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Color")
				this.setPrevValues(value)
				return true

			case value:
				// same object, perform deep check
				for (const k in this.prevValues) {
					if (not_equal(this.prevValues[k], value[k])) {
						Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Color")
						this.setPrevValues(value)
						this.prev = value
						return true
					}
				}

				return false
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Color")
				this.setPrevValues(value)
				this.prev = value
				return true
		}
	}

	setPrevValues(value: Color) {
		this.prevValues = { r: value.r, g: value.g, b: value.b }
	}
}
