import type { Light, Material, Object3D, Scene, LightShadow } from "three"
import { Color, Euler, Matrix4, Quaternion, Vector2, Vector3 } from "three"
import type { ComplexValueType, LightWithShadow, LightWithTarget } from "../types/types-extra.js"
import type {
	matrix_value,
	pos_value,
	rot_value,
	scale_value,
	lookAt_value,
	quat_value,
	color_value,
	mapsize_value,
	//background_value,
	any_proputils_value
} from "../types/types-extra.js"
import type { TargetableSvelthreeComponent, Targetable } from "../types/types-extra.js"
import { verbose_mode, log_prop_utils } from "../utils/SvelthreeLogger.js"

/**
 * Collection of static utility methods which allow setting props to various values.
 * `PropUtils` are being used by:
 * - component's props directly / on change of component's attributes (reactive)
 * - `SvelthreeProps` (`sProps`) via `Propeller`
 */
export default class PropUtils {
	private static verbose = verbose_mode()

	public static getShortHandAttrWarnings(prefix: string): { [key: string]: string } {
		const warnings = {
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

	/** Check if an Array contains exactly 2 numbers. */
	public static is2Nums(p: number[]): boolean {
		return p.length === 2 && p.every((el: number) => !isNaN(el))
	}

	public static isArray2Nums(p: number[]): boolean {
		return Array.isArray(p) && PropUtils.is2Nums(p)
	}

	public static isArray3Nums(p: number[]): boolean {
		return Array.isArray(p) && PropUtils.is3Nums(p)
	}

	/** Check if an Array contains exactly 3 numbers. */
	public static is3Nums(p: number[]): boolean {
		return p.length === 3 && p.every((el: number) => !isNaN(el))
	}

	public static isMatrix4ParamsArray(p: matrix_value): boolean {
		return Array.isArray(p) && p.length === 16 && p.every((el: number) => !isNaN(el))
	}

	/** Check if an Array contains exactly 16 numbers. */
	public static isMatrix4Params(p: number[]): boolean {
		return p.length === 16 && p.every((el: number) => !isNaN(el))
	}

	public static isEulerParamsArray(p: (number | string)[]): boolean {
		return (
			Array.isArray(p) &&
			p.length === 4 &&
			!isNaN(p[0] as number) &&
			!isNaN(p[1] as number) &&
			!isNaN(p[2] as number) &&
			typeof p[3] === "string"
		)
	}

	/** Check if an Array contains exactly three numbers and one string. */
	public static isEulerParams(p: (number | string)[]): boolean {
		return (
			p.length === 4 &&
			!isNaN(p[0] as number) &&
			!isNaN(p[1] as number) &&
			!isNaN(p[2] as number) &&
			typeof p[3] === "string"
		)
	}

	public static isQuaternionParamsArray(p: number[]): boolean {
		return Array.isArray(p) && p.length === 4 && p.every((el: number) => !isNaN(el))
	}

	/** Check if an Array contains exactly 4 numbers. */
	public static isQuaternionParams(p: number[]): boolean {
		return p.length === 4 && p.every((el: number) => !isNaN(el))
	}

	public static checkIfComplexValueType(val: any_proputils_value): ComplexValueType | undefined {
		if (Array.isArray(val)) {
			if (PropUtils.is2Nums(val as number[])) return "Array2Nums"
			if (PropUtils.is3Nums(val as number[])) return "Array3Nums"
			if (PropUtils.isEulerParams(val as (number | string)[])) return "EulerParamsArray"
			if (PropUtils.isQuaternionParams(val as number[])) return "QuaternionParamsArray"
			if (PropUtils.isMatrix4Params(val as number[])) return "Matrix4ParamsArray"
		} else if (val) {
			if ((val as Vector2).isVector2) return "Vector2"
			if ((val as Vector3).isVector3) return "Vector3"
			if ((val as Color).isColor) return "Color"
			if ((val as Euler).isEuler) return "Euler"
			if ((val as Quaternion).isQuaternion) return "Quaternion"
			if ((val as Matrix4)["isMatrix4" as keyof Matrix4]) return "Matrix4"
		}

		return undefined
	}

	public static setRotationFromValue(obj: Object3D, val: rot_value, complex?: ComplexValueType): void {
		switch (complex) {
			case undefined:
				if (val && Array.isArray(val)) {
					PropUtils.is3Nums(val as number[])
						? PropUtils.setRotArray3(obj, val as Parameters<Vector3["set"]>)
						: PropUtils.isEulerParams(val as (number | string)[])
						? PropUtils.setRotEulerArray(obj, val as Parameters<Euler["set"]>)
						: PropUtils.isQuaternionParams(val as number[])
						? PropUtils.setRotQuaternionArray(obj, val as Parameters<Quaternion["set"]>)
						: console.error(
								"SVELTHREE > [ PropUtils ] -> setRotationFromValue : invalid 'rotation' value!",
								{
									obj: obj,
									value: val
								}
						  )
				} else if (val) {
					;(val as Euler).isEuler
						? PropUtils.setRotEuler(obj, val as Euler)
						: (val as Vector3).isVector3
						? PropUtils.setRotVector3(obj, val as Vector3)
						: (val as Quaternion).isQuaternion
						? PropUtils.setRotQuaternion(obj, val as Quaternion)
						: console.error(
								"SVELTHREE > [ PropUtils ] -> setRotationFromValue : invalid 'rotation' value!",
								{
									obj: obj,
									value: val
								}
						  )
				} else {
					console.error("SVELTHREE > [ PropUtils ] -> setRotationFromValue : invalid 'rotation' value!", {
						obj: obj,
						value: val
					})
				}
				break
			case "Euler":
				PropUtils.setRotEuler(obj, val as Euler)
				break
			case "EulerParamsArray":
				PropUtils.setRotEulerArray(obj, val as Parameters<Euler["set"]>)
				break
			case "Vector3":
				PropUtils.setRotVector3(obj, val as Vector3)
				break
			case "Array3Nums":
				PropUtils.setRotArray3(obj, val as Parameters<Vector3["set"]>)
				break
			case "Quaternion":
				PropUtils.setRotQuaternion(obj, val as Quaternion)
				break
			case "QuaternionParamsArray":
				PropUtils.setRotQuaternionArray(obj, val as Parameters<Quaternion["set"]>)
				break
			default:
				console.error(
					"SVELTHREE > [ PropUtils ] -> setRotationFromValue : invalid 'rotation' value! No such 'ComplexValueType'!",
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
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setRotEuler : ", { obj, val })
		obj.setRotationFromEuler(val as Euler)
	}

	public static setRotEulerArray(obj: Object3D, val: Parameters<Euler["set"]>): void {
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setRotEulerArray : ", { obj, val })
		obj.rotation.set(val[0], val[1], val[2], val[3])
	}

	public static setRotVector3(obj: Object3D, val: Vector3): void {
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setRotVector3 : ", { obj, val })
		obj.rotation.set(val.x, val.y, val.z)
	}

	public static setRotArray3(obj: Object3D, val: Parameters<Vector3["set"]>): void {
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setRotQuaternion : ", { obj, val })
		obj.rotation.set(val[0], val[1], val[2])
	}

	public static setRotQuaternion(obj: Object3D, val: Quaternion): void {
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setRotQuaternion : ", { obj, val })
		obj.setRotationFromQuaternion(val)
	}

	public static setRotQuaternionArray(obj: Object3D, val: Parameters<Quaternion["set"]>): void {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setRotQuaternionArray : ", { obj, val })
		}
		obj.quaternion.set(val[0], val[1], val[2], val[3])
	}

	public static setPositionFromValue(obj: Object3D, val: pos_value, complex?: ComplexValueType): void {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setPositionFromValue : ", { obj, val, complex })
		}
		switch (complex) {
			case undefined:
				PropUtils.isArray3Nums(val as number[])
					? PropUtils.setPositionFromArray3(obj, val as Parameters<Vector3["set"]>)
					: (val as Vector3)?.isVector3
					? PropUtils.setPositionFromVector3(obj, val as Vector3)
					: console.error("SVELTHREE > [ PropUtils ] -> setPositionFromValue : invalid 'position' value!", {
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
					"SVELTHREE > [ PropUtils ] -> setPositionFromValue : invalid 'position' value! No such 'ComplexValueType'!",
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
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setPositionFromVector3 : ", { obj, val })
		}
		obj.position.copy(val)
	}

	public static setPositionFromArray3(obj: Object3D, val: Parameters<Vector3["set"]>) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setPositionFromArray3 : ", { obj, val })
		}
		obj.position.set(val[0], val[1], val[2])
	}

	public static setScaleFromValue(obj: Object3D, val: scale_value, complex?: ComplexValueType): void {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setScaleFromValue : ", { obj, val, complex })
		}
		switch (complex) {
			case undefined:
				if (val) {
					PropUtils.isArray3Nums(val as number[])
						? PropUtils.setScaleFromArray3(obj, val as Parameters<Vector3["set"]>)
						: (val as Vector3).isVector3
						? PropUtils.setScaleFromVector3(obj, val as Vector3)
						: !isNaN(val as number)
						? PropUtils.setScaleFromNumber(obj, val as number)
						: console.error("SVELTHREE > [ PropUtils ] -> setScaleFromValue : invalid 'scale' value!", {
								obj: obj,
								value: val
						  })
				} else {
					console.error("SVELTHREE > [ PropUtils ] -> setScaleFromValue : invalid 'scale' value!", {
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
					"SVELTHREE > [ PropUtils ] -> setScaleFromValue : invalid 'scale' value! No such 'ComplexValueType'!",
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
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setScaleFromArray3 : ", { obj, val })
		obj.scale.copy(val as Vector3)
	}

	public static setScaleFromNumber(obj: Object3D, val: number) {
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setScaleFromNumber : ", { obj, val })
		// uniform scale
		obj.scale.set(val, val, val)
	}

	public static setScaleFromArray3(obj: Object3D, val: Parameters<Vector3["set"]>) {
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setScaleFromArray3 : ", { obj, val })
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

	public static setLookAtFromValue(
		three_instance: Object3D | LightWithTarget,
		val: lookAt_value,
		complex?: ComplexValueType
	) {
		if (this.verbose && log_prop_utils(three_instance))
			console.debug("SVELTHREE > [ PropUtils ] -> setLookAtFromValue!", { three_instance, val })

		// IMPORTANT  update Matrix before setting `lookAt`--> lookAt has to be applied as last.
		// this way we apply all other transforms before lookAt-update!
		three_instance.updateMatrix()

		// target lookat position
		let t_pos: Vector3 | Parameters<Vector3["set"]> | undefined | null

		if (val) {
			// TODO  TOFIX  this seems to be broken?! (Spotlight)
			// can use Object3D as `lookAt` value

			let target_instance: Targetable | null

			// set target lookat position

			if (!(val as TargetableSvelthreeComponent).is_svelthree_component && (val as Object3D).isObject3D) {
				// val is a manually created `Object3D` instance
				target_instance = val as Object3D
				t_pos = new Vector3()
				target_instance.getWorldPosition(t_pos)
			} else if ((val as TargetableSvelthreeComponent).is_svelthree_component) {
				// val is an instance created by a svelthree component
				const target_component = val as TargetableSvelthreeComponent
				target_instance = target_component.get_instance() as Object3D
				t_pos = new Vector3()
				target_instance.getWorldPosition(t_pos)
			} else if ((val as Vector3).isVector3) {
				// val is a Vector3
				target_instance = null
				t_pos = val as Vector3
			} else if (PropUtils.isArray3Nums(val as number[])) {
				// val is [number, number, number]
				target_instance = null
				t_pos = val as Parameters<Vector3["set"]>
			} else {
				target_instance = null
				t_pos = null
			}

			if (t_pos) {
				// Use 'target':  IMPORTANT  Manipulating `target` via `lookAt` shorthand attribute is limited to `Lights` with 'target' property only (DirectionalLight | SpotLight)
				if ((three_instance as LightWithTarget).isLight) {
					const light = three_instance as LightWithTarget
					if (Object.hasOwn(light, "target")) {
						// set target to provided component / instance
						if (target_instance) {
							if (light.userData.target_uuid) {
								if (light.userData.target_uuid !== target_instance.uuid) {
									light.target = target_instance
									light.userData.target_uuid = target_instance.uuid
									light.target.updateMatrixWorld()
								} else {
									light.target.updateMatrixWorld()
								}
							} else {
								light.target = target_instance
								light.userData.target_uuid = target_instance.uuid
								light.target.updateMatrixWorld()
							}
						} else {
							// set target to built-in target (Object3D)
							light.target = light.userData.builtin_target
							light.userData.target_uuid = light.target.uuid

							// change position of built-in target (Object3D)
							const light_target = light.target as Object3D

							if (light_target) {
								if (light_target.isObject3D) {
									if (light.matrixAutoUpdate === false) {
										light_target.matrixAutoUpdate = false
									}

									// add target to light's parent if needed
									if (light.target.parent === null) {
										const light_parent = light.parent
										if (light_parent !== null) {
											// target has no parent, add target to parent of obj
											light_parent.add(light_target)
											if (this.verbose) {
												console.warn(
													`SVELTHREE > [ PropUtils ] -> setLookAtFromValue : 'target' of ${light.type} was added to the parent of ${light.type}!`,
													{ light, target: light_target }
												)
											}
										} else {
											console.error(
												`SVELTHREE > [ PropUtils ] -> setLookAtFromValue : Cannot add 'target' to the unavilable 'parent' of ${light.type}!`,
												{ light, parent: light_parent }
											)
										}
									} else {
										// nothing, 'target' was already added to light's parent
									}

									// set position of the target
									PropUtils.setPositionFromValue(light_target, t_pos, complex)
									// IMPORTANT  We have to update 'matrixWorld' of 'target' here (at least with render modes 'auto'), regardles of 'obj_target.matrixAutoUpdate' value!
									// 'SpotlightHelper' and 'DirectionalLightHelper' use 'lookAt' to 'light.target.matrixWorld' for orientation.
									if (light.matrixAutoUpdate === false) {
										light_target.updateMatrix()
										light_target.updateMatrixWorld()
									} else {
										light_target.updateMatrixWorld()
									}
								} else {
									console.error(
										`SVELTHREE > [ PropUtils ] -> setLookAtFromValue : ${light.type}'s 'target' has to be an 'Object3D'!`,
										{
											light,
											target: light_target
										}
									)
								}
							} else {
								console.error(
									`SVELTHREE > [ PropUtils ] -> setLookAtFromValue : invalid '${light.type}.target' value!`,
									{
										light,
										target: light_target
									}
								)
							}
						}
					} else {
						console.error(
							`SVELTHREE > [ PropUtils ] -> setLookAtFromValue : ${light.type} has no 'target' property!`,
							{
								light
							}
						)
					}
				} else {
					// Use `Object3D.lookAt` function (not 'target') on any `Object3D`
					if (PropUtils.isArray3Nums(t_pos as number[])) {
						// TODO  Type wrong in  THREE  -> Object3D.d.ts
						three_instance.lookAt(
							(t_pos as [number, number, number])[0],
							(t_pos as [number, number, number])[1],
							(t_pos as [number, number, number])[2]
						)
					} else if ((t_pos as Vector3).isVector3) {
						three_instance.lookAt(t_pos as Vector3)
					} else {
						console.error("SVELTHREE > [ PropUtils ] -> setLookAtFromValue : invalid 'lookAt' value!", {
							three_instance,
							value: t_pos
						})
					}
				}
			} else {
				console.error(
					"SVELTHREE > [ PropUtils ] -> setLookAtFromValue : invalid 'lookAt' target-position value!",
					{
						three_instance,
						value: t_pos
					}
				)
			}
		} else {
			console.error("SVELTHREE > [ PropUtils ] -> setLookAtFromValue : invalid 'lookAt' value!", {
				three_instance,
				value: val
			})
		}
	}

	// we know that 'obj' has property 'key', see 'Propeller'
	public static setColorFromValueKey(
		obj: Material | Light | Scene,
		val: color_value,
		key: string,
		complex?: ComplexValueType
	) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setColorFromValueKey : ", { obj, val, key, complex })
		}
		// color value can be `0`
		if (val || val === 0) {
			PropUtils.isArray3Nums(val as number[])
				? PropUtils.setColorFromArray(obj, val as [r: number, g: number, b: number], key)
				: !isNaN(val as number)
				? PropUtils.setColorFromNumber(obj, val as number, key)
				: (val as Color).isColor
				? PropUtils.setColorFromColor(obj, val as Color, key)
				: (val as Vector3).isVector3
				? PropUtils.setColorFromVector3(obj, val as Vector3, key)
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

	// TODO  handle background as `Texture`
	/*
	public static setBackgroundAsTextureFromValueKey() {
		// TODO 
	}
	*/

	public static setColorFromArray(
		obj: Material | Light | Scene,
		val: [r: number, g: number, b: number],
		key: string
	) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setColorFromArray : ", { obj, val, key })
		}
		if (obj[key as keyof typeof obj] === null || obj[key as keyof typeof obj] === undefined) {
			;(obj[key as keyof typeof obj] as Color) = new Color(val[0], val[1], val[2])
		} else {
			obj[key as keyof typeof obj].setRGB(val[0], val[1], val[2])
		}
	}

	public static setColorFromNumber(obj: Material | Light | Scene | Material, val: number, key: string) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setColorFromNumber : ", { obj, val, key })
		}
		if (obj[key as keyof typeof obj] === null || obj[key as keyof typeof obj] === undefined) {
			;(obj[key as keyof typeof obj] as Color) = new Color(val)
		} else {
			obj[key as keyof typeof obj].set(val)
		}
	}

	public static setColorFromColor(obj: Material | Light | Scene, val: Color, key: string) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setColorFromColor : ", { obj, val, key })
		}
		if (obj[key as keyof typeof obj] === null || obj[key as keyof typeof obj] === undefined) {
			;(obj[key as keyof typeof obj] as Color) = new Color()
			obj[key as keyof typeof obj].copy(val)
		} else {
			obj[key as keyof typeof obj].copy(val)
		}
	}

