import type { Object3D, Group } from "three"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader"
import type { MeshProperties } from "../types/types-comp-props"
import type { AnyMeshMaterialProps, AnyLightProps } from "../types/types-extra"

export default class GLTF_afterLoaded {
	// TODO  RECONSIDER  static for_all_cameras ?
	// TODO  RECONSIDER  static for_all_animations ?
	// TODO  RECONSIDER  static remove_all_animations ?
	// TODO  RECONSIDER  static for_all_textures ?
	// TODO  RECONSIDER  static remove_all_textures ?

	public static remove_all_lights: (dummy: any, ...args: any[]) => Promise<void> = async (content: GLTF) => {
		//console.log("remove_all_lights!")
		if (content) {
			if (content.scenes?.length > 1) {
				for (let i = 0; i < content.scenes.length; i++) {
					await GLTF_afterLoaded.remove_all(content.scenes[i], "isLight")
				}
			} else {
				await GLTF_afterLoaded.remove_all(content.scene, "isLight")
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'remove_all_lights(content)' -> 'content' not available!",
				{ content }
			)
		}
	}

	public static remove_all_cameras: (content: any, ...args: any[]) => Promise<void> = async (content: GLTF) => {
		//console.log("remove_all_cameras!")
		if (content) {
			if (content.scenes?.length > 1) {
				for (let i = 0; i < content.scenes.length; i++) {
					await GLTF_afterLoaded.remove_all(content.scenes[i], "isCamera")
				}
			} else {
				await GLTF_afterLoaded.remove_all(content.scene, "isCamera")
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'remove_all_cameras(content)' -> 'content' not available!",
				{ content }
			)
		}
	}

	private static async remove_all(scene: Group, typ: string): Promise<void> {
		//console.log("remove_all started!")

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj = (obj: Object3D, parent: Object3D | undefined, typ: string) => async () => {
				if (obj) {
					if (obj[typ]) {
						// see https://github.com/mrdoob/three.js/blob/1a241ef10048770d56e06d6cd6a64c76cc720f95/src/core/Object3D.js#L342-L369
						if (parent) {
							let index_to_remove: number = parent.children.indexOf(obj)
							//console.log(`removing -> [${index_to_remove}] ${obj.type}`, obj.uuid)
							parent.children.splice(index_to_remove, 1)
						}
					}
				} else {
					console.error(
						"SVELTHREE > GLTF_afterLoaded > async 'remove_all(scene, ...)' -> async check_obj(obj, ...) -> 'obj' not available!",
						{ obj }
					)
				}
			}

			function traverse(child: Object3D, parent?: Object3D) {
				fns.push(check_obj(child, parent, typ))
				const children = child.children
				for (let i = 0, l = children.length; i < l; i++) {
					traverse(children[i], child)
				}
			}

			traverse(scene)

			for (const fn of fns) {
				await fn()
			}
		} else {
			console.error("SVELTHREE > GLTF_afterLoaded > async 'remove_all(scene, ...)' -> 'scene' not available!", {
				scene
			})
		}

