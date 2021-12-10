/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import { has_prop } from "svelte/internal"
import type { Light, Scene } from "three"
import { Color, Object3D } from "three"
import type { LightWithShadow } from "../types-extra"
import PropUtils from "./PropUtils"
import { verbose_mode } from "../utils/SvelthreeLogger"

/**
 * Containes public static methods for updating Light (and shadow) properties via component shorthand attributes.
 */
export default class LightUtils {
	/**
	 * @deprecated Use PropUitls instead.
	 * Updates *Light.intensity*  via `intensity` component attribute.
	 */
	public static tryIntensityUpdate(light: Light, intensity: number): void {
		if (verbose_mode()) console.debug("SVELTHREE > LightUtils > tryIntensityUpdate ", intensity)
		try {
			light.intensity = intensity
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	/**
	 * @deprecated Use PropUitls instead.
	 * Updates *Light.color* via `color` component attribute.
	 */
	public static tryColorUpdate(light: Light, color: any): void {
		if (verbose_mode()) console.debug("color", color)
		try {
			if (PropUtils.isArray(color)) {
				if (PropUtils.isArray3Nums(color)) {
					light.color = new Color(color[0], color[1], color[2])
				} else {
					if (verbose_mode())
						console.error(
							"SVELTHREE > LightUtils > tryColorUpdate : Prop should be an Array of three (3) values!",
							color
						)
				}
			} else if (!isNaN(color)) {
				light.color = new Color(color)
			} else if (color instanceof Color) {
				light.color = color
			}
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	// shadow related attributes

	/**
	 * @deprecated Use PropUitls instead.
	 * Updates *Light.shadow.mapSize* via `shadowMapSize` component attribute.
	 */
	public static tryShadowMapSizeUpdate(light: LightWithShadow, shadowMapSize: number): void {
		if (verbose_mode()) console.debug("SVELTHREE > LightUtils > tryShadowMapSizeUpdate", shadowMapSize)
		try {
			light.shadow.mapSize.width = shadowMapSize
			light.shadow.mapSize.height = shadowMapSize
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	/**
	 * @deprecated Use PropUitls instead.
	 * Updates *Light.shadow.bias* via `shadowBias` component attribute.
	 */
	public static tryShadowBiasUpdate(light: LightWithShadow, shadowBiasSize: number): void {
		if (verbose_mode()) console.debug("SVELTHREE > LightUtils > tryShadowBiasUpdate", shadowBiasSize)
		try {
			light.shadow.bias = shadowBiasSize
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	/**
	 * @deprecated Use PropUitls instead.
	 * Updates `Light.castShadow` via `castShadow` component attribute.
	 */
	public static tryCastShadowUpdate(light: LightWithShadow, castShadow: boolean): void {
		if (verbose_mode()) console.debug("SVELTHREE > LightUtils > tryCastShadowUpdate", castShadow)
		try {
			light.castShadow = castShadow
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	/**
	 * @deprecated Use PropUitls instead.
	 * Updates `Light.shadow` via `shadowProps` component attribute.
	 */
	public static tryShadowPropUpdate(light: Light, key: string, value: any) {
		if (verbose_mode()) console.debug("SVELTHREE > LightUtils : tryShadowPropsUpdate", { key: key, value: value })
		try {
			if (has_prop(light.shadow, key)) {
				if (verbose_mode())
					console.debug("SVELTHREE > LightUtils > tryShadowPropsUpdate : updating shadow prop! ", key)
				light.shadow[key] = value
				light.shadow.needsUpdate = true
			}
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	/**
	 * @deprecated Use PropUitls instead.
	 * Updates `Light.shadow.camera` via `shadowCameraProps` component attribute.
	 */
	public static tryShadowCameraPropUpdate(light: LightWithShadow, key: string, value: any) {
		if (verbose_mode())
			console.debug("SVELTHREE > LightUtils : tryShadowCameraPropsUpdate", { key: key, value: value })
		try {
			if (has_prop(light.shadow.camera, key)) {
				if (verbose_mode())
					console.debug("SVELTHREE > LightUtils > tryShadowCameraPropsUpdate : updating shadow prop!", key)
				light.shadow.camera[key] = value
				light.shadow.camera.updateProjectionMatrix()
			}
		} catch (error) {
			throw new Error("SVELTHREE Exception, " + error)
		}
	}

	/**
	 * Creates a specific Light helper.
	 */
	public static addHelper(light: Light, scene: Scene, helper: Object3D): void {
		light.userData.helper = helper
		LightUtils.updateHelper(light)

		scene.add(helper)
		helper.visible = true

		if (verbose_mode())
			console.debug("SVELTHREE > " + light.type + " HELPER added!", {
				camHelper: light.userData.helper,
				scene: scene,
				total: scene.children.length
			})
	}

	/**
	 * Syncs Light and Light helper.
	 */
	public static updateHelper(light: Light): void {
		if (light.userData.helper) {
			// updates appearance / elements
			light.userData.helper.update()

			// updates matrix (position, rotation, scale)
			// this approach is bulletproof for all scene / matrix update modes.
			light.userData.helper.matrix.copy(light.matrix)
			light.userData.helper.matrixWorld.copy(light.matrixWorld)
		}
	}

	public static removeHelper(light: Light, scene: Scene): void {
		if (light.userData.helper) {
			scene.remove(light.userData.helper)
			light.userData.helper = null
		}
	}
}
