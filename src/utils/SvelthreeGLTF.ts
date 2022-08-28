import { Euler, Vector3 } from "three"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader"

// import currently supported components only
import { Mesh } from "../components"
import { Group, Object3D } from "../components"
import type { Canvas } from "../components"

import type {
	GLTFSupportedSvelthreeComponents,
	SvelthreeGLTFTreeMap,
	ISvelthreeGLTFTreeMapMember
} from "../types-extra"

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
					name: obj.name ? obj.name : null,
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

	async get_parent_component(parent_uuid: string): Promise<GLTFSupportedSvelthreeComponents | undefined> {
		const tree_member: ISvelthreeGLTFTreeMapMember | undefined = this.tree.get(parent_uuid)

		if (tree_member?.svelthree_comp) {
			return tree_member?.svelthree_comp
		} else {
			return undefined
		}
	}

	async get_parent_context(parent_component: GLTFSupportedSvelthreeComponents): Promise<Map<any, any>> {
		return parent_component["$$"].context
	}

	public async apply(canvas_component: Canvas, root_component: GLTFSupportedSvelthreeComponents): Promise<void> {
		//console.log("SvelthreeGLTF apply started!")

		const fns: (() => Promise<void>)[] = []

		const create_component =
			(
				item: ISvelthreeGLTFTreeMapMember,
				canvas_component: Canvas,
				root_component: GLTFSupportedSvelthreeComponents
			) =>
			async (): Promise<void> => {
				let context: Map<any, any>
				if (item.parent_uuid) {
					const parent_component = await this.get_parent_component(item.parent_uuid)
					if (parent_component) {
						context = await this.get_parent_context(parent_component)
					} else {
						console.error(
							`SVELTHREE > utils > SvelthreeGLTF > create_component : invalid 'parent_component' value!`,
							parent_component
						)
					}
				} else {
					context = root_component["$$"].context
				}

				switch (item.obj_type) {
					case "Mesh":
						item.svelthree_comp = new Mesh({
							target: canvas_component.getDomElement(),
							props: { geometry: item.mesh.geometry, material: item.mesh.material, name: item.name },
							context
						})
						break
					case "Object3D":
						item.svelthree_comp = new Object3D({
							target: canvas_component.getDomElement(),
							props: { name: item.name },
							context
						})
						break
					case "Group":
						item.svelthree_comp = new Group({
							target: canvas_component.getDomElement(),
							props: { name: item.name },
							context
						})
						break
					default:
						console.error(
							`SVELTHREE > utils > SvelthreeGLTF : sorry, converting ${item.obj.type} to a svlethree component is not supported (yet?).`,
							{ item }
						)
						break
				}
			}

		// const [uuid, item] -> uuid not needed -> [,item]
		for (const [, item] of this.tree.entries()) {
			if (item) {
				fns.push(create_component(item, canvas_component, root_component))
			} else {
				console.error(`SVELTHREE > utils > SvelthreeGLTF > create_component : invalid 'item' value!`, item)
			}
		}

		for (const fn of fns) {
			await fn()
		}

		//postprocess matrix etc.
		// const [uuid, item] -> uuid not needed -> [,item]
		for (const [, item] of this.tree.entries()) {
			const comp = item.svelthree_comp

			if (comp) {
				comp.scale = new Vector3().copy(item.obj.scale)
				comp.pos = new Vector3().copy(item.obj.position)
				comp.rot = new Euler().copy(item.obj.rotation)
				comp.castShadow = item.obj.castShadow
				comp.receiveShadow = item.obj.receiveShadow
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
