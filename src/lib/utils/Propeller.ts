import type { WebGLCubeRenderTarget, Object3D, Material, Light, Scene, LightShadow } from "three"
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
	any_propeller_value
} from "../types/types-extra.js"
import PropUtils from "./PropUtils.js"
import type { ComplexValueType, SvelthreePropsOwner, LightWithTarget } from "../types/types-extra.js"

/** ⚙️ `Propeller`'s `update` method redirects some `props` object properties to specific `PropUtils` update
 * methods and also allows special handling if needed when updating a specific `props` object's property.
 * It's used **only** internally by `SvelthreeProps` (+`valuators`) **only**. */
export default class Propeller {
	/** Used internally by `SvelthreeProps` (+`valuators`) -> redirects some `props` object properties to specific `PropUtils` update methods and also
	 * allows special handling if needed when updating a specific `props` object's property. */
	public static update(
		obj: SvelthreePropsOwner,
		obj_type: string,
		key: string,
		value: any_propeller_value,
		origin: string | null,
		complex?: ComplexValueType
	): void {
		// handle own properties (as opposed to inherited ones)
		if (origin === "own") {
			switch (key) {
				case "position":
					PropUtils.setPositionFromValue(obj as Object3D, value as pos_value, complex)
					break
				case "rotation":
					PropUtils.setRotationFromValue(obj as Object3D, value as rot_value, complex)
					break
				case "scale":
					PropUtils.setScaleFromValue(obj as Object3D, value as scale_value, complex)
					break
				case "quaternion":
					PropUtils.setQuaternionFromValue(obj as Object3D, value as quat_value, complex)
					break
				case "matrix":
					PropUtils.setMatrixFromValue(obj as Object3D, value as matrix_value)
					break
				case "mapSize":
					PropUtils.setShadowMapSizeFromValue(obj as LightShadow, value as mapsize_value)
					break
				case "color":
				case "groundColor":
					PropUtils.setColorFromValueKey(obj as Material | Light, value as color_value, key, complex)
					break
				case "background":
					if (!(value as THREE.Texture).isTexture) {
						PropUtils.setColorFromValueKey(obj as Scene, value as color_value, key, complex)
					} else {
						// TODO  handle background as `Texture`
						//PropUtils.setBackgroundAsTextureFromValueKey(obj as Scene, value as Texture, key, complex)
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
					PropUtils.setLookAtFromValue(obj as Object3D | LightWithTarget, value as lookAt_value, complex)
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
