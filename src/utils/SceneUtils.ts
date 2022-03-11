import type { Scene } from "three"

function get_root_scene(context_scene: Scene): Scene | null {
	//let context_scene: Scene = getContext("scene")
	if (context_scene.parent === null) {
		return context_scene
	} else {
		let n = undefined
		let o: any = context_scene
		while (n !== null) {
			n = o.parent
			if (n !== null) {
				o = n
			}
		}
		return o
	}
}

export { get_root_scene }
