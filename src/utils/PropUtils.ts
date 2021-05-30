/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import { not_equal } from "svelte/internal"
import type { Light, Material, Object3D } from "three"
import { Color, Euler, Matrix4, Quaternion, Vector3 } from "three"
import type { ComplexValueType, LightWithShadow } from "../types-extra"
import type { default as Empty } from "./components/Empty.svelte"

/**
 * Containes public static methods for checking types of properties.
 */
export default class PropUtils {
	public static getShortHandAttrWarnings(prefix: string): { [key: string]: any } {
		let warnings = {
			rot: `${prefix} 'rot' attribute ignored! : overridden by either 'matrix' or 'quat' attribute!`,
			pos: `${prefix} 'pos' attribute ignored! : overridden by 'matrix' attribute!`,
			quat: `${prefix} 'quat' attribute ignored! : overridden by 'matrix' attribute!`,
			scale: `${prefix} 'scale' attribute ignored! : overridden by 'matrix' attribute!`,
			lookAt: `${prefix} 'lookAt' attribute ignored! : overridden by 'matrix' attribute!`
		}

		return warnings
	}

	public static warn(message: string) {
		console.warn(message)
	}

	public static log(): boolean {
		return false
	}

	public static isPropType(p: any): boolean {
		if (p?.constructor === Array) return true
		if (p?.constructor === Vector3) return true
		if (p?.constructor === Color) return true
		if (p?.constructor === Matrix4) return true
		if (p?.constructor === Euler) return true
		if (p?.constructor === Quaternion) return true
		return false
	}