	public static setColorFromVector3(obj: Material | Light | Scene | Material, val: Vector3, key: string) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setColorFromVector3 : ", { obj, val, key })
		}

		if (obj[key as keyof typeof obj] === null || obj[key as keyof typeof obj] === undefined) {
			;(obj[key as keyof typeof obj] as Color) = new Color(val.x, val.y, val.z)
		} else {
			obj[key as keyof typeof obj].setRGB(val.x, val.y, val.z)
		}
	}

	public static setColorFromString(obj: Material | Light | Scene | Material, val: string, key: string) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setColorFromString : ", { obj, val, key })
		}

		if (obj[key as keyof typeof obj] === null || obj[key as keyof typeof obj] === undefined) {
			;(obj[key as keyof typeof obj] as Color) = new Color(val)
		} else {
			obj[key as keyof typeof obj].set(val)
		}
	}

	// Light specific

	public static setIntensity(light: Light, val: number) {
		if (this.verbose && log_prop_utils(light))
			console.debug("SVELTHREE > [ PropUtils ] -> setIntensity : ", { light, val })
		light.intensity = val
	}

	public static setShadowMapSizeFromValue(obj: LightShadow, val: mapsize_value, complex?: ComplexValueType): void {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setPositionFromValue : ", { obj, val, complex })
		}
		switch (complex) {
			case undefined:
				PropUtils.isArray2Nums(val as number[])
					? PropUtils.setMapSizeFromArray2(obj, val as Parameters<Vector2["set"]>)
					: val?.["isVector2" as keyof typeof val]
					? PropUtils.setMapSizeFromVector2(obj, val as Vector2)
					: console.error("SVELTHREE > [ PropUtils ] -> setPositionFromValue : invalid 'position' value!", {
							obj: obj,
							value: val
					  })
				break
			case "Array2Nums":
				PropUtils.setMapSizeFromArray2(obj, val as Parameters<Vector2["set"]>)
				break
			case "Vector2":
				PropUtils.setMapSizeFromVector2(obj, val as Vector2)
				break
			default:
				console.error(
					"SVELTHREE > [ PropUtils ] -> setShadowMapSizeFromValue : invalid 'mapSize' value! No such 'ComplexValueType'!",
					{
						obj: obj,
						value: val,
						complex: complex
					}
				)
				break
		}
	}

	public static setMapSizeFromVector2(obj: LightShadow, val: Vector2) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setMapSizeFromVector2 : ", { obj, val })
		}
		obj.mapSize.copy(val)
	}

	public static setMapSizeFromArray2(obj: LightShadow, val: Parameters<Vector2["set"]>) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setMapSizeFromArray3 : ", { obj, val })
		}
		obj.mapSize.set(val[0], val[1])
	}

	public static setShadowMapSize(light: LightWithShadow | undefined | null, shadowMapSize: number) {
		if (this.verbose && log_prop_utils(light)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setShadowMapSize : ", { light, shadowMapSize })
		}
		if (light) {
			light.shadow.mapSize.width = shadowMapSize
			light.shadow.mapSize.height = shadowMapSize
		}
	}

	public static setShadowBias(light: LightWithShadow | undefined | null, shadowBiasSize: number): void {
		if (this.verbose && log_prop_utils(light)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setShadowBias : ", { light, shadowBiasSize })
		}
		if (light) {
			light.shadow.bias = shadowBiasSize
		}
	}

	public static setCastShadow(light: LightWithShadow | undefined | null, castShadow: boolean): void {
		if (this.verbose && log_prop_utils(light)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setCastShadow : ", { light, castShadow })
		}
		if (light) {
			light.castShadow = castShadow
		}
	}

	/**
	 * Sets `matrix` of an object.
	 * IMPORTANT  Setting "manually" updating the `matrix` property will automatically set `matrixAutoUpdate` to `false`.
	 * Applying transformations via `position`, `rotation`, `scale` etc. will automatically set `matrixAutoUpdate` to `true` again.
	 */
	public static setMatrixFromValue(obj: Object3D, val: matrix_value) {
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> obj.matrixAutoUpdate before! : ", obj.matrixAutoUpdate)
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setMatrixFromValue! : ", { obj, val })
		if (val) {
			if ((val as Matrix4)["isMatrix4" as keyof Matrix4]) {
				// see https://stackoverflow.com/questions/60393190/threejs-transform-by-applymatrix4-doesnt-preserve-eigen-vectors-direction
				//mesh.applyMatrix4(matrix)

				if (this.verbose && log_prop_utils(obj))
					console.debug("SVELTHREE > [ PropUtils ] -> setMatrixFromValue! is Matrix4 BEFORE : ", {
						obj,
						val,
						m: obj.matrix
					})

				// save initial `matrixAutoUpdate` value
				const initialMatrixAutoUpdate: boolean = obj.matrixAutoUpdate

				// force disable `matrixAutoUpdate` before matrix manipulation
				obj.matrixAutoUpdate = false

				obj.matrix.copy(val as Matrix4) // copy is faster

				// reset inital `matrixAutoUpdate` value
				obj.matrixAutoUpdate = initialMatrixAutoUpdate

				// mark for matrixWorld update (as updateMatrix() normally would)
				obj.matrixWorldNeedsUpdate = true

				if (this.verbose && log_prop_utils(obj))
					console.debug("SVELTHREE > [ PropUtils ] -> setMatrixFromValue! is Matrix4 AFTER : ", {
						obj,
						val,
						m: obj.matrix
					})
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
		}

		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> obj.matrixAutoUpdate after! : ", obj.matrixAutoUpdate)
		if (this.verbose && log_prop_utils(obj))
			console.debug("SVELTHREE > [ PropUtils ] -> setMatrixFromValue! AFTER : ", { obj, val, m: obj.matrix })
	}

	public static setQuaternionFromValue(obj: Object3D, val: quat_value, complex?: ComplexValueType) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> setQuaternionFromValue : ", { obj, val, complex })
		}

		if (val && (val as Quaternion).isQuaternion) {
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public static applyValueToProp(obj: any, value: unknown, key: string, complex?: ComplexValueType) {
		if (this.verbose && log_prop_utils(obj)) {
			console.debug("SVELTHREE > [ PropUtils ] -> applyValueToProp : ", { obj, value, key, complex })
		}
		try {
			if (Object.hasOwn(obj, key)) {
				obj[key] = value
			}
		} catch (err) {
			console.error(`[ PropUtils ] -> applyValueToProp : failed!`, err, { obj, value, key })
		}
	}
}
