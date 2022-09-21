import type { Light, Scene } from "three"
import type { Object3D } from "three"
import { verbose_mode } from "../utils/SvelthreeLogger"

/**
 * Containes public static methods for updating Light (and shadow) properties via component shorthand attributes.
 */
export default class LightUtils {
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
			//light.userData.helper.matrix.copy(light.matrix)
			//light.userData.helper.matrixWorld.copy(light.matrixWorld)
		}
	}

	public static removeHelper(light: Light, scene: Scene): void {
		if (light.userData.helper) {
			scene.remove(light.userData.helper)
			light.userData.helper = null
		}
	}
}
