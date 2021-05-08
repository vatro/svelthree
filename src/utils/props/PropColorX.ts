import type { Color } from "svelthree-three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropColorX {
	// previous value reference
	prev: Color
	prevValues: { r: number; g: number; b: number }

	public update(obj: any, key: string, value: Color) {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, key, value, "Color")
				this.setPrevValues(value)
				break

			case value:
				// same object, perform deep check
				for (let k in this.prevValues) {
					if (not_equal(this.prevValues[k], value[k])) {
						Propeller.update(obj, key, value, "Color")
						this.setPrevValues(value)
						this.prev = value
						return
					}
				}

				break
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, key, value, "Color")
				this.setPrevValues(value)
				this.prev = value
				break
		}
	}

	setPrevValues(value: Color) {
		this.prevValues = { r: value.r, g: value.g, b: value.b }
	}
}
