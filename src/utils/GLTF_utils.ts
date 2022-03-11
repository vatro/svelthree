import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader"
import type { Light, Mesh, Camera, Object3D, Group } from "three"

export default class GLTF_utils {
	// TODO  RECONSIDER  not needed ? -> `content.cameras` avilable:
	/** Get an array of references to all **Cameras** (_all scenes_) inside the loaded GLTF content. */
	/** Get an array of references to all **Cameras** in a specific scene inside the loaded GLTF content. */

	/** Get an array of references to all **Meshes** (_all scenes_) inside the loaded GLTF content. */
	public static async get_all_meshes(content: GLTF): Promise<Mesh[]> {
		const found_meshes: Mesh[] = []
		const check = "isMesh"

		if (content) {
			if (content.scenes?.length > 1) {
				for (let i = 0; i < content.scenes.length; i++) {
					await GLTF_utils.get_all(content.scenes[i], found_meshes, check)
				}
			} else {
				await GLTF_utils.get_all(content.scene, found_meshes, check)
			}
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all_meshes(content)' -> 'content' not available!", {
				content
			})
		}

		return found_meshes
	}

	/** Get an array of references to all **Meshes** in a specific scene inside the loaded GLTF content. */
	public static async get_all_scene_meshes(scene: Group): Promise<Mesh[]> {
		const found_meshes: Mesh[] = []

		if (scene) {
			const check = "isMesh"
			await GLTF_utils.get_all(scene, found_meshes, check)
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all_scene_meshes(scene)' -> 'scene' not available!", {
				scene
			})
		}

		return found_meshes
	}

	/** Get an array of references to all **Lights** (_all scenes_) inside the loaded GLTF content. */
	public static async get_all_lights(content: GLTF): Promise<Light[]> {
		const found_lights: Light[] = []
		const check = "isLight"

		if (content) {
			if (content.scenes?.length > 1) {
				for (let i = 0; i < content.scenes.length; i++) {
					await GLTF_utils.get_all(content.scenes[i], found_lights, check)
				}
			} else {
				await GLTF_utils.get_all(content.scene, found_lights, check)
			}
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all_lights(content)' -> 'content' not available!", {
				content
			})
		}

		return found_lights
	}

	/** Get an array of references to all **Lights** in a specific scene inside the loaded GLTF content. */
	public static async get_all_scene_lights(scene: Group): Promise<Light[]> {
		const found_lights: Light[] = []

		if (scene) {
			const check = "isLight"
			await GLTF_utils.get_all(scene, found_lights, check)
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all_scene_lights(scene)' -> 'scene' not available!", {
				scene
			})
		}

		return found_lights
	}

	/** [ _**internal utility**_ ] Get all references of a specific type from a scene. */
	static async get_all(scene: Group, found: (Mesh | Light | Camera)[], check: string): Promise<void> {
		//console.log(`get_all_of_type - ${check} - started!`)

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj = (obj: Object3D, check: string, depot: (Mesh | Light | Camera)[]) => async () => {
				if (obj) {
					if (obj[check]) depot.push(obj as Mesh | Light | Camera)
				} else {
					console.error(
						"SVELTHREE > GLTF_utils > async 'get_all(scene, ...)' -> async check_obj(obj, ...) -> 'obj' not available!",
						{ obj }
					)
				}
			}

			function traverse(child: Object3D) {
				fns.push(check_obj(child, check, found))
				const children = child.children
				for (let i = 0, l = children.length; i < l; i++) {
					traverse(children[i])
				}
			}

			traverse(scene)

			for (const fn of fns) {
				await fn()
			}
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all(scene, ...)' -> 'scene' not available!", { scene })
		}

		//console.log(`get_all_of_type - ${check} - finished!`)
	}
}
