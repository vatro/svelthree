import type { Object3D, Scene } from "three"
import type { SvelthreeStoreArray } from "../../utils/SvelthreeStoreArray.js"

/** Search in all scenes (_direct children of canvas_) for an instance with the specified `uuid` */
const find_in_canvas = (scenes_array: SvelthreeStoreArray | undefined, uuid: string): Object3D | undefined => {
	if (scenes_array) {
		for (let i = 0; i < scenes_array.length; i++) {
			const scene: Scene = scenes_array[i].scene
			const found: Object3D | undefined = scene.getObjectByProperty("uuid", uuid)
			if (found) return found
		}
	}
	return undefined
}

export { find_in_canvas }