	public static isArray3Nums(p: any): boolean {
		// every() PERFORMANCE : 0,11 ms (at 6x CPU slowdown)
		//return p?.constructor === Array && p.length === 3 && p.every((el) => !isNaN(el))
		return p?.constructor === Array && p.length === 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])
	}

	public static isArray(p: any): boolean {
		return p?.constructor === Array
	}

	public static isColor(p: any): boolean {
		return p?.constructor === Color
	}

	public static isVector3(p: any): boolean {
		return p?.constructor === Vector3
	}

	public static isMatrix4(p: any): boolean {
		return p?.constructor === Matrix4
	}

	public static isMatrix4ParamsArray(p: any): boolean {
		return p?.constructor === Array && p.length === 16 && p.every((el) => !isNaN(el))
	}

	public static isEuler(p: any): boolean {
		return p?.constructor === Euler
	}

	public static isEulerParamsArray(p: any): boolean {
		return (
			p?.constructor === Array &&
			p.length === 4 &&
			!isNaN(p[0]) &&
			!isNaN(p[1]) &&
			!isNaN(p[2]) &&
			typeof p[3] === "string"
		)
	}

	public static isQuaternion(p: any): boolean {
		return p?.constructor === Quaternion
	}

	public static isQuaternionParamsArray(p: any): boolean {
		return p?.constructor === Array && p.length === 4 && p.every((el) => !isNaN(el))
	}

	public static checkIfComplexValueType(val: any): ComplexValueType {
		if (Array.isArray(val)) {
			if (PropUtils.isArray3Nums(val)) return "Array3Nums"
			if (PropUtils.isEulerParamsArray(val)) return "EulerParamsArray"
			if (PropUtils.isQuaternionParamsArray(val)) return "QuaternionParamsArray"
			if (PropUtils.isMatrix4ParamsArray(val)) return "Matrix4ParamsArray"
		} else {
			if (PropUtils.isVector3(val)) return "Vector3"
			if (PropUtils.isColor(val)) return "Color"
			if (PropUtils.isEuler(val)) return "Euler"
			if (PropUtils.isQuaternion(val)) return "Quaternion"
			if (PropUtils.isMatrix4(val)) return "Matrix4"
		}

		return undefined
	}

	public static setRotationFromValue(obj: Object3D, val: any, complex?: ComplexValueType): void {
		/*
			console.warn(
				"SVELTHREE > PropUtils > setRotationFromValue! obj.matrixAutoUpdate before!",
				obj.matrixAutoUpdate
			)
			*/
		// console.warn("SVELTHREE > PropUtils > setRotationFromValue!")
		//PropUtils.inferMatrixAutoUpdate(obj, true)

		switch (complex) {
			case undefined:
				if (Array.isArray(val)) {
					/*  // IMPORTANT  no Speed up
						obj.rotation.set(val[0], val[1], val[2])
						obj.matrixAutoUpdate = true
						obj.matrixWorldNeedsUpdate = true

						return
						*/

					PropUtils.isArray3Nums(val)
						? // IMPORTANT  no Speed up
						  //? (obj.rotation.set(val[0], val[1], val[2]), obj.matrixAutoUpdate = true, obj.matrixWorldNeedsUpdate = true) //PropUtils.setRotArray3(obj, val as Parameters<Vector3["set"]>)
						  PropUtils.setRotArray3(obj, val as Parameters<Vector3["set"]>)
						: PropUtils.isEulerParamsArray(val)
						? PropUtils.setRotEulerArray(obj, val as Parameters<Euler["set"]>)
						: PropUtils.isQuaternionParamsArray(val)
						? PropUtils.setRotQuaternionArray(obj, val as Parameters<Quaternion["set"]>)
						: console.error("SVELTHREE > PropUtils > setRotationFromValue : invalid 'rotation' value!", {
								obj: obj,
								value: val
						  })
				} else {
					PropUtils.isEuler(val)
						? PropUtils.setRotEuler(obj, val)
						: PropUtils.isVector3(val)
						? PropUtils.setRotVector3(obj, val)
						: PropUtils.isQuaternion(val)
						? PropUtils.setRotQuaternion(obj, val)
						: console.error("SVELTHREE > PropUtils > setRotationFromValue : invalid 'rotation' value!", {
								obj: obj,
								value: val
						  })
				}
				break
			case "Euler":
				PropUtils.setRotEuler(obj, val)
				break
			case "EulerParamsArray":
				PropUtils.setRotEulerArray(obj, val)
				break
			case "Vector3":
				PropUtils.setRotVector3(obj, val)
				break
			case "Array3Nums":
				PropUtils.setRotArray3(obj, val)
				break
			case "Quaternion":
				PropUtils.setRotQuaternion(obj, val)
				break
			case "QuaternionParamsArray":
				PropUtils.setRotQuaternionArray(obj, val)
				break
			default:
				console.error(
					"SVELTHREE > PropUtils > setRotationFromValue : invalid 'rotation' value! No such 'ComplexValueType'!",
					{
						obj: obj,
						value: val,
						complex: complex
					}
				)
				break
		}

		// we got to update matrix if 'matrixAutoUpdate' is false
		//if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)

		/*
			console.warn(
				"SVELTHREE > PropUtils > setRotationFromValue! obj.matrixAutoUpdate after!",
				obj.matrixAutoUpdate
			)
			*/
	}

	public static setRotEuler(obj: Object3D, val: Euler): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setRotEuler : ", { obj, val })
		//obj.setRotationFromEuler(val as Euler)
		PropUtils.executeDecoratedMAU(obj, () => obj.setRotationFromEuler(val as Euler))
	}

	public static setRotEulerArray(obj: Object3D, val: Parameters<Euler["set"]>): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setRotEulerArray : ", { obj, val })
		//obj.rotation.set(val[0], val[1], val[2], val[3])
		PropUtils.executeDecoratedMAU(obj, () => obj.rotation.set(val[0], val[1], val[2], val[3]))
	}

	public static setRotVector3(obj: Object3D, val: Vector3): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setRotVector3 : ", { obj, val })
		//obj.rotation.set(val.x, val.y, val.z)
		PropUtils.executeDecoratedMAU(obj, () => obj.rotation.set(val.x, val.y, val.z))
	}

	public static setRotArray3(obj: Object3D, val: Parameters<Vector3["set"]>): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setRotQuaternion : ", { obj, val })
		//obj.rotation.set(val[0], val[1], val[2])
		//console.time("setRotArray3")

		/* IMPORTANT  SLOW 
		//PropUtils.executeDecoratedMAU(obj, () => obj.rotation.set(val[0], val[1], val[2]))

		/* IMPORTANT  SLOW 
		obj.rotation.set(val[0], val[1], val[2])
		obj.matrixAutoUpdate = true
		obj.matrixWorldNeedsUpdate = true
		*/

		/* IMPORTANT  SLOW */
		obj.rotation.x = val[0]
		obj.rotation.y = val[1]
		obj.rotation.z = val[2]
		obj.matrixAutoUpdate = true
		obj.matrixWorldNeedsUpdate = true

		//console.timeEnd("setRotArray3")
	}

	public static setRot(obj: Object3D, val: Euler | Parameters<Euler["set"]>): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setRot : ", { obj, val })

		obj.rotation.set(val[0], val[1], val[2])
		obj.matrixAutoUpdate = true
		obj.matrixWorldNeedsUpdate = true
	}

	public static setRotQuaternion(obj: Object3D, val: Quaternion): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setRotQuaternion : ", { obj, val })
		//obj.setRotationFromQuaternion(val)
		PropUtils.executeDecoratedMAU(obj, () => obj.setRotationFromQuaternion(val))
	}

	public static setRotQuaternionArray(obj: Object3D, val: Parameters<Quaternion["set"]>): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setRotQuaternionArray : ", { obj, val })
		//obj.quat.set(val[0], val[1], val[2], val[3])
		PropUtils.executeDecoratedMAU(obj, () => obj.quaternion.set(val[0], val[1], val[2], val[3]))
	}

	public static setPositionFromValue(
		obj: Object3D,
		val: Vector3 | Parameters<Vector3["set"]>,
		complex?: ComplexValueType
	): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setPositionFromValue : ", { obj, val, complex })
		switch (complex) {
			case undefined:
				PropUtils.isArray3Nums(val)
					? PropUtils.setPositionFromArray3(obj, val as Parameters<Vector3["set"]>)
					: PropUtils.isVector3(val)
					? PropUtils.setPositionFromVector3(obj, val as Vector3)
					: console.error("SVELTHREE > PropUtils > setPositionFromValue : invalid 'position' value!", {
							obj: obj,
							value: val
					  })
				break
			case "Array3Nums":
				PropUtils.setPositionFromArray3(obj, val as Parameters<Vector3["set"]>)
				break
			case "Vector3":
				PropUtils.setPositionFromVector3(obj, val as Vector3)
				break
			default:
				console.error(
					"SVELTHREE > PropUtils > setPositionFromValue : invalid 'position' value! No such 'ComplexValueType'!",
					{
						obj: obj,
						value: val,
						complex: complex
					}
				)
				break
		}
	}

	public static setPositionFromVector3(obj: Object3D, val: Vector3) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setPositionFromVector3 : ", { obj, val })
		PropUtils.executeDecoratedMAU(obj, () => obj.position.copy(val))
	}

	public static setPositionFromArray3(obj: Object3D, val: Parameters<Vector3["set"]>) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setPositionFromArray3 : ", { obj, val })
		//console.time("setPositionFromArray3")
		//if(obj.type?.includes("Camera")) { debugger }
		PropUtils.executeDecoratedMAU(obj, () => obj.position.set(val[0], val[1], val[2]))
		//console.timeEnd("setPositionFromArray3")
	}

	public static setScaleFromValue(
		obj: Object3D,
		val: Vector3 | Parameters<Vector3["set"]>,
		complex?: ComplexValueType
	): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setScaleFromValue : ", { obj, val, complex })
		switch (complex) {
			case undefined:
				PropUtils.isArray3Nums(val)
					? PropUtils.setScaleFromArray3(obj, val as Parameters<Vector3["set"]>)
					: PropUtils.isVector3(val)
					? PropUtils.setScaleFromVector3(obj, val as Vector3)
					: console.error("SVELTHREE > PropUtils > setScaleFromValue : invalid 'scale' value!", {
							obj: obj,
							value: val
					  })
				break
			case "Array3Nums":
				PropUtils.setScaleFromArray3(obj, val as Parameters<Vector3["set"]>)
				break
			case "Vector3":
				PropUtils.setScaleFromVector3(obj, val as Vector3)
				break
			default:
				console.error(
					"SVELTHREE > PropUtils > setScaleFromValue : invalid 'scale' value! No such 'ComplexValueType'!",
					{
						obj: obj,
						value: val,
						complex: complex
					}
				)
				break
		}
	}

	public static setScaleFromVector3(obj: Object3D, val: Vector3) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setScaleFromArray3 : ", { obj, val })
		PropUtils.executeDecoratedMAU(obj, () => obj.scale.copy(val as Vector3))
	}

	public static setScaleFromArray3(obj: Object3D, val: Parameters<Vector3["set"]>) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setScaleFromArray3 : ", { obj, val })
		//console.time("setScaleFromArray3")
		PropUtils.executeDecoratedMAU(obj, () => obj.scale.set(val[0], val[1], val[2]))
		//console.timeEnd("setScaleFromArray3")
	}

	public static executeDecoratedMAU(obj: Object3D, fn: () => void) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > executeDecoratedMAU!")

		/*
		.matrixAutoUpdate : Boolean
		When this is set, it calculates the matrix of position, (rotation or quaternion) and scale every frame
		and also recalculates the matrixWorld property. Default is Object3D.DefaultMatrixAutoUpdate (true).
		*/
		//PropUtils.inferMatrixAutoUpdate(obj, true)
		//if (PropUtils.log()) console.log("SVELTHREE > PropUtils > executeDecoratedMAU! AFTER INFER obj.matrixAutoUpdate:", obj.matrixAutoUpdate)

		fn()

		// we got to update matrix if 'matrixAutoUpdate' is false
		if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
		/*
		if (PropUtils.log())
			console.log(
				"SVELTHREE > PropUtils > executeDecoratedMAU! AFTER UPDATE CHECK : obj.matrixAutoUpdate:",
				obj.matrixAutoUpdate
			)
		if (PropUtils.log())
			console.log(
				"SVELTHREE > PropUtils > executeDecoratedMAU! AFTER UPDATE CHECK : obj.matrixWorldNeedsUpdate:",
				obj.matrixWorldNeedsUpdate
			)
			*/
	}

	public static updateMatrixAndWorldMatrix(obj: Object3D) {
		//obj.updateMatrix()

		// matrix will / should be updated on next scene graph update
		obj.matrixAutoUpdate = true

		// using `matrixWorldNeedsUpdate` as "needs matrix update" flag here.
		// this will skip resetting or reset `matrixAutoUpdate` inside `afterUpdate`
		// `matrixWorldNeedsUpdate` will be set to `true` anyway when auto-updating Matrix
		obj.matrixWorldNeedsUpdate = true
	}

	/* THREE  IMPORTANT 
	`lookAt` doesn't work with lights with `target` property (DirectionalLight & SpotLight).
	Here we have to manipulate the position of the `target` + before we do that, make sure it's added
	to the scene. So when manipulating these lights via `lookAt` attribute or `lookAt` in props-object:
   
		a) `target` object has no parent: add `target` to the PARENT OF THE LIGHT + set `target` position
		b) `target` object has parent: set `target` position

	CAVEATS:
	- if user sets `target` attribute or `target` prop and tries to use `lookAt` attribute or prop they'll interfere
	TEST: ... the last one updated will be applied

	*/
	public static setLookAtFromValue(obj: Object3D, val: any, complex?: ComplexValueType) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setLookAtFromValue!", { obj, val })
		//if(obj.type.includes("Camera")) debugger

		// IMPORTANT  update Matrix before setting `lookAt`--> lookAt has to be applied as last.
		// this way we apply all other transforms before lookAt-update!
		obj.updateMatrix()

		let tVal: any

		if (val) {
			// can use Object3D as `lookAt` value

			tVal =
				Object.getPrototypeOf(Object.getPrototypeOf(val)).constructor.name === "Object3D"
					? (val as Object3D).position
					: val

			// limit using manipulating `target` via `lookAt` to lights only
			if (obj["isLight"]) {
				// THREE  IMPORTANT  Only DirectionalLight and SpotLight have own `target` properties. Object3D does not.
				if (obj.hasOwnProperty("target")) {
					if (obj["target"].isObject3D) {
						if (obj.matrixAutoUpdate === false) {
							obj["target"].matrixAutoUpdate = false
						}

						if (obj["target"].parent === null) {
							// add target to parent of obj (light)
							if (obj.parent !== null) {
								// target has no parent, add target to parent of obj
								obj.parent.add(obj["target"])
								console.warn(
									`SVELTHREE > PropUtils > setLookAtFromValue : 'target' of ${obj.type} was added to the parent of ${obj.type}!`,
									{ obj, target: obj["target"] }
								)

								// set position of the target
								PropUtils.setPositionFromValue(obj["target"], tVal, complex)
							} else {
								// obj has no parent
								console.error(
									`SVELTHREE > PropUtils > setLookAtFromValue : 'target' of ${obj.type} couldn't be added to the parent of ${obj.type}! ${obj.type} has no parent!`,
									{ obj, target: obj["target"] }
								)
							}
						} else {
							// target has parent, set position of the target
							PropUtils.setPositionFromValue(obj["target"], tVal, complex)
						}
					} else {
						// target is not Object3D
						console.error(
							`SVELTHREE > PropUtils > setLookAtFromValue : 'target' has to be an 'Object3D'!`,
							{
								obj,
								target: obj["target"]
							}
						)
					}
				} else {
					console.error(
						`SVELTHREE > PropUtils > setLookAtFromValue : ${obj.type} has no 'target' property!`,
						{
							obj
						}
					)
				}
			} else {
				if (PropUtils.isArray3Nums(tVal)) {
					obj.lookAt(tVal[0], tVal[1], tVal[2])
					if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
				} else if (PropUtils.isVector3(tVal)) {
					obj.lookAt(tVal as Vector3)
					if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
				} else {
					console.error("SVELTHREE > PropUtils > setLookAtFromValue : invalid 'lookAt' value!", {
						obj: obj,
						value: tVal
					})
				}
			}
		} else {
			console.error("SVELTHREE > PropUtils > setLookAtFromValue : invalid 'lookAt' value!", {
				obj: obj,
				value: tVal
			})
		}
	}

	/*
	public static setLookAtFromValue(obj: Object3D, val: any, complex?: ComplexValueType) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setLookAtFromValue : ", { obj, val })

		PropUtils.inferMatrixAutoUpdate(obj, true)

		if (PropUtils.isVector3(val)) {
			if (obj["target"]?.parent !== null) {
				;(obj["target"] as Object3D).position.copy(val as Vector3)

				// we got to update matrix if 'matrixAutoUpdate' is false

				// obj['target'].matrixAutoUpdate is 'true' by default!
				// console.log("SVELTHREE > PropUtils > setLookAtFromValue : obj['target'].matrixAutoUpdate ", obj['target'].matrixAutoUpdate)

				//if (obj["target"].matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj["target"])
				if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
			} else {
				obj.lookAt(val as Vector3)

				// we got to update matrix if 'matrixAutoUpdate' is false
				if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
			}
		} else if (PropUtils.isArray3Nums(val)) {
			// TODO
			// DirectionalLight & SpotLight
			if (obj.hasOwnProperty("target") && obj["target"].isObject3D) {
				debugger
				//obj.lookAt(val[0], val[1], val[2])
				;(obj["target"] as Object3D).position.set(val[0], val[1], val[2])
				obj.lookAt(val[0], val[1], val[2])

				// lookAt function always updates matrix 'parents'?!
				// .updateWorldMatrix ( updateParents : Boolean, updateChildren : Boolean )
				// .updateWorldMatrix ( true, false )
				// it also tries to update matrices of all parents (scene)

				//if (obj["target"].matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj["target"])
				if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
			} else {
				obj.lookAt(val[0], val[1], val[2])

				// we got to update matrix if 'matrixAutoUpdate' is false
				if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
			}
		} else {
			console.error("SVELTHREE > PropUtils > setLookAtFromValue : invalid 'lookAt' value!", {
				obj: obj,
				value: val
			})
		}
	}
	*/

	// we know that 'obj' has property 'key', see 'Propeller'
	public static setColorFromValueKey(
		obj: Object3D | Material | Light,
		val: any,
		key: string,
		complex?: ComplexValueType
	) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setColorFromValueKey : ", { obj, val, key, complex })
		PropUtils.isArray3Nums(val)
			? PropUtils.setColorFromArray(obj, val, key)
			: !isNaN(val)
			? PropUtils.setColorFromNumber(obj, val, key)
			: PropUtils.isColor(val)
			? PropUtils.setColorFromColor(obj, val, key)
			: typeof val === "string"
			? PropUtils.setColorFromString(obj, val, key)
			: console.error(`SVELTHREE > PropUtils > setColorFromValueKey : invalid '${key}' value!`, {
					obj: obj,
					value: val
			  })
	}

	public static setColorFromArray(obj: Object3D | Material, val: [r: number, g: number, b: number], key: string) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setColorFromArray : ", { obj, val, key })
		obj[key].setRGB(val[0], val[1], val[2])
	}

	public static setColorFromNumber(obj: Object3D | Material, val: number, key: string) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setColorFromNumber : ", { obj, val, key })
		obj[key].set(val)
	}

	public static setColorFromColor(obj: Object3D | Material, val: Color, key: string) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setColorFromColor : ", { obj, val, key })
		// only copy the received Color in order to prevent circular binding to the prop
		obj[key].copy(val)
	}

	public static setColorFromString(obj: Object3D | Material, val: string, key: string) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setColorFromString : ", { obj, val, key })
		obj[key].set(val)
	}

	// Light specific

	public static setIntensity(light: Light, val: number) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setIntensity : ", { light, val })
		light.intensity = val
	}

	public static setShadowMapSize(light: LightWithShadow, shadowMapSize: number) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setShadowMapSize : ", { light, shadowMapSize })
		light.shadow.mapSize.width = shadowMapSize
		light.shadow.mapSize.height = shadowMapSize
	}

	public static setShadowBias(light: LightWithShadow, shadowBiasSize: number): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setShadowBias : ", { light, shadowBiasSize })
		light.shadow.bias = shadowBiasSize
	}

	public static setCastShadow(light: LightWithShadow, castShadow: boolean): void {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setCastShadow : ", { light, castShadow })
		light.castShadow = castShadow
	}

	public static setShadowCameraProp(light: LightWithShadow, key: string, val: any) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setShadowCameraProp : ", { light, key, val })
		light.shadow.camera[key] = val
		light.shadow.camera.updateProjectionMatrix()
	}

	public static setShadowProp(light: Light, key: string, val: any) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setShadowProp : ", { light, key, val })
		light.shadow[key] = val
		light.shadow.needsUpdate = true
	}

	/**
	 * ☝️ Expects the value (`target`) to be an instance of Empty.getEmpty() : Object3D component!
	 */
	public static setLightTarget(obj: Object3D, val: Object3D | Empty) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setLightTarget : ", { obj, val })
		if (!val) {
			console.warn(`SVELTHREE > PropUtils > setLightTarget : invalid 'target' value!`, { val })
			/*
				console.error(`SVELTHREE > PropUtils > setLightTarget : invalid '${key}' value!`, {
					obj: obj,
					value: val
				})
				*/
		} else {
			// TODO : Check why this being called twice on init! Not severe problem, but still to be checked.
			//console.warn("SVELTHREE > Propeller > setLightTarget : " + this.objTypeStr + " : target in 'props' now defined!!")

			if (val["isObject3D"]) {
				obj["target"] = val
				PropUtils.updateMatrixAndWorldMatrix(val as Object3D)
			} else if (val["isEmpty"]) {
				let obj3d: Object3D = (val as Empty).getEmpty()
				obj["target"] = obj3d
				PropUtils.updateMatrixAndWorldMatrix(obj3d)
			} else {
				console.error(`SVELTHREE > PropUtils > setLightTarget : invalid 'target' value!`, { val })
			}
		}
	}

	public static inferMatrixAutoUpdate(obj: any, defaultValue?: boolean) {
		/*
		.matrixAutoUpdate : Boolean
		When this is set, it calculates the matrix of position, (rotation or quaternion) and scale every frame
		and also recalculates the matrixWorld property. Default is Object3D.DefaultMatrixAutoUpdate (true).
		*/
		switch (obj.userData.matrixAutoUpdate) {
			case undefined:
				obj.matrixAutoUpdate = defaultValue || true // 'true' is threejs default
				break
			default:
				obj.matrixAutoUpdate = obj.userData.matrixAutoUpdate
				break
		}
	}

	/**
	 * Sets `matrix` of an object.
	 * IMPORTANT  Setting "manually" updating the `matrix` property will automatically set `matrixAutoUpdate` to `false`.
	 * Applying transformations via `position`, `rotation`, `scale` etc. will automatically set `matrixAutoUpdate` to `true` again.
	 */
	public static setMatrixFromValue(obj: Object3D, val: any, complex?: ComplexValueType) {
		// console.warn("SVELTHREE > PropUtils > obj.matrixAutoUpdate before!", obj.matrixAutoUpdate)
		// console.warn("SVELTHREE > PropUtils > setMatrixFromValue!", {obj:obj, val:val})

		if (PropUtils.isMatrix4(val)) {
			// see https://stackoverflow.com/questions/60393190/threejs-transform-by-applymatrix4-doesnt-preserve-eigen-vectors-direction
			//mesh.applyMatrix4(matrix)

			//console.warn("SVELTHREE > PropUtils > setMatrixFromValue! is Matrix4 BEFORE", {obj:obj, val:val, m: obj.matrix})

			// save initial `matrixAutoUpdate` value
			const initialMatrixAutoUpdate: boolean = obj.matrixAutoUpdate

			// force disable `matrixAutoUpdate` before matrix manipulation
			obj.matrixAutoUpdate = false

			obj.matrix.copy(val as Matrix4) // copy is faster

			// reset inital `matrixAutoUpdate` value
			obj.matrixAutoUpdate = initialMatrixAutoUpdate

			// mark for matrixWorld update (as if we did updateMatrix())
			obj.matrixWorldNeedsUpdate = true

			//console.warn("SVELTHREE > PropUtils > setMatrixFromValue! is Matrix4 AFTER", {obj:obj, val:val, m: obj.matrix})
		} else if (PropUtils.isMatrix4ParamsArray(val)) {
			// save initial `matrixAutoUpdate` value
			const initialMatrixAutoUpdate: boolean = obj.matrixAutoUpdate

			// force disable `matrixAutoUpdate` before matrix manipulation
			obj.matrixAutoUpdate = false

			obj.matrix.set(...(val as Parameters<Matrix4["set"]>)).transpose()
			// TODO  Nail updating matrix / matrixWorld

			// reset inital `matrixAutoUpdate` value
			obj.matrixAutoUpdate = initialMatrixAutoUpdate

			// mark for matrixWorld update (as if we did updateMatrix())
			obj.matrixWorldNeedsUpdate = true
		} else {
			console.error(`SVELTHREE > PropUtils > setMatrixFromValue : invalid 'matrix' value!`, {
				obj: obj,
				value: val
			})
		}

		PropUtils.inferMatrixAutoUpdate(obj, false)
		//console.warn("SVELTHREE > PropUtils > obj.matrixAutoUpdate after!", obj.matrixAutoUpdate)
		//console.warn("SVELTHREE > PropUtils > setMatrixFromValue! AFTER", { obj: obj, val: val, m: obj.matrix })
	}

	public static setQuaternionFromValue(obj: Object3D, val: any, complex?: ComplexValueType) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > setLightTarget : ", { obj, val, complex })

		PropUtils.inferMatrixAutoUpdate(obj, true)

		if (PropUtils.isQuaternion(val)) {
			// see https://threejs.org/docs/#api/en/core/Object3D.setRotationFromQuaternion

			// Copy the given quat into '.quat'.

			//obj.setRotationFromQuaternion((val as Quaternion).clone().normalize()) // doesn't work solo
			// copy the received Quaternion in order to prevent circular binding to the prop
			obj.quaternion.copy(val as Quaternion)

			// we got to update matrix if 'matrixAutoUpdate' is false
			if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
		} else {
			console.error(`SVELTHREE > PropUtils > setQuaternionFromValue : invalid 'quat' value!`, {
				obj: obj,
				value: val
			})
		}
	}

	public static applyValueToProp(obj: any, val: any, key: string, complex?: ComplexValueType) {
		if (PropUtils.log()) console.log("SVELTHREE > PropUtils > applyValueToProp : ", { obj, val, key, complex })
		// v1
		try {
			obj[key] = val
			// TODO  Nail it / write down why we don't need this.
			//if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
		} catch (error) {
			console.error(`SVELTHREE > PropUtils > applyValueToProp : failed!`, { obj: obj, value: val, key: key })
			throw new Error("SVELTHREE Exception! " + error)
		}

		//v2
		// PERFORMANCE  removing try / catch : doesn't improve much / not at all at 5000
		// obj[key] = val
	}

	public static getChangedKeys(newProps: { [key: string]: any }, prevProps: { [key: string]: any }): string[] {
		/*
		function safe_not_equal(a, b) {
				return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
		}
		*/
		// internal.safe_not_equal(value, new_value)
		//.filter((key)) ... PERFORMANCE : 0,22ms (6x slowdown)
		//return Object.keys(newProps).filter((key) => !is.equ(newProps[key], prevProps[key]))
		return Object.keys(newProps).filter((key) => not_equal(newProps[key], prevProps[key]))
	}

	/**
	 * Updates changes props, but only the ones not being handled by a specific Prop component ( PropUtils.isPropType(val) => false ).
	 */
	public static updateProps(
		keysToUpdate: string[],
		newProps: { [key: string]: any },
		updateMethod: any,
		obj: any
	): void {
		if (PropUtils.log())
			console.log("SVELTHREE > PropUtils > updateProps : ", { keysToUpdate, newProps, updateMethod, obj })
		for (let i = 0; i < keysToUpdate.length; i++) {
			const key: string = keysToUpdate[i]
			const val: any = newProps[key]

			// 👇 condition prevents double updating on complex type value recreation!
			if (!PropUtils.isPropType(val)) {
				//console.log(`SVELTHREE > PropUtils > updateProps!`, { key: key, value: val })
				updateMethod(obj, key, val)
			} else {
				/*
				console.warn(
					`SVELTHREE > PropUtils > updateProps > skipped updating "${key}" beacuse it's a complex type handled by a specific Prop component!`,
					{ key: key, value: val }
				)
				*/
			}
		}
	}
}

/**
 * Shamelessly copied from react-three-fiber 😬 thanks!✌️
 * @see https://github.com/pmndrs/react-three-fiber/blob/8eea1b53d02332e06b2cd53cefba1c3255eea800/src/renderer.tsx#L20-L40
 */
export const is = {
	obj: (a: any) => a === Object(a) && !is.arr(a),
	fun: (a: any) => typeof a === "function",
	str: (a: any) => typeof a === "string",
	num: (a: any) => typeof a === "number",
	und: (a: any) => a === void 0,
	arr: (a: any) => Array.isArray(a),
	equ(a: any, b: any) {
		// Wrong type or one of the two undefined, doesn't match
		if (typeof a !== typeof b || !!a !== !!b) return false
		// Atomic, just compare a against b
		if (is.str(a) || is.num(a) || is.obj(a)) return a === b
		// Array, shallow compare first to see if it's a match
		if (is.arr(a) && a == b) return true
		// Last resort, go through keys
		let i
		for (i in a) if (!(i in b)) return false
		for (i in b) if (a[i] !== b[i]) return false
		return is.und(i) ? a === b : true
	}
}
