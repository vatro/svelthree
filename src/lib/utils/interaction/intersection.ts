import type { Object3D, Raycaster } from "three"
import { Vector3 } from "three"
import type { RaycasterData, AllIntersections, PointerState } from "../../types/types-extra.js"

/** Returns `false` if `obj` is not intersected by the pointer. Retruns `true` if it's intersected and sets / populates `raycaster_data` Object  */
export const get_intersects_and_set_raycaster_data = (
	raycaster: Raycaster | undefined,
	all_intersections: AllIntersections | undefined,
	obj: Object3D | undefined | null,
	raycaster_data: RaycasterData,
	pointer: PointerState
): boolean => {
	if (raycaster && all_intersections) {
		if (all_intersections.result.length && all_intersections.result[0].object === obj) {
			Object.assign(raycaster_data, {
				intersection: all_intersections.result[0],
				ray: raycaster.ray,
				camera: raycaster.camera,
				unprojected_point: new Vector3(pointer.pos.x, pointer.pos.y, 0).unproject(raycaster.camera)
			})

			return true
		} else {
			return false
		}
	} else {
		return false
	}
}
