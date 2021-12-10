import { not_equal } from "svelte/internal"
import type { Array3 } from "../../types-extra"
import { Propeller } from "./utils"
import { verbose_mode } from "../../utils/SvelthreeLogger"

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
				//if (verbose_mode()) console.debug("PropArray3X > hot undefined!")
				Propeller.update(obj, key, value, "Array3Nums")
				//this.prevValues = [...value]
				this.prevValues = [value[0], value[1], value[2]]
				break

			case value:
				// same object, perform deep check
				//if (verbose_mode()) console.debug("PropArray3X > deep check!")
				// v1

				for (let i = 0; i < 3; i++) {
					if (not_equal(this.prevValues[i], value[i])) {
						Propeller.update(obj, key, value, "Array3Nums")
						this.prevValues = [value[0], value[1], value[2]]
						this.prev = value
						return
					}
				}

				// PERFORMANCE  no at all / not much difference at 5000
				/*
                for (let i = 0; i < 3; i++) {
                    if (this.prevValues[i] !== value[i]) {
                        Propeller.update(obj, key, value, "Array3Nums")
                        //this.prevValues = [...value]
                        this.prevValues = [value[0], value[1], value[2]]
                        return
                    }
                }
                */

				// PERFORMANCE  no at all / not much difference at 5000
				/*
               if (not_equal(this.prevValues[0], value[0]) || not_equal(this.prevValues[1], value[1]) || not_equal(this.prevValues[2], value[2])) {
                    Propeller.update(obj, key, value, "Array3Nums")
                    this.prevValues = [value[0], value[1], value[2]]
               }
               */

				// v2
				// PERFORMANCE  SLOW  use for in loop
				/*
                for(let i in value) {
                    if (not_equal(this.prevValues[i], value[i])) {
                        Propeller.update(obj, key, value, "Array3Nums")
                        //this.prevValues = [...value]
                        this.prevValues = [value[0], value[1], value[2]]
                        return
                    }
                }
                */

				break
			default:
				// not undefined but !== value --> hot!
				//if (verbose_mode()) console.debug("PropArray3X > hot new!")
				Propeller.update(obj, key, value, "Array3Nums")
				// this.prevValues = [...value]
				this.prevValues = [value[0], value[1], value[2]]
				this.prev = value
				break
		}

		// v2 - no change check at all
		// PERFORMANCE  doesn't improve much / ca. 0.5ms / frame at 5000
		//Propeller.update(obj, key, value, "Array3Nums")
	}
}
