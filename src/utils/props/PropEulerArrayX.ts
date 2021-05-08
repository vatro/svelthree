import type { Euler } from "svelthree-three"
import { not_equal } from "svelte/internal"
import { Propeller } from "./utils"

export default class PropEulerArrayX {
	// previous value reference
	prev: Parameters<Euler["set"]>
	prevValues: Parameters<Euler["set"]>

	public update(obj: any, key: string, value: Parameters<Euler["set"]>) {
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, key, value, "EulerParamsArray")
				this.setPrevValues(value)
				break

			case value:
				// same object, perform deep check
				for (let i = 0; i < 4; i++) {
					if (not_equal(this.prevValues[i], value[i])) {
						Propeller.update(obj, key, value, "EulerParamsArray")
						this.setPrevValues(value)
						this.prev = value
						return
					}
				}

				break
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, key, value, "EulerParamsArray")
				this.setPrevValues(value)
				this.prev = value
				break
		}
	}

	setPrevValues(value: Parameters<Euler["set"]>) {
		this.prevValues = [value[0], value[1], value[2], value[3]]
	}
}
