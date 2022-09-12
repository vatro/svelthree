/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { WebGLCubeRenderTarget } from "three"
import PropUtils from "./PropUtils"
import type { ComplexValueType } from "../types/types-extra"

/** ⚙️ `Propeller`'s `update` method redirects some `props` object properties to specific `PropUtils` update
 * methods and also allows special handling if needed when updating a specific `props` object's property.
 * It's used internally by `SvelthreeProps` (+`valuators`). */
export default class Propeller {
	/** Used internally by `SvelthreeProps` (+`valuators`) -> redirects some `props` object properties to specific `PropUtils` update methods and also
	 * allows special handling if needed when updating a specific `props` object's property. */
	public static update(
		obj: any,
		obj_type: string,
		key: string,
		value: any,
		origin: string | null,
		complex?: ComplexValueType
	): void {
		// handle own properties (as opposed to inherited ones)
		if (origin === "own") {
			switch (key) {
				case "position":
					PropUtils.setPositionFromValue(obj, value, complex)
					break
				case "rotation":
					PropUtils.setRotationFromValue(obj, value, complex)
					break
				case "scale":
					PropUtils.setScaleFromValue(obj, value, complex)
					break
				case "quaternion":
					PropUtils.setQuaternionFromValue(obj, value, complex)
					break
				case "matrix":
					PropUtils.setMatrixFromValue(obj, value)
					break
				case "color":
				case "groundColor":
				case "background":
					PropUtils.setColorFromValueKey(obj, value, key, complex)
					break
				case "target":
					if (obj_type === "DirectionalLight" || obj_type === "SpotLight") {
						PropUtils.setLightTarget(obj, value)
					}
					break

				default:
					// wildcard updating of **own** properties
					PropUtils.applyValueToProp(obj, value, key)
					break
			}
			// handle inherited properties
		} else if (origin === "inherited") {
			switch (key) {
				case "lookAt":
					PropUtils.setLookAtFromValue(obj, value, complex)
					break
				default:
					// update `CubeCamera`'s `renderTargetProps` prop (`CubeTexture`)
					if (obj_type === "WebGLCubeRenderTarget") {
						const cubeRenderTarget = obj as WebGLCubeRenderTarget
						PropUtils.applyValueToProp(cubeRenderTarget.texture, value, key)
					} else {
						// no wildcard updating of **inherited** properties  via `Proppeller` -> show error in the console.
						//PropUtils.applyValueToProp(obj, value, key)
						console.error(`SVELTHREE > Propeller > ${obj_type} : updating '${key}' is not implemented!`, {
							key: key,
							value: value
						})
					}
					break
			}
		} else {
			// shouldn't happen
			console.error(`SVELTHREE > Propeller > update : 'origin' value is not valid!`, { origin })
		}
	}
}
