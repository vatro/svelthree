import type { Matrix4 } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils.js"
import type { SvelthreePropsOwner } from "../../types/types-extra.js"

export default class PropMatrix4ArrayX {
	// previous value reference
	prev: Matrix4 | undefined
	prevValues: Parameters<Matrix4["set"]> | undefined

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: SvelthreePropsOwner, value: Matrix4): boolean {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Matrix4ParamsArray")
				this.setPrevValues(value)
				return true

			case value:
				// same object, perform deep check
				if (this.prevValues) {
					for (let i = 0; i < 16; i++) {
						if (not_equal(this.prevValues[i], value.elements[i])) {
							Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Matrix4ParamsArray")
							this.setPrevValues(value)
							this.prev = value
							return true
						}
					}
				}

				return false
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Matrix4ParamsArray")
				this.setPrevValues(value)
				this.prev = value
				return true
		}
	}

	setPrevValues(value: Matrix4) {
		this.prevValues = [...value.elements] as Parameters<Matrix4["set"]>
	}
}
