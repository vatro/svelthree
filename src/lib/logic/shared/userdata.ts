import type { Object3D } from "three"
import type { AnySvelthreeComponent } from "../../types/types-extra.js"

const set_initial_userdata = (instance: Object3D, comp: AnySvelthreeComponent) => {
	instance.userData.initScale = instance.scale.x
	instance.userData.svelthreeComponent = comp
	instance.userData.interact = false
	instance.userData.block = false
	instance.userData.index_in_raycast = null
}

export { set_initial_userdata }
