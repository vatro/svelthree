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

				// all are hot
				item.value.update(this.obj, k, props[k])
			} else {
				this.simpleValues[k] = props[k]
				// all are hot
				Propeller.update(this.obj, k, this.simpleValues[k])
			}
		}
	}

	checkProps(props: { [key: string]: any }) {
		// check complex props
		for (let i = 0; i < this.complexValues.length; i++) {
			this.complexValues[i].value.update(this.obj, this.complexValues[i].key, props[this.complexValues[i].key])
		}

		// check simple props
		for (let k in this.simpleValues) {
			if (not_equal(this.simpleValues[k], props[k])) {
				Propeller.update(this.obj, k, props[k])
				this.simpleValues[k] = props[k]
			}
		}
	}
}
