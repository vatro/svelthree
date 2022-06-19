import type { Euler } from "three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropEulerArrayX {
	// previous value reference
	prev: Parameters<Euler["set"]>
	prevValues: Parameters<Euler["set"]>

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: any, value: Parameters<Euler["set"]>): boolean {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "EulerParamsArray")
				this.setPrevValues(value)
				return true

			case value:
				// same object, perform deep check
				for (let i = 0; i < 4; i++) {
					if (not_equal(this.prevValues[i], value[i])) {
						Propeller.update(obj, this.obj_type, this.key, value, this.origin, "EulerParamsArray")
						this.setPrevValues(value)
						this.prev = value
						return true
					}
				}

				return false
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "EulerParamsArray")
				this.setPrevValues(value)
				this.prev = value
				return true
		}
	}

	setPrevValues(value: Parameters<Euler["set"]>) {
		this.prevValues = [value[0], value[1], value[2], value[3]]
	}
}
