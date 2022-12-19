import type { Euler } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils.js"
import type { SvelthreePropsOwner } from "../../types/types-extra.js"

export default class PropEulerX {
	// previous value reference
	prev: Euler | undefined
	prevValues: { _x: number; _y: number; _z: number; _order: string } | undefined

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: SvelthreePropsOwner, value: Euler): boolean {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Euler")
				this.setPrevValues(value)
				return true

			case value:
				// same object, perform deep check
				if (this.prevValues) {
					for (const k in this.prevValues) {
						if (not_equal(this.prevValues[k as keyof typeof this.prevValues], value[k as keyof Euler])) {
							Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Euler")
							this.setPrevValues(value)
							this.prev = value
							return true
						}
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
