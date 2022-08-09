import type { Object3D } from "three"

const remove_helper_of = (obj: Object3D): void => {
	if (obj.userData.helper?.parent) {
		obj.userData.helper.parent.remove(obj.userData.helper)
		obj.userData.helper = null
	}
}

const remove_box_of = (obj: Object3D): void => {
	if (obj.userData.box?.parent) {
		obj.userData.box.parent.remove(obj.userData.box)
		obj.userData.box = null
	}
}

const remove_from_parent = (obj: Object3D): void => {
	if (obj.parent) obj.parent.remove(obj)
}

const reset_userdata = (obj: Object3D): void => {
	obj.userData.svelthreeComponent = undefined
	obj.userData.interact = undefined
	obj.userData.block = undefined
	obj.userData.initScale = undefined
}

const clear_new_instance_managing_component = (
	new_instance: Object3D,
	instance_name: string,
	current_component: any
): void => {
	const managed_by_component: any = new_instance?.userData?.svelthreeComponent || null
	const same_component = managed_by_component === current_component
	const same_instance = managed_by_component?.[instance_name] === new_instance

	if (managed_by_component && !same_component && same_instance) {
		//console.warn('clear current managing component!')
		managed_by_component.clear()
	} else {
		// DO NOTHING / SILENT
		//console.warn('do NOT clear current manging component!')
	}
}

/** Removes the (three) instance of the object created by the component from it's parent (_if any_).
 * - removes `box ` helper
 * - removes any registered `helper`
 * - clears the managing component ( _if applicable_ )
 * - resets `userData`
 *
 * TODO  RECONSIDER  disposal? (optional?)
 */
const remove_instance = (
	obj: Object3D,
	instance_name: string,
	new_instance: Object3D = null,
	current_component: any = null
): boolean => {
	if (obj) {
		remove_box_of(obj)
		remove_helper_of(obj)
		remove_from_parent(obj)
		if (new_instance && current_component)
			clear_new_instance_managing_component(new_instance, instance_name, current_component)
		reset_userdata(obj)
		// TODO  dispose? (optional?)
		return true
	} else {
		console.error(`SVELTHREE > remove_instance : Cannot remove invalid '${instance_name}' instance!`, obj)
		return false
	}
}

export { remove_instance }