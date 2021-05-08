import type { Matrix4 } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropMatrix4X {
	// previous value reference
	prev: Matrix4
	prevValues: Parameters<Matrix4["set"]>

	public update(obj: any, key: string, value: Matrix4) {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, key, value, "Matrix4")
				this.setPrevValues(value)
				break

			case value:
				// same object, perform deep check
				for (let i = 0; i < 16; i++) {
					if (not_equal(this.prevValues[i], value.elements[i])) {
						Propeller.update(obj, key, value, "Matrix4")
						this.setPrevValues(value)
						this.prev = value
						return
					}
				}

				break
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, key, value, "Matrix4")
				this.setPrevValues(value)
				this.prev = value
				break
		}
	}

	setPrevValues(value: Matrix4) {
		this.prevValues = [...value.elements] as Parameters<Matrix4["set"]>
	}
}
