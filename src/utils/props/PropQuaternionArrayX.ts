import type { Quaternion } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropQuaternionArrayX {
	// previous value reference
	prev: Parameters<Quaternion["set"]>
	prevValues: Parameters<Quaternion["set"]>

	public update(obj: any, key: string, value: Parameters<Quaternion["set"]>) {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, key, value, "QuaternionParamsArray")
				this.setPrevValues(value)
				break

			case value:
				// same object, perform deep check
				for (let i = 0; i < 4; i++) {
					if (not_equal(this.prevValues[i], value[i])) {
						Propeller.update(obj, key, value, "QuaternionParamsArray")
						this.setPrevValues(value)
						this.prev = value
						return
					}
				}

				break
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, key, value, "QuaternionParamsArray")
				this.setPrevValues(value)
				this.prev = value
				break
		}
	}

	setPrevValues(value: Parameters<Quaternion["set"]>) {
		this.prevValues = [value[0], value[1], value[2], value[3]]
	}
}
