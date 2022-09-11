import { not_equal } from "svelte/internal"
import type { Array3 } from "../../types/types-extra"
import { Propeller } from "./utils"

export default class PropArray3X {
	// previous value reference
	prev: Array3
	prevValues: Array3

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: any, value: Array3): boolean {
		//v1
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Array3Nums")
				this.prevValues = [value[0], value[1], value[2]]
				return true

			case value:
				// same object, perform deep check
				for (let i = 0; i < 3; i++) {
					if (not_equal(this.prevValues[i], value[i])) {
						Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Array3Nums")
						this.prevValues = [value[0], value[1], value[2]]
						this.prev = value
						return true
					}
				}

				return false
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, this.obj_type, this.key, value, this.origin, "Array3Nums")
				this.prevValues = [value[0], value[1], value[2]]
				this.prev = value
				return true
		}
	}
}
