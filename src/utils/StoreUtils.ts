/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import type { Scene } from "svelthree-three"

export default class StoreUtils {
	public static getSTIfromScene(scene: Scene, component: string): number {
		if (scene) {
			if (scene.type === "Scene") {
				return this.getSTI(scene, component)
			} else {
				console.warn(`SVELTHREE > ${component} : You have to provide a valid 'scene' prop of type 'Scene'!`, {
					scene: scene
				})
				throw new Error("SVELTHREE Exception (see warning above)")
			}
		} else {
			console.warn(`SVELTHREE > ${component} : You have to provide a {scene} prop!`, {
				scene: scene
			})
			throw new Error(`SVELTHREE Exception (see warning above)`)
		}
	}

	private static getSTI(scene: Scene, component: string): number {
		if (scene.userData.sti >= 0) {
			return scene.userData.sti
		} else {
			console.warn(
				`SVELTHREE > ${component} : Failed to set 'sti' from 'scene.userData.sti', 'sti' has to be >= 0!`,
				{
					scene: scene,
					userData: scene.userData,
					sti: scene.userData.sti
				}
			)
			throw new Error("SVELTHREE Exception (see warning above)")
		}
	}
}
