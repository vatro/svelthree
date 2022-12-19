import type { Object3D, Group } from "three"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import type { PropsMesh } from "../types/types-comp-props.js"
import type { PropsAnyTHREEMeshMaterial, PropsAnyTHREELight } from "../types/types-extra.js"
//import type { AnyTHREEMeshMaterial } from "../types/types-extra.js"

export default class GLTF_afterLoaded {
	// TODO  RECONSIDER  static for_all_cameras ?
	// TODO  RECONSIDER  static for_all_animations ?
	// TODO  RECONSIDER  static remove_all_animations ?
	// TODO  RECONSIDER  static for_all_textures ?
	// TODO  RECONSIDER  static remove_all_textures ?

	public static remove_all_lights = async (gltf_content: GLTF): Promise<void> => {
		//console.log("remove_all_lights!")
		if (gltf_content) {
			if (gltf_content.scenes?.length > 1) {
				for (let i = 0; i < gltf_content.scenes.length; i++) {
					await GLTF_afterLoaded.remove_all(gltf_content.scenes[i], "isLight")
				}
			} else {
				await GLTF_afterLoaded.remove_all(gltf_content.scene, "isLight")
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'remove_all_lights(gltf_content)' -> 'gltf_content' not available!",
				{ gltf_content }
			)
		}
	}

	public static remove_all_cameras = async (gltf_content: GLTF): Promise<void> => {
		//console.log("remove_all_cameras!")
		if (gltf_content) {
			if (gltf_content.scenes?.length > 1) {
				for (let i = 0; i < gltf_content.scenes.length; i++) {
					await GLTF_afterLoaded.remove_all(gltf_content.scenes[i], "isCamera")
				}
			} else {
				await GLTF_afterLoaded.remove_all(gltf_content.scene, "isCamera")
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'remove_all_cameras(gltf_content)' -> 'gltf_content' not available!",
				{ gltf_content }
			)
		}
	}

	private static async remove_all(scene: Group, typ: string): Promise<void> {
		//console.log("remove_all started!")

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj = (obj: Object3D | undefined, parent: Object3D | undefined, typ: string) => async () => {
				if (obj) {
					if (Object.hasOwn(obj, typ)) {
						// see https://github.com/mrdoob/three.js/blob/1a241ef10048770d56e06d6cd6a64c76cc720f95/src/core/Object3D.js#L342-L369
						if (parent) {
							const index_to_remove: number = parent.children.indexOf(obj)
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

			const traverse = (child: Object3D, parent?: Object3D) => {
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

	private static async apply_to_materials(scene: Group, props: PropsAnyTHREEMeshMaterial): Promise<void> {
		//console.log("apply_to_materials started!")

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj = (obj: Object3D | undefined, props: PropsAnyTHREEMeshMaterial) => async () => {
				if (obj) {
					if (Object.hasOwn(obj, "isMesh") && Object.hasOwn(obj, "material")) {
						for (const prop in props) {
							try {
								// TODO  TS Error
								//const mesh = obj as THREE.Mesh
								//const mesh_material = mesh.material as AnyTHREEMeshMaterial
								//if (mesh_material && Object.hasOwn(mesh_material, prop)) mesh_material[prop as keyof AnyTHREEMeshMaterial] = props[prop as keyof PropsAnyTHREEMeshMaterial]
								// eslint-disable-next-line @typescript-eslint/ban-ts-comment
								// @ts-ignore
								mesh_material[prop] = props[prop as keyof PropsAnyTHREEMeshMaterial]
							} catch (err) {
								console.error(err)
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

			const traverse = (child: Object3D, props: PropsAnyTHREEMeshMaterial) => {
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

	private static async apply_to_meshes(scene: Group, props: PropsMesh): Promise<void> {
		//console.log("apply_to_meshes started!")

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj = (obj: Object3D, props: PropsMesh) => async () => {
				if (obj) {
					if (Object.hasOwn(obj, "isMesh")) {
						for (const prop in props) {
							try {
								// eslint-disable-next-line @typescript-eslint/ban-ts-comment
								// @ts-ignore
								obj[prop] = props[prop]
							} catch (err) {
								console.error(err)
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

			const traverse = (child: Object3D, props: PropsMesh) => {
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

	private static async apply_to_lights(scene: Group, props: PropsAnyTHREELight): Promise<void> {
		//console.log("apply_to_lights started!")

		if (scene) {
			const fns: (() => Promise<void>)[] = []

			const check_obj = (obj: Object3D, props: PropsAnyTHREELight) => async () => {
				if (obj) {
					if (Object.hasOwn(obj, "isLight")) {
						for (const prop in props) {
							try {
								// eslint-disable-next-line @typescript-eslint/ban-ts-comment
								// @ts-ignore
								obj[prop] = props[prop]
							} catch (err) {
								console.error(err)
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

			const traverse = (obj: Object3D, props: PropsAnyTHREELight) => {
				fns.push(check_obj(obj, props))
				const children = obj.children
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

	public static for_all_materials = (props: PropsAnyTHREEMeshMaterial) => async (gltf_content: GLTF) => {
		if (gltf_content) {
			if (gltf_content.scenes?.length > 1) {
				for (let i = 0; i < gltf_content.scenes.length; i++) {
					await GLTF_afterLoaded.apply_to_materials(gltf_content.scenes[i], props)
				}
			} else {
				await GLTF_afterLoaded.apply_to_materials(gltf_content.scene, props)
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'for_all_materials(props)(gltf_content)' -> 'gltf_content' not available!",
				{ gltf_content }
			)
		}
	}

	public static for_all_meshes = (props: PropsMesh) => async (gltf_content: GLTF) => {
		if (gltf_content) {
			if (gltf_content.scenes?.length > 1) {
				for (let i = 0; i < gltf_content.scenes.length; i++) {
					await GLTF_afterLoaded.apply_to_meshes(gltf_content.scenes[i], props)
				}
			} else {
				await GLTF_afterLoaded.apply_to_meshes(gltf_content.scene, props)
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'for_all_meshes(props)(gltf_content)' -> 'gltf_content' not available!",
				{ gltf_content }
			)
		}
	}

	public static for_all_lights = (props: PropsAnyTHREELight) => async (gltf_content: GLTF) => {
		if (gltf_content) {
			if (gltf_content.scenes?.length > 1) {
				for (let i = 0; i < gltf_content.scenes.length; i++) {
					await GLTF_afterLoaded.apply_to_lights(gltf_content.scenes[i], props)
				}
			} else {
				await GLTF_afterLoaded.apply_to_lights(gltf_content.scene, props)
			}
		} else {
			console.error(
				"SVELTHREE > GLTF_afterLoaded > async 'for_all_lights(props)(gltf_content)' -> 'gltf_content' not available!",
				{ gltf_content }
			)
		}
	}
}
