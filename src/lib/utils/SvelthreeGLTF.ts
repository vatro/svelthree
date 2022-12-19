import { Euler, Vector3 } from "three"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"

// import currently supported components only
import { default as Mesh } from "../components/Mesh.svelte"
import { default as Object3D } from "../components/Object3D.svelte"
import { default as Group } from "../components/Group.svelte"

import type {
	SvelthreeGLTFTreeMap,
	ISvelthreeGLTFTreeMapMember,
	SvelthreeShadowDOMElement,
	SvelthreeComponentShadowDOMChild,
	MeshAssignableMaterial
} from "../types/types-extra.js"

export default class SvelthreeGLTF {
	public tree: SvelthreeGLTFTreeMap = new Map<string, ISvelthreeGLTFTreeMapMember>()

	constructor(public content: GLTF) {}

	/**  */
	public async parse(): Promise<SvelthreeGLTFTreeMap> {
		if (this.content.scenes?.length > 1) {
			for (let i = 0; i < this.content.scenes.length; i++) {
				await this.build_tree(this.content.scenes[i])
			}
		} else {
			await this.build_tree(this.content.scene)
		}

		return this.tree
	}

	async build_tree(scene: THREE.Object3D): Promise<void> {
		//console.log("SvelthreeGLTF parsing started!")

		const fns: (() => Promise<void>)[] = []

		const make_three_member =
			(obj: THREE.Object3D, parent: THREE.Object3D | undefined, tree_map: SvelthreeGLTFTreeMap) =>
			async (): Promise<void> => {
				tree_map.set(obj.uuid, {
					obj: obj,
					parent_uuid: parent ? parent.uuid : null,
					name: obj.name ? obj.name : "",
					obj_type: obj.type,
					mesh:
						obj.type === "Mesh"
							? { geometry: (obj as THREE.Mesh).geometry, material: (obj as THREE.Mesh).material }
							: null,
					svelthree_comp: undefined
				})
			}

		function traverse(child: THREE.Object3D, tree_map: SvelthreeGLTFTreeMap, parent?: THREE.Object3D) {
			fns.push(make_three_member(child, parent, tree_map))

			const children = child.children
			for (let i = 0, l = children.length; i < l; i++) {
				traverse(children[i], tree_map, child)
			}
		}

		traverse(scene, this.tree)

		for (const fn of fns) {
			await fn()
		}

		//console.log("SvelthreeGLTF parsing FINISHED!")
	}

	async get_parent_component(parent_uuid: string): Promise<SvelthreeComponentShadowDOMChild | undefined> {
		const tree_member: ISvelthreeGLTFTreeMapMember | undefined = this.tree.get(parent_uuid)

		if (tree_member?.svelthree_comp) {
			return tree_member?.svelthree_comp
		} else {
			return undefined
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async get_parent_context(parent_component: SvelthreeComponentShadowDOMChild): Promise<Map<any, any>> {
		return parent_component["$$"].context
	}

	/** Generates `svelthree`-components due to the parsed (_see `SvelthreeGLTF.parse()`_) hierarchy-tree-map and
	 * adds the constructed `svelthree`-components-tree to the specified `svelthree`-target-component.
	 */
	public async apply(target_component: SvelthreeComponentShadowDOMChild): Promise<void> {
		//console.log("SvelthreeGLTF apply started!")

		const fns: (() => Promise<void>)[] = []

		const create_component =
			(item: ISvelthreeGLTFTreeMapMember, target_component: SvelthreeComponentShadowDOMChild) =>
			async (): Promise<void> => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let context: Map<any, any> | undefined
				let dom_target: SvelthreeShadowDOMElement | ShadowRoot | undefined | null
				let parent_component: SvelthreeComponentShadowDOMChild | undefined

				if (item.parent_uuid) {
					parent_component = await this.get_parent_component(item.parent_uuid)
					if (parent_component) {
						context = await this.get_parent_context(parent_component)
						dom_target = parent_component.get_shadow_dom_el()
					} else {
						console.error(
							`SVELTHREE > utils > SvelthreeGLTF > create_component : invalid 'parent_component' value!`,
							parent_component
						)
					}
				} else {
					// the object has no parent, means it's the root object
					parent_component = target_component
					dom_target = parent_component.get_shadow_dom_el()
					context = parent_component["$$"].context
				}

				if (dom_target && item && context && parent_component) {
					switch (item.obj_type) {
						// TODO  Add all components we have atm.
						case "Mesh":
							if (item.mesh && item.name) {
								item.svelthree_comp = new Mesh({
									target: dom_target,
									props: {
										geometry: item.mesh.geometry,
										material: item.mesh.material as MeshAssignableMaterial,
										name: item.name
									},
									context
								})
							}
							break
						case "Object3D":
							item.svelthree_comp = new Object3D({
								target: dom_target,
								props: { name: item.name },
								context
							})
							break
						case "Group":
							item.svelthree_comp = new Group({
								target: dom_target,
								props: { name: item.name },
								context
							})
							break
						default:
							console.error(
								`SVELTHREE > utils > SvelthreeGLTF : converting '${item.obj.type}' to a svelthree component is not supported (yet?).`,
								{ item }
							)
							break
					}

					if (item.svelthree_comp) {
						parent_component.register_child_component(item.svelthree_comp, true)
					} else {
						console.error(
							`SVELTHREE > utils > SvelthreeGLTF : registering '${item.obj.type}' as a generated child component not possible because no svelthree component was generated -> probably this type of object is not supported (yet?).`,
							{ item }
						)
					}
				} else {
					console.error(
						`SVELTHREE > utils > SvelthreeGLTF > create_component : cannot generate component -> missing at least one of the required:`,
						{ parent_component, dom_target, item, context }
					)
				}
			}

		for (const [, item] of this.tree.entries()) {
			if (item) {
				fns.push(create_component(item, target_component))
			} else {
				console.error(`SVELTHREE > utils > SvelthreeGLTF > create_component : invalid 'item' value!`, item)
			}
		}

		for (const fn of fns) {
			await fn()
		}

		//postprocess matrix etc.
		for (const [, item] of this.tree.entries()) {
			const comp = item.svelthree_comp

			if (comp) {
				comp.$set({ scale: new Vector3().copy(item.obj.scale) })
				comp.$set({ pos: new Vector3().copy(item.obj.position) })
				comp.$set({ rot: new Euler().copy(item.obj.rotation) })
				comp.$set({ castShadow: item.obj.castShadow })
				comp.$set({ receiveShadow: item.obj.receiveShadow })
			} else {
				console.error(
					`SVELTHREE > utils > SvelthreeGLTF > create_component : invalid 'item.svelthree_comp' (comp) value!`,
					comp
				)
			}
		}

		//console.log("SvelthreeGLTF apply FINISHED!")
	}
}
