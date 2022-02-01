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
import { not_equal } from "svelte/internal"
import Propeller from "./Propeller"
import PropUtils from "./PropUtils"
import type { ComplexValueType } from "../types-extra"
import { verbose_mode } from "../utils/SvelthreeLogger"

type ComplexValueItem = {
	key: string
	value: any
	complex: ComplexValueType
}

type ComplexValuator = typeof PropArray3X

export default class SvelthreeProps {
	obj: any
	propsPrev: { [key: string]: any }
	simpleValues: { [key: string]: any }

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
	}

	public update(props: { [key: string]: any }) {
		//if (verbose_mode()) console.debug("SvelthreeProps2 > onProps!")
		//if(this.obj.type?.includes("Material")) { debugger }
		//if(this.obj.type?.includes("Camera")) { debugger }
		if (this.propsPrev) {
			// new props object
			if (this.propsPrev !== props) {
				this.resetAndMap(props)
				this.propsPrev = props
			}
			// same props object
			else {
				this.checkProps(props)
			}
		} else {
			// initial
			this.resetAndMap(props)
			this.propsPrev = props
		}
	}

	resetAndMap(props: { [key: string]: any }) {
		this.simpleValues = {}
		this.complexValues = []

		// map props
		for (let k in props) {
			let complexType: ComplexValueType = PropUtils.checkIfComplexValueType(props[k])

			if (complexType) {
				let item: ComplexValueItem
				let valuator: ComplexValuator = this.complexValuators[complexType]
				item = { key: k, value: new valuator(), complex: complexType }
				this.complexValues.push(item)

				//complexValuesIndices[k] = complexValues.length - 1

				// all are hot
				// update complex via Propeller.update(obj, key, value, complex)
				// Propeller.update(obj, k, item.value, item.complex)
				item.value.update(this.obj, k, props[k])
			} else {
				this.simpleValues[k] = props[k]
				// all are hot
				// update simple directly via PropUtils.applyValueToProp(obj, value, key)
				Propeller.update(this.obj, k, this.simpleValues[k])
			}
		}
	}

	checkProps(props: { [key: string]: any }) {
		//if (verbose_mode()) console.debug("SVELTHREE > SvelthreeProps2x > checkProps!")
		//if(this.obj.type?.includes("Material")) { debugger }
		//if(this.obj.type?.includes("Camera")) { debugger }
		// check complex props
		for (let i = 0; i < this.complexValues.length; i++) {
			// v1
			this.complexValues[i].value.update(this.obj, this.complexValues[i].key, props[this.complexValues[i].key])

			// v2
			// PERFORMANCE  directly via Proppeler without check : doesn't improve much / if at all at 5000
			//Propeller.update(this.obj, this.complexValues[i].key, props[this.complexValues[i].key], "Array3Nums")
		}

		// check simple props
		for (let k in this.simpleValues) {
			//v1

			if (not_equal(this.simpleValues[k], props[k])) {
				//if (verbose_mode()) console.debug("SVELTHREE > SvelthreeProps2x > checkProps > not_equal!", {k, "this.simpleValues[k]": this.simpleValues[k], "props[k]": props[k]})
				Propeller.update(this.obj, k, props[k])
				this.simpleValues[k] = props[k]
			}

			//v2
			// PERFORMANCE  doesn't improve much / not at all
			/*
            PropUtils.applyValueToProp(this.obj, props[k], k)
            this.simpleValues[k] = props[k]
            */
		}
	}
}
