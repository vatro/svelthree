import type { Vector3 } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils.js"
import type { SvelthreePropsOwner } from "../../types/types-extra.js"

export default class PropVector3X {
	// previous value reference
	prev: Vector3 | undefined
	prevValues: { x: number; y: number; z: number } | undefined

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: SvelthreePropsOwner, value: Vector3): boolean {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Vector3")
				this.setPrevValues(value)
				return true

			case value:
				// same object, perform deep check
				if (this.prevValues) {
					for (const k in value) {
						if (
							not_equal(
								this.prevValues[k as keyof typeof this.prevValues],
								value[k as keyof typeof this.prevValues]
							)
						) {
							Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Vector3")
							this.setPrevValues(value)
							this.prev = value
							return true
						}
					}
				}
				return false
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Vector3")
				this.setPrevValues(value)
				this.prev = value
				return true
		}
	}

	setPrevValues(value: Vector3) {
		this.prevValues = { x: value.x, y: value.y, z: value.z }
	}
}
