/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { Light, Material, Object3D, Scene } from "three"
import { Color, Euler, Matrix4, Quaternion, Vector3 } from "three"
import type { ComplexValueType, LightWithShadow } from "../types/types-extra"
import type { Targetable, TargetableSvelthreeComponent } from "../types/types-extra"
import { verbose_mode, log_prop_utils } from "../utils/SvelthreeLogger"

/**
 * Collection of static utility methods which allow setting props to various values.
 * `PropUtils` are being used by:
 * - component's props directly / on change of component's attributes (reactive)
 * - `SvelthreeProps` (`sProps`) via `Propeller`
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

	public static isArray3Nums(p: any): boolean {
		return Array.isArray(p) && p.length === 3 && p.every((el: any) => !isNaN(el))
	}

	/** Check if an Array contains exactly 3 numbers. */
	public static is3Nums(p: any): boolean {
		return p.length === 3 && p.every((el: any) => !isNaN(el))
	}

	public static isMatrix4ParamsArray(p: any): boolean {
		return Array.isArray(p) && p.length === 16 && p.every((el: any) => !isNaN(el))
	}

	/** Check if an Array contains exactly 16 numbers. */
	public static isMatrix4Params(p: any): boolean {
		return p.length === 16 && p.every((el: any) => !isNaN(el))
	}

	public static isEulerParamsArray(p: any): boolean {
		return (
			Array.isArray(p) &&
			p.length === 4 &&
			!isNaN(p[0]) &&
			!isNaN(p[1]) &&
			!isNaN(p[2]) &&
			typeof p[3] === "string"
		)
	}

	/** Check if an Array contains exactly three numbers and one string. */
	public static isEulerParams(p: any): boolean {
		return p.length === 4 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2]) && typeof p[3] === "string"
	}

	public static isQuaternionParamsArray(p: any): boolean {
		return Array.isArray(p) && p.length === 4 && p.every((el: any) => !isNaN(el))
	}

	/** Check if an Array contains exactly 4 numbers. */
	public static isQuaternionParams(p: any): boolean {
		return p.length === 4 && p.every((el: any) => !isNaN(el))
	}

	public static checkIfComplexValueType(val: any): ComplexValueType | undefined {
		if (Array.isArray(val)) {
			if (PropUtils.is3Nums(val)) return "Array3Nums"
			if (PropUtils.isEulerParams(val)) return "EulerParamsArray"
			if (PropUtils.isQuaternionParams(val)) return "QuaternionParamsArray"
			if (PropUtils.isMatrix4Params(val)) return "Matrix4ParamsArray"
		} else if (val) {
			if (val.isVector3) return "Vector3"
			if (val.isColor) return "Color"
			if (val.isEuler) return "Euler"
			if (val.isQuaternion) return "Quaternion"
			if (val.isMatrix4) return "Matrix4"
		}

		return undefined
	}

	public static setRotationFromValue(obj: Object3D, val: any, complex?: ComplexValueType): void {
		switch (complex) {
			case undefined:
				if (Array.isArray(val)) {
					PropUtils.is3Nums(val)
						? PropUtils.setRotArray3(obj, val as Parameters<Vector3["set"]>)
						: PropUtils.isEulerParams(val)
						? PropUtils.setRotEulerArray(obj, val as Parameters<Euler["set"]>)
						: PropUtils.isQuaternionParams(val)
						? PropUtils.setRotQuaternionArray(obj, val as Parameters<Quaternion["set"]>)
						: console.error("[ PropUtils ] -> setRotationFromValue : invalid 'rotation' value!", {
								obj: obj,
								value: val
						  })
				} else if (val) {
					val.isEuler
						? PropUtils.setRotEuler(obj, val)
						: val.isVector3
						? PropUtils.setRotVector3(obj, val)
						: val.isQuaternion
						? PropUtils.setRotQuaternion(obj, val)
						: console.error("[ PropUtils ] -> setRotationFromValue : invalid 'rotation' value!", {
								obj: obj,
								value: val
						  })
				} else {
					console.error("[ PropUtils ] -> setRotationFromValue : invalid 'rotation' value!", {
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
					"[ PropUtils ] -> setRotationFromValue : invalid 'rotation' value! No such 'ComplexValueType'!",
					{
						obj: obj,
						value: val,
						complex: complex
					}
				)
				break
		}
	}

	public static setRotEuler(obj: Object3D, val: Euler): void {
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setRotEuler : ", { obj, val })
		obj.setRotationFromEuler(val as Euler)
	}

	public static setRotEulerArray(obj: Object3D, val: Parameters<Euler["set"]>): void {
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setRotEulerArray : ", { obj, val })
		obj.rotation.set(val[0], val[1], val[2], val[3])
	}

	public static setRotVector3(obj: Object3D, val: Vector3): void {
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setRotVector3 : ", { obj, val })
		obj.rotation.set(val.x, val.y, val.z)
	}

	public static setRotArray3(obj: Object3D, val: Parameters<Vector3["set"]>): void {
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setRotQuaternion : ", { obj, val })
		obj.rotation.set(val[0], val[1], val[2])
	}

	public static setRotQuaternion(obj: Object3D, val: Quaternion): void {
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setRotQuaternion : ", { obj, val })
		obj.setRotationFromQuaternion(val)
	}

	public static setRotQuaternionArray(obj: Object3D, val: Parameters<Quaternion["set"]>): void {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setRotQuaternionArray : ", { obj, val })
		}
		obj.quaternion.set(val[0], val[1], val[2], val[3])
	}

	public static setPositionFromValue(
		obj: Object3D,
		val: Vector3 | Parameters<Vector3["set"]>,
		complex?: ComplexValueType
	): any {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setPositionFromValue : ", { obj, val, complex })
		}
		switch (complex) {
			case undefined:
				PropUtils.isArray3Nums(val)
					? PropUtils.setPositionFromArray3(obj, val as Parameters<Vector3["set"]>)
					: val?.["isVector3"]
					? PropUtils.setPositionFromVector3(obj, val as Vector3)
					: console.error("[ PropUtils ] -> setPositionFromValue : invalid 'position' value!", {
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
					"[ PropUtils ] -> setPositionFromValue : invalid 'position' value! No such 'ComplexValueType'!",
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
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setPositionFromVector3 : ", { obj, val })
		}
		obj.position.copy(val)
	}

	public static setPositionFromArray3(obj: Object3D, val: Parameters<Vector3["set"]>) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setPositionFromArray3 : ", { obj, val })
		}
		obj.position.set(val[0], val[1], val[2])
	}

	public static setScaleFromValue(
		obj: Object3D,
		val: Vector3 | Parameters<Vector3["set"]>,
		complex?: ComplexValueType
	): void {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setScaleFromValue : ", { obj, val, complex })
		}
		switch (complex) {
			case undefined:
				if (val) {
					PropUtils.isArray3Nums(val)
						? PropUtils.setScaleFromArray3(obj, val as Parameters<Vector3["set"]>)
						: val["isVector3"]
						? PropUtils.setScaleFromVector3(obj, val as Vector3)
						: console.error("[ PropUtils ] -> setScaleFromValue : invalid 'scale' value!", {
								obj: obj,
								value: val
						  })
				} else {
					console.error("[ PropUtils ] -> setScaleFromValue : invalid 'scale' value!", {
						obj: obj,
						value: val
					})
				}

				break
			case "Array3Nums":
				PropUtils.setScaleFromArray3(obj, val as Parameters<Vector3["set"]>)
				break
			case "Vector3":
				PropUtils.setScaleFromVector3(obj, val as Vector3)
				break
			default:
				console.error(
					"[ PropUtils ] -> setScaleFromValue : invalid 'scale' value! No such 'ComplexValueType'!",
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
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setScaleFromArray3 : ", { obj, val })
		obj.scale.copy(val as Vector3)
	}

	public static setScaleFromArray3(obj: Object3D, val: Parameters<Vector3["set"]>) {
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setScaleFromArray3 : ", { obj, val })
		obj.scale.set(val[0], val[1], val[2])
	}

	/* THREE  IMPORTANT 
	// TODO  NAIL IT DOWN!
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
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setLookAtFromValue!", { obj, val })

		// IMPORTANT  update Matrix before setting `lookAt`--> lookAt has to be applied as last.
		// this way we apply all other transforms before lookAt-update!
		obj.updateMatrix()

		let tVal: any

		if (val) {
			// TODO  TOFIX  this seems to be broken?! (Spotlight)
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
									`[ PropUtils ] -> setLookAtFromValue : 'target' of ${obj.type} was added to the parent of ${obj.type}!`,
									{ obj, target: obj["target"] }
								)

								// set position of the target
								PropUtils.setPositionFromValue(obj["target"], tVal, complex)
							} else {
								// obj has no parent
								console.error(
									`[ PropUtils ] -> setLookAtFromValue : 'target' of ${obj.type} couldn't be added to the parent of ${obj.type}! ${obj.type} has no parent!`,
									{ obj, target: obj["target"] }
								)
							}
						} else {
							// target has parent, set position of the target
							PropUtils.setPositionFromValue(obj["target"], tVal, complex)
						}
					} else {
						// target is not Object3D
						console.error(`[ PropUtils ] -> setLookAtFromValue : 'target' has to be an 'Object3D'!`, {
							obj,
							target: obj["target"]
						})
					}
				} else {
					console.error(`[ PropUtils ] -> setLookAtFromValue : ${obj.type} has no 'target' property!`, {
						obj
					})
				}
			} else {
				if (tVal) {
					if (PropUtils.isArray3Nums(tVal)) {
						obj.lookAt(tVal[0], tVal[1], tVal[2])
					} else if (tVal?.isVector3) {
						obj.lookAt(tVal as Vector3)
					} else {
						console.error("[ PropUtils ] -> setLookAtFromValue : invalid 'lookAt' value!", {
							obj: obj,
							value: tVal
						})
					}
				} else {
					console.error("[ PropUtils ] -> setLookAtFromValue : invalid 'lookAt' value!", {
						obj: obj,
						value: tVal
					})
				}
			}
		} else {
			console.error("[ PropUtils ] -> setLookAtFromValue : invalid 'lookAt' value!", {
				obj: obj,
				value: tVal
			})
		}
	}

	// we know that 'obj' has property 'key', see 'Propeller'
	public static setColorFromValueKey(
		obj: Object3D | Material | Light | Scene,
		val: any,
		key: string,
		complex?: ComplexValueType
	) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setColorFromValueKey : ", { obj, val, key, complex })
		}
		// color value can be `0`
		if (val || val === 0) {
			PropUtils.isArray3Nums(val)
				? PropUtils.setColorFromArray(obj, val, key)
				: !isNaN(val)
				? PropUtils.setColorFromNumber(obj, val, key)
				: val.isColor
				? PropUtils.setColorFromColor(obj, val, key)
				: val.isVector3
				? PropUtils.setColorFromVector3(obj, val, key)
				: typeof val === "string"
				? PropUtils.setColorFromString(obj, val, key)
				: console.error(`[ PropUtils ] -> setColorFromValueKey : invalid '${key}' value!`, {
						obj: obj,
						value: val
				  })
		} else {
			console.error(`[ PropUtils ] -> setColorFromValueKey : invalid '${key}' value!`, {
				obj: obj,
				value: val
			})
		}
	}

	public static setColorFromArray(obj: Object3D | Material, val: [r: number, g: number, b: number], key: string) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setColorFromArray : ", { obj, val, key })
		}
		!obj[key] ? (obj[key] = new Color(val[0], val[1], val[2])) : obj[key].setRGB(val[0], val[1], val[2])
	}

	public static setColorFromNumber(obj: Object3D | Material, val: number, key: string) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setColorFromNumber : ", { obj, val, key })
		}
		!obj[key] ? (obj[key] = new Color(val)) : obj[key].set(val)
	}

	public static setColorFromColor(obj: Object3D | Material, val: Color, key: string) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setColorFromColor : ", { obj, val, key })
		}
		if (!obj[key]) {
			// only copy the received Color in order to prevent circular binding to the prop
			obj[key] = new Color()
			obj[key].copy(val)
		} else {
			// only copy the received Color in order to prevent circular binding to the prop
			obj[key].copy(val)
		}
	}

	public static setColorFromVector3(obj: Object3D | Material, val: Vector3, key: string) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setColorFromVector3 : ", { obj, val, key })
		}
		!obj[key] ? (obj[key] = new Color(val.x, val.y, val.z)) : obj[key].setRGB(val.x, val.y, val.z)
	}

	public static setColorFromString(obj: Object3D | Material, val: string, key: string) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setColorFromString : ", { obj, val, key })
		}
		!obj[key] ? (obj[key] = new Color(val)) : obj[key].set(val)
	}

	// Light specific

	public static setIntensity(light: Light, val: number) {
		if (verbose_mode() && log_prop_utils(light)) console.debug("[ PropUtils ] -> setIntensity : ", { light, val })
		light.intensity = val
	}

	public static setShadowMapSize(light: LightWithShadow, shadowMapSize: number) {
		if (verbose_mode() && log_prop_utils(light)) {
			console.debug("[ PropUtils ] -> setShadowMapSize : ", { light, shadowMapSize })
		}
		light.shadow.mapSize.width = shadowMapSize
		light.shadow.mapSize.height = shadowMapSize
	}

	public static setShadowBias(light: LightWithShadow, shadowBiasSize: number): void {
		if (verbose_mode() && log_prop_utils(light)) {
			console.debug("[ PropUtils ] -> setShadowBias : ", { light, shadowBiasSize })
		}
		light.shadow.bias = shadowBiasSize
	}

	public static setCastShadow(light: LightWithShadow, castShadow: boolean): void {
		if (verbose_mode() && log_prop_utils(light)) {
			console.debug("[ PropUtils ] -> setCastShadow : ", { light, castShadow })
		}
		light.castShadow = castShadow
	}

	public static setShadowCameraProp(light: LightWithShadow, key: string, val: any) {
		if (verbose_mode() && log_prop_utils(light)) {
			console.debug("[ PropUtils ] -> setShadowCameraProp : ", { light, key, val })
		}
		light.shadow.camera[key] = val
		light.shadow.camera.updateProjectionMatrix()
	}

	public static setShadowProp(light: Light, key: string, val: any) {
		if (verbose_mode() && log_prop_utils(light)) {
			console.debug("[ PropUtils ] -> setShadowProp : ", { light, key, val })
		}
		light.shadow[key] = val
		light.shadow.needsUpdate = true
	}

	/**
	 * TODO : test / polish this!
	 */
	public static setLightTarget(obj: Object3D, val: Targetable) {
		if (verbose_mode() && log_prop_utils(obj)) console.debug("[ PropUtils ] -> setLightTarget : ", { obj, val })
		if (!val) {
			console.warn(`[ PropUtils ] -> setLightTarget : invalid 'target' value!`, { val })
		} else {
			// TODO : Check why this being called twice on init! Not severe problem, but still to be checked.
			//console.warn("SVELTHREE > Propeller > setLightTarget : " + this.objTypeStr + " : target in 'props' now defined!!")

			if (val["isObject3D"]) {
				obj["target"] = val
			} else if (val["is_svelthree_component"]) {
				let obj3d: Object3D = (val as TargetableSvelthreeComponent).get_instance()
				obj["target"] = obj3d
			} else {
				console.error(`[ PropUtils ] -> setLightTarget : invalid 'target' value!`, { val })
			}
		}
	}

	/**
	 * Sets `matrix` of an object.
	 * IMPORTANT  Setting "manually" updating the `matrix` property will automatically set `matrixAutoUpdate` to `false`.
	 * Applying transformations via `position`, `rotation`, `scale` etc. will automatically set `matrixAutoUpdate` to `true` again.
	 */
	public static setMatrixFromValue(obj: Object3D, val: any) {
		if (verbose_mode() && log_prop_utils(obj))
			console.debug("[ PropUtils ] -> obj.matrixAutoUpdate before! : ", obj.matrixAutoUpdate)
		if (verbose_mode() && log_prop_utils(obj))
			console.debug("[ PropUtils ] -> setMatrixFromValue! : ", { obj, val })

		if (val?.isMatrix4) {
			// see https://stackoverflow.com/questions/60393190/threejs-transform-by-applymatrix4-doesnt-preserve-eigen-vectors-direction
			//mesh.applyMatrix4(matrix)

			if (verbose_mode() && log_prop_utils(obj))
				console.debug("[ PropUtils ] -> setMatrixFromValue! is Matrix4 BEFORE : ", { obj, val, m: obj.matrix })

			// save initial `matrixAutoUpdate` value
			const initialMatrixAutoUpdate: boolean = obj.matrixAutoUpdate

			// force disable `matrixAutoUpdate` before matrix manipulation
			obj.matrixAutoUpdate = false

			obj.matrix.copy(val as Matrix4) // copy is faster

			// reset inital `matrixAutoUpdate` value
			obj.matrixAutoUpdate = initialMatrixAutoUpdate

			// mark for matrixWorld update (as updateMatrix() normally would)
			obj.matrixWorldNeedsUpdate = true

			if (verbose_mode() && log_prop_utils(obj))
				console.debug("[ PropUtils ] -> setMatrixFromValue! is Matrix4 AFTER : ", { obj, val, m: obj.matrix })
		} else if (PropUtils.isMatrix4ParamsArray(val)) {
			// save initial `matrixAutoUpdate` value
			const initialMatrixAutoUpdate: boolean = obj.matrixAutoUpdate

			// force disable `matrixAutoUpdate` before matrix manipulation
			obj.matrixAutoUpdate = false

			obj.matrix.set(...(val as Parameters<Matrix4["set"]>)).transpose()
			// TODO  Nail down updating matrix / matrixWorld

			// reset inital `matrixAutoUpdate` value
			obj.matrixAutoUpdate = initialMatrixAutoUpdate

			// mark for matrixWorld update (as updateMatrix() normally would)
			obj.matrixWorldNeedsUpdate = true
		} else {
			console.error(`[ PropUtils ] -> setMatrixFromValue : invalid 'matrix' value!`, {
				obj: obj,
				value: val
			})
		}

		if (verbose_mode() && log_prop_utils(obj))
			console.debug("[ PropUtils ] -> obj.matrixAutoUpdate after! : ", obj.matrixAutoUpdate)
		if (verbose_mode() && log_prop_utils(obj))
			console.debug("[ PropUtils ] -> setMatrixFromValue! AFTER : ", { obj, val, m: obj.matrix })
	}

	public static setQuaternionFromValue(obj: Object3D, val: any, complex?: ComplexValueType) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> setLightTarget : ", { obj, val, complex })
		}

		if (val?.isQuaternion) {
			// see https://threejs.org/docs/#api/en/core/Object3D.setRotationFromQuaternion

			// Copy the given quat into '.quat'.

			//obj.setRotationFromQuaternion((val as Quaternion).clone().normalize()) // doesn't work solo
			// copy the received Quaternion in order to prevent circular binding to the prop
			obj.quaternion.copy(val as Quaternion)

			// we got to update matrix if 'matrixAutoUpdate' is false
			//if (obj.matrixAutoUpdate === false) PropUtils.updateMatrixAndWorldMatrix(obj)
		} else {
			console.error(`[ PropUtils ] -> setQuaternionFromValue : invalid 'quat' value!`, {
				obj: obj,
				value: val
			})
		}
	}

	/** Simply set property `a` to value `x` -> no special method was assigned to the prop via `Propeller`. */
	public static applyValueToProp(obj: any, val: any, key: string, complex?: ComplexValueType) {
		if (verbose_mode() && log_prop_utils(obj)) {
			console.debug("[ PropUtils ] -> applyValueToProp : ", { obj, val, key, complex })
		}
		try {
			obj[key] = val
		} catch (error) {
			console.error(`[ PropUtils ] -> applyValueToProp : failed!`, { obj: obj, value: val, key: key })
		}
	}
}
