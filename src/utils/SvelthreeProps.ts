import {
	PropArray3X,
	PropColorX,
	PropEulerX,
	PropMatrix4X,
	PropVector3X,
	PropEulerArrayX,
	PropQuaternionX,
	PropMatrix4ArrayX,
	PropQuaternionArrayX
} from "./props"
import { safe_not_equal, has_prop } from "svelte/internal"
import Propeller from "./Propeller"
import PropUtils from "./PropUtils"
import type { ComplexValueType } from "../types-extra"

export type PropOrigin = "own" | "inherited"

type ComplexValueItem = {
	key: string
	value: any
	complex: ComplexValueType
}

type SimpleValueItem = {
	key: string
	value: any
	origin: PropOrigin | null
}

type ComplexValuator = typeof PropArray3X

/**
 * Analyzes the type `props` object's properties, and updates corresponding `three` instance's properties via `Propeller`:
 * - **"reactive" _complex_ values**: if any part of a _complex_ value has changed, like e.g. `c` of a `Matrix4` type property,
 *   the `three` instance's property will be updated via `Propeller`,
 *   although the `Matrix4` object itself is still the same object as before.
 *
 *   ☝️ _'complex' values like `Array`, `Color`, `Euler`, `Matrix` etc. should be **immutable**
 *   as their `valuator` will be assigned only once a (new) unique `props` object was assigned,
 *   not at each (reactive) properties change._
 * ---
 * - **partially "reactive" _simple_ values**:
 *   - **reactive** -> nummeric, strings, boolean etc. properties will be updated via `Propeller` only if they've changed.
 *   - **not reactive** -> object and function properties will **always** be updated / reassigned via `Propeller`
 * ---
 *
 * ⚙️ `Propeller` redirects some `props` object properties to specific `PropUtils` update methods and also
 * allows special handling if needed when updating a specific `props` object's property.
 */
export default class SvelthreeProps {
	obj: any
	obj_type: string
	propsPrev: { [key: string]: any }
	simpleValues: SimpleValueItem[]

	updatedKeys: string[]
	complexValues: ComplexValueItem[]

	complexValuators: { [key in ComplexValueType]: any } = {
		Vector3: PropVector3X,
		Array3Nums: PropArray3X,
		Euler: PropEulerX,
		EulerParamsArray: PropEulerArrayX,
		Quaternion: PropQuaternionX,
		QuaternionParamsArray: PropQuaternionArrayX,
		Matrix4: PropMatrix4X,
		Matrix4ParamsArray: PropMatrix4ArrayX,
		Color: PropColorX
	}

	constructor(obj: any) {
		this.obj = obj
		this.obj_type = this.get_obj_type()
	}

	get_obj_type(): string {
		return this.obj["type"] || this.obj.constructor.name
	}

	/**
	 * Process a `props` object / update corresponding properties via `Propeller`.
	 *
	 * ☝️ _'complex' values like `Array`, `Color`, `Euler`, `Matrix` etc. should be **immutable**
	 * as their `valuator` will be assigned only once the unique `props` object was assigned,
	 * not at each (reactive) properties change._
	 */
	public update(props: { [key: string]: any }): string[] {
		// UPDATE -> `props` has already been processed at least once -> `this.propsPrev` available
		if (this.propsPrev) {
			// `props` was assigned a new object different from the initially processed one (`this.propsPrev`)
			if (this.propsPrev !== props) {
				// clear everything and 'map' the new `props` object
				this.resetAndMap(props)
				this.propsPrev = props
			}
			// `props` is the same object as the initially processed one (`this.propsPrev`)
			else {
				// clear `updatedKeys` and check which properties inside the object have changed.
				this.updatedKeys = []
				this.checkProps(props)
			}
		} else {
			// INITIALIZE -> `props` was not processed yet -> `this.propsPrev` not available
			this.resetAndMap(props)
			this.propsPrev = props
		}

		// return an array of updated keys after update
		return this.updatedKeys
	}

	// `props` object is a new one (changed)
	resetAndMap(props: { [key: string]: any }) {
		this.simpleValues = []
		this.complexValues = []
		this.updatedKeys = []

		// analyze and sort `props` object's properties
		for (let k in props) {
			const complexType: ComplexValueType | undefined = PropUtils.checkIfComplexValueType(props[k])
			const is_own_prop: any = has_prop(this.obj, k)
			const is_inherited_prop: boolean = is_own_prop ? false : this.obj[k] ? true : false
			const origin: PropOrigin | null = is_own_prop ? "own" : is_inherited_prop ? "inherited" : null

			if (origin) {
				if (complexType) {
					// determine the correct `valuator`
					const valuator: ComplexValuator = this.complexValuators[complexType]

					const item: ComplexValueItem = {
						key: k,
						value: new valuator(k, this.obj_type, origin),
						complex: complexType
					}
					this.complexValues.push(item)

					// initialize
					item.value.update(this.obj, props[k])
					this.updatedKeys.push(k)
				} else {
					const item: SimpleValueItem = { key: k, value: props[k], origin }
					this.simpleValues.push(item)
					// initialize
					Propeller.update(this.obj, this.obj_type, k, props[k], origin)
					this.updatedKeys.push(k)
				}
			} else {
				console.error(
					`SVELTHREE > SvelthreeProps > unknown property '${k}' in 'props' object -> not available on ${this.obj_type}`
				)
			}
		}
	}

	// `props` object is the same one
	checkProps(props: { [key: string]: any }) {
		// check complex props
		// reassign / update only if the 'complex' value object itself or any of its parts have changed.
		for (let i = 0; i < this.complexValues.length; i++) {
			const k = this.complexValues[i].key
			const updated: boolean = this.complexValues[i].value.update(this.obj, props[k])
			if (updated) this.updatedKeys.push(k)
		}

		// check 'simple' props (nummeric, strings, boolean... + objects and functions)
		for (let j = 0; j < this.simpleValues.length; j++) {
			const k = this.simpleValues[j].key
			const prop_value = this.simpleValues[j].value
			const prop_origin = this.simpleValues[j].origin

			// current property value is different than the previous one.
			// always reassign / update nested ('non complex value') objects and functions.
			if (safe_not_equal(prop_value, props[k])) {
				Propeller.update(this.obj, this.obj_type, k, props[k], prop_origin)
				this.simpleValues[j].value = props[k]
				this.updatedKeys.push(k)
			}
		}
	}
}
