import type { default as Canvas } from "../components/Canvas.svelte";
import type { SvelteComponent } from "svelte";
import type { BufferGeometry, Material, Matrix4, Mesh, Object3D } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import * as SvelthreeComponent from "../components"
import type { AnySvelthreeComponent } from "../types-extra"


interface ITreeMember {
    obj: Object3D
    parent_uuid?: string
    name?: string
    obj_type?: string
    mesh?: {
        geometry: BufferGeometry
        material: Material | Material[]
    },
    //matrixWorld?: Matrix4,
    //svelthree_comp_class?: AnySvelthreeComponent
    svelthree_comp?: any
}

export default class SvelthreeGLTF {
    public tree: Map<string, ITreeMember>

    constructor() {
        this.tree = new Map<string, ITreeMember>()
    }

    public async parse(content: GLTF): Promise<Map<string, ITreeMember>> {
        if (content.scenes?.length > 1) {
            for (let i = 0; i < content.scenes.length; i++) {
                await this.build_tree(content.scenes[i])
            }
        } else {
            await this.build_tree(content.scene)
        }

        return this.tree
    }

    get_comp_class(obj: Object3D): AnySvelthreeComponent {
        switch (obj.type) {
            case "Object3D":
            case "Group": return SvelthreeComponent.Empty
            default: return SvelthreeComponent[obj.type]
        }
    }

    async build_tree(scene: Object3D): Promise<void> {
        console.log("SvelthreeGLTF parsing started!")

        const fns: (() => Promise<void>)[] = []

        const make_three_member = (obj: Object3D, parent: Object3D | undefined, tree_map: Map<string, ITreeMember>) => async (): Promise<void> => {

            tree_map.set(obj.uuid, {
                obj: obj,
                parent_uuid: parent ? parent.uuid : null,
                name: obj.name ? obj.name : null,
                obj_type: obj.type,
                mesh: obj.type === "Mesh" ? { geometry: (obj as Mesh).geometry, material: (obj as Mesh).material } : null,
                svelthree_comp: null
            })
        }

        function traverse(child: Object3D, tree_map: Map<string, ITreeMember>, parent?: Object3D) {

            fns.push(make_three_member(child, parent, tree_map))

            const children = child.children;
            for (let i = 0, l = children.length; i < l; i++) {
                traverse(children[i], tree_map, child);
            }
        }

        traverse(scene, this.tree)

        for (const fn of fns) {
            await fn()
        }

        console.log("SvelthreeGLTF parsing FINISHED!")
    }

    async get_parent_component(parent_uuid: string): Promise<AnySvelthreeComponent> {
        return this.tree.get(parent_uuid).svelthree_comp
    }

    async get_parent_context(parent_component: AnySvelthreeComponent): Promise<Map<any, any>> {
        return parent_component["$$"].context
    }

    public async apply(dom_target: HTMLElement, root_component: AnySvelthreeComponent): Promise<void> {
        console.log("SvelthreeGLTF apply started!")

        const fns: (() => Promise<void>)[] = []

        const create_component = (item: ITreeMember, dom_target: HTMLElement, root_component: AnySvelthreeComponent) => async (): Promise<void> => {

            let context: Map<any, any> = null
            if (item.parent_uuid) {
                const parent_component = await this.get_parent_component(item.parent_uuid)
                context = await this.get_parent_context(parent_component)
            } else {
                context = root_component["$$"].context
            }

            switch (item.obj_type) {
                case "Mesh":
                    item.svelthree_comp = new SvelthreeComponent.Mesh({ target: dom_target, props: { geometry: item.mesh.geometry, material: item.mesh.material, name: item.name }, context })
                    break
                case "Object3D":
                case "Group":
                    item.svelthree_comp = new SvelthreeComponent.Empty({ target: dom_target, props: { name: item.name }, context })
                    break
                default:
                    try {
                        item.svelthree_comp = new SvelthreeComponent[item.obj_type]({ target: dom_target, props: { name: item.name }, context })
                    } catch (e) {
                        console.error(e)
                        console.log(item)
                    }
                    break
            }
        }

        for (const [uuid, item] of this.tree.entries()) {
            /*
            for (const [uuid, item] of this.tree.entries()) {
                console.log("---------------------------------------------")
                console.log("type:", item.obj_type)
                console.log(".matrix", item.obj.matrix.elements.toString())
                console.log(".matrixWorld", item.obj.matrixWorld.elements.toString())
            }
            */

            fns.push(create_component(item, dom_target, root_component))
        }

        for (const fn of fns) {
            await fn()
        }

        //postprocess matrix etc.
        for (const [uuid, item] of this.tree.entries()) {

            const instance = item.svelthree_comp.get_instance()
            instance.matrixAutoUpdate = false

            // don't clone, just copy (is faster)
            instance.matrix.copy(item.obj.matrix as Matrix4)
            instance.matrixWorld.copy(item.obj.matrixWorld as Matrix4)
            instance.position.copy(item.obj.position)
            instance.rotation.copy(item.obj.rotation)
            instance.scale.copy(item.obj.scale)

            instance.matrixWorldNeedsUpdate = false
            instance.matrixAutoUpdate = item.svelthree_comp.mau

            instance.castShadow = item.obj.castShadow
            instance.receiveShadow = item.obj.receiveShadow
        }


        console.log("SvelthreeGLTF apply FINISHED!")
    }
}