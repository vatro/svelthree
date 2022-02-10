import { not_equal } from "svelte/internal"
import type { Array3 } from "../../types-extra"
import { Propeller } from "./utils"

export default class PropArray3X {
	// previous value reference
	prev: Array3
	prevValues: Array3

	constructor() {}

	public update(obj: any, key: string, value: Array3) {
		//v1
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, key, value, "Array3Nums")
				this.prevValues = [value[0], value[1], value[2]]
				break

			case value:
				// same object, perform deep check
				for (let i = 0; i < 3; i++) {
					if (not_equal(this.prevValues[i], value[i])) {
						Propeller.update(obj, key, value, "Array3Nums")
						this.prevValues = [value[0], value[1], value[2]]
						this.prev = value
						return
					}
				}

				break
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, key, value, "Array3Nums")
				this.prevValues = [value[0], value[1], value[2]]
				this.prev = value
				break
		}
	}
}
