import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import type { Light, Mesh, Camera, Object3D, Group } from "three"

export default class GLTF_utils {
	/** Get an array of references to all **Meshes** (_all scenes_) inside the loaded GLTF content. */
	public static async get_all_meshes(content: GLTF | undefined): Promise<Mesh[]> {
		const found_meshes: Mesh[] = []
		const is_foo = "isMesh"

		if (content) {
			if (content.scenes?.length > 1) {
				for (let i = 0; i < content.scenes.length; i++) {
					await GLTF_utils.get_all(content.scenes[i], found_meshes, is_foo)
				}
			} else {
				await GLTF_utils.get_all(content.scene, found_meshes, is_foo)
			}
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all_meshes(content)' -> 'content' not available!", {
				content
			})
		}

		return found_meshes
	}

	/** Get an array of references to all **Meshes** in a specific scene inside the loaded GLTF content. */
	public static async get_all_scene_meshes(scene: Group | undefined): Promise<Mesh[]> {
		const found_meshes: Mesh[] = []

		if (scene) {
			const is_foo = "isMesh"
			await GLTF_utils.get_all(scene, found_meshes, is_foo)
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all_scene_meshes(scene)' -> 'scene' not available!", {
				scene
			})
		}

		return found_meshes
	}

	/** Get an array of references to all **Lights** (_all scenes_) inside the loaded GLTF content. */
	public static async get_all_lights(content: GLTF | undefined): Promise<Light[]> {
		const found_lights: Light[] = []
		const is_foo = "isLight"

		if (content) {
			if (content.scenes?.length > 1) {
				for (let i = 0; i < content.scenes.length; i++) {
					await GLTF_utils.get_all(content.scenes[i], found_lights, is_foo)
				}
			} else {
				await GLTF_utils.get_all(content.scene, found_lights, is_foo)
			}
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all_lights(content)' -> 'content' not available!", {
				content
			})
		}

		return found_lights
	}

	/** Get an array of references to all **Lights** in a specific scene inside the loaded GLTF content. */
	public static async get_all_scene_lights(scene: Group | undefined): Promise<Light[]> {
		const found_lights: Light[] = []

		if (scene) {
			const is_foo = "isLight"
			await GLTF_utils.get_all(scene, found_lights, is_foo)
		} else {
			console.error("SVELTHREE > GLTF_utils > async 'get_all_scene_lights(scene)' -> 'scene' not available!", {
				scene
			})
		}

		return found_lights
	}

	/** [ _**internal utility**_ ] Get all references of a specific type from a scene. */
	static async get_all(scene: Group, found: (Mesh | Light | Camera)[], is_foo: string): Promise<void> {
		//console.log(`get_all_of_type - ${check} - started!`)

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj = (obj: Object3D, is_foo: string, depot: (Mesh | Light | Camera)[]) => async () => {
				if (obj) {
					if (Object.hasOwn(obj, is_foo)) depot.push(obj as Mesh | Light | Camera)
				} else {
					console.error(
						"SVELTHREE > GLTF_utils > async 'get_all(scene, ...)' -> async check_obj(obj, ...) -> 'obj' not available!",
						{ obj }
					)
				}
			}

			const traverse = (child: Object3D) => {
				fns.push(check_obj(child, is_foo, found))
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
