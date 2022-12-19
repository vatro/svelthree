import { not_equal } from "svelte/internal"
import { Propeller } from "./utils.js"
import type { SvelthreePropsOwner } from "../../types/types-extra.js"

export default class PropArray2X {
	// previous value reference
	prev: [number, number] | undefined
	prevValues: [number, number] | undefined

	constructor(private key: string, private obj_type: string, private origin: string) {}

	public update(obj: SvelthreePropsOwner, value: [number, number]): boolean {
		//v1
		switch (this.prev) {
			case undefined:
				this.prev = value
				// hot!
				Propeller.update(obj, this.obj_type, this.key, value as [number, number], this.origin, "Array2Nums")
				this.prevValues = [value[0], value[1]]
				return true

			case value:
				// same object, perform deep check
				if (this.prevValues) {
					for (let i = 0; i < 3; i++) {
						if (this.prevValues && not_equal(this.prevValues[i], value[i])) {
							Propeller.update(
								obj,
								this.obj_type,
								this.key,
								value as [number, number],
								this.origin,
								"Array2Nums"
							)
							this.prevValues = [value[0], value[1]]
							this.prev = value
							return true
						}
					}
				}

				return false
			default:
				// not undefined but !== value --> hot!
				Propeller.update(obj, this.obj_type, this.key, value as [number, number], this.origin, "Array2Nums")
				this.prevValues = [value[0], value[1]]
				this.prev = value
				return true
		}
	}
}