		//console.log("remove_all FINISHED!")
		//if (scene) { console.log(scene) }
	}

	private static async apply_to_materials(
		scene: Group,
		props: { [P in keyof AnyMeshMaterialProps]: AnyMeshMaterialProps[P] }
	): Promise<void> {
		//console.log("apply_to_materials started!")

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj =
				(obj: Object3D, props: { [P in keyof AnyMeshMaterialProps]: AnyMeshMaterialProps[P] }) => async () => {
					if (obj) {
						if (obj["isMesh"] && obj["material"]) {
							for (let prop in props) {
								try {
									obj["material"][prop] = props[prop]
								} catch (e) {
									console.error(e)
								}
							}
						}
					} else {
						console.error(
							"SVELTHREE > GLTF_afterLoaded > async 'apply_to_materials(scene, ...)' -> async check_obj(obj, ...) -> 'obj' not available!",
							{ obj }
						)
					}
				}

			function traverse(child: Object3D, props: { [P in keyof AnyMeshMaterialProps]: AnyMeshMaterialProps[P] }) {
				fns.push(check_obj(child, props))
				const children = child.children
				for (let i = 0, l = children.length; i < l; i++) {
					traverse(children[i], props)
				}
			}

			traverse(scene, props)

			for (const fn of fns) {
				await fn()
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'get_all_scene_lights(scene, ...)' -> 'scene' not available!",
				{ scene }
			)
		}

		//console.log("apply_to_materials FINISHED!")
		//if (scene) { console.log(scene) }
	}

	private static async apply_to_meshes(
		scene: Group,
		props: { [P in keyof MeshProperties]: MeshProperties[P] }
	): Promise<void> {
		//console.log("apply_to_meshes started!")

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj =
				(obj: Object3D, props: { [P in keyof MeshProperties]: MeshProperties[P] }) => async () => {
					if (obj) {
						if (obj["isMesh"]) {
							for (let prop in props) {
								try {
									obj[prop] = props[prop]
								} catch (e) {
									console.error(e)
								}
							}
						}
					} else {
						console.error(
							"SVELTHREE > GLTF_afterLoaded > async 'apply_to_meshes(scene, ...)' -> async check_obj(obj, ...) -> 'obj' not available!",
							{ obj }
						)
					}
				}

			function traverse(child: Object3D, props: { [P in keyof MeshProperties]: MeshProperties[P] }) {
				fns.push(check_obj(child, props))
				const children = child.children
				for (let i = 0, l = children.length; i < l; i++) {
					traverse(children[i], props)
				}
			}

			traverse(scene, props)

			for (const fn of fns) {
				await fn()
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'apply_to_meshes(scene, ...)' -> 'scene' not available!",
				{ scene }
			)
		}

		//console.log("apply_to_meshes FINISHED!")
		//if (scene) { console.log(scene) }
	}

	private static async apply_to_lights(
		scene: Group,
		props: { [P in keyof AnyLightProps]: AnyLightProps[P] }
	): Promise<void> {
		//console.log("apply_to_lights started!")

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj = (obj: Object3D, props: { [P in keyof AnyLightProps]: AnyLightProps[P] }) => async () => {
				if (obj) {
					if (obj["isLight"]) {
						for (let prop in props) {
							try {
								obj[prop] = props[prop]
							} catch (e) {
								console.error(e)
							}
						}
					}
				} else {
					console.error(
						"SVELTHREE > GLTF_afterLoaded > async 'apply_to_lights(scene, ...)' -> async check_obj(obj, ...) -> 'obj' not available!",
						{ obj }
					)
				}
			}

			function traverse(child: Object3D, props: { [P in keyof AnyLightProps]: AnyLightProps[P] }) {
				fns.push(check_obj(child, props))
				const children = child.children
				for (let i = 0, l = children.length; i < l; i++) {
					traverse(children[i], props)
				}
			}

			traverse(scene, props)

			for (const fn of fns) {
				await fn()
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'apply_to_lights(scene, ...)' -> 'scene' not available!",
				{ scene }
			)
		}

		//console.log("apply_to_lights FINISHED!")
		//if (scene) { console.log(scene) }
	}

	public static for_all_materials =
		(props: { [P in keyof AnyMeshMaterialProps]: AnyMeshMaterialProps[P] }) => async (content: GLTF) => {
			if (content) {
				if (content.scenes?.length > 1) {
					for (let i = 0; i < content.scenes.length; i++) {
						await GLTF_afterLoaded.apply_to_materials(content.scenes[i], props)
					}
				} else {
					await GLTF_afterLoaded.apply_to_materials(content.scene, props)
				}
			} else {
				console.error(
					"SVELTHREE > GLTF_afterLoaded > async 'for_all_materials(props)(content)' -> 'content' not available!",
					{ content }
				)
			}
		}

	public static for_all_meshes =
		(props: { [P in keyof MeshProperties]: MeshProperties[P] }) => async (content: GLTF) => {
			if (content) {
				if (content.scenes?.length > 1) {
					for (let i = 0; i < content.scenes.length; i++) {
						await GLTF_afterLoaded.apply_to_meshes(content.scenes[i], props)
					}
				} else {
					await GLTF_afterLoaded.apply_to_meshes(content.scene, props)
				}
			} else {
				console.error(
					"SVELTHREE > GLTF_afterLoaded > async 'for_all_meshes(props)(content)' -> 'content' not available!",
					{ content }
				)
			}
		}

	public static for_all_lights =
		(props: { [P in keyof AnyLightProps]: AnyLightProps[P] }) => async (content: GLTF) => {
			if (content) {
				if (content.scenes?.length > 1) {
					for (let i = 0; i < content.scenes.length; i++) {
						await GLTF_afterLoaded.apply_to_lights(content.scenes[i], props)
					}
				} else {
					await GLTF_afterLoaded.apply_to_lights(content.scene, props)
				}
			} else {
				console.error(
					"SVELTHREE > GLTF_afterLoaded > async 'for_all_lights(props)(content)' -> 'content' not available!",
					{ content }
				)
			}
		}
}
