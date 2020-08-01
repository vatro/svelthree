<script lang="typescript">
    /**
     * @author Vatroslav Vrbanic @see https://github.com/vatro
     */

    import { onMount } from "svelte"
    import { get_current_component } from "svelte/internal"
    import {
        Mesh,
        Object3D,
        Scene,
        Material,
        BufferGeometry,
        Geometry
    } from "svelthree-three"
    import { svelthreeStores } from "../stores.js"
    import { UniversalPropIterator } from "../utils/UniversalPropIterator.svelte"
    import { Object3DUtils } from "../utils/Object3DUtils.svelte"

    import SvelthreeAnimation from "./SvelthreeAnimation.svelte"

    import type {
        PropPos,
        PropRot,
        PropScale,
        PropMatrix4
    } from "../utils/Sv3Types.svelte"
    import {
        isValidArray3Prop,
        isValidMatrix4
    } from "../utils/PropUtils.svelte"
    import SvelthreeInteraction from "./SvelthreeInteraction.svelte"
    import { createEventDispatcher } from "svelte"

    let ani: any
    let self = get_current_component()
    let dispatch = createEventDispatcher()

    // construction

    export let name: string = undefined

    export let parent: Object3D = undefined
    export let parentForSlot: Object3D = undefined
    export let parentForUs: Object3D = undefined
    export let scene: Scene

    export let aniauto: boolean = undefined
    export let interact: boolean = undefined
    //export let recursive: boolean = undefined

    let sti: number

    if (scene) {
        if (scene.type === "Scene") {
            setSTI()
        } else {
            console.warn(
                "SVELTHREE > Mesh : You have to provide a valid 'scene' prop of type 'Scene'!",
                { scene: scene }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    } else {
        console.warn("SVELTHREE > Mesh : You have to provide a {scene} prop!", {
            scene: scene
        })
        throw new Error("SVELTHREE Exception (see warning above)")
    }

    let interactive: boolean = undefined
    $: interactive = $svelthreeStores[sti].canvas.interactive

    let generate = false
    export let mesh: Mesh = undefined

    let object3DUtils: Object3DUtils
    let meshPropIterator: UniversalPropIterator
    let matPropIterator: UniversalPropIterator

    export let material: Material | Material[] = undefined
    export let geometry: Geometry | BufferGeometry = undefined

    mesh ? ((generate = false), onMeshProvided()) : (generate = true)

    function onMeshProvided(): void {
        // check if mesh is really a Mesh then do the rest
        if (mesh.type === "Mesh") {
            mesh.geometry ? (geometry = mesh.geometry) : null
            mesh.material
                ? (material = mesh.material)
                : console.warn(
                      "SVELTHREE > Mesh : Mesh provided, but has no material!",
                      { mesh: mesh }
                  )
            console.info("SVELTHREE > Mesh : Saved geometry:", {
                geometry: geometry
            })
            console.info("SVELTHREE > Mesh : Saved material:", {
                material: material
            })
            ;(mesh.userData.initScale = mesh.scale.x),
                (object3DUtils = new Object3DUtils(mesh))
            meshPropIterator = new UniversalPropIterator(mesh)
            material
                ? (matPropIterator = new UniversalPropIterator(material))
                : null
        }
    }

    /**
     * Determining parent immediately if mesh is available on initialization (generate false)
     */
    if (!generate) {
        if (!parent) {
            parentForSlot = mesh
        } else {
            if (parent !== mesh) {
                parentForUs = parent
                parentForSlot = mesh
            }
        }
    }

    /**
     * Determining if mesh has to be generated first, was not available on initialization (generate true)
     */
    // triggered as soon as mesh is generated
    $: mesh ? checkParentSlot() : null

    function checkParentSlot() {
        if (generate) {
            if (mesh && !parent) {
                //parent was not provided, means we are the root parent
                parentForSlot = mesh
            } else {
                if (!mesh) {
                    console.error(
                        "SVELTHREE > Mesh : 'parent' check : no mesh provided yet!"
                    )
                } else if (parent) {
                    //parent is already there, either it has been provided or set on mesh generation to the mesh itself
                    //means this parent was provided and we are child
                    if (parent !== mesh) {
                        //set self as parent for next slot
                        parentForUs = parent
                        parentForSlot = mesh
                    } else {
                        /* nothing */
                    }
                }
            }
        }
    }

    // reactive creating / recreating mesh
    $: geometry && generate
        ? (console.info("SVELTHREE > Mesh : Geometry provided!"),
          tryGeometryUpdate())
        : null

    $: material && generate
        ? (console.info("SVELTHREE > Mesh : Material provided!"),
          (matPropIterator = new UniversalPropIterator(material)),
          tryMaterialUpdate())
        : null

    // change geometry and material on provided mesh

    //we know mesh has geometry if geometry is available and !generate, it was referenced onMeshProvided()
    $: geometry && !generate
        ? geometry !== mesh.geometry
            ? tryGeometryUpdate()
            : null
        : null

    //we know mesh has material if material is available and !generate, it was referenced onMeshProvided()
    $: material && !generate
        ? material !== mesh.material
            ? tryMaterialUpdate()
            : null
        : null

    $: geometry && material && !mesh && generate
        ? ((mesh = new Mesh(geometry, material)),
          (mesh.name = name),
          (mesh.userData.initScale = mesh.scale.x),
          console.info("SVELTHREE > Mesh : " + geometry.type + " created!", {
              mesh: mesh
          }),
          console.info(
              "SVELTHREE > Mesh : saved 'geometry' (generated):",
              geometry
          ),
          console.info(
              "SVELTHREE > Mesh : saved 'material' (generated):",
              material
          ),
          (object3DUtils = new Object3DUtils(mesh)),
          (meshPropIterator = new UniversalPropIterator(mesh)))
        : null

    // This statement is being triggered on creation / recreation
    $: mesh
        ? tryAddingMesh()
        : console.error("SVELTHREE > Mesh : mesh was not created!")

    export let userData: { [key: string]: any } = undefined

    $: userData ? tryApplyUserData() : null

    function tryApplyUserData(): void {
        if (mesh) {
            mesh.userData = { ...mesh.userData, ...userData }
        }
    }

    // props
    // shorthand props can be set directly as props

    /**
     *  TOFIX : if even possible / needed: Don't like any, but what type to add if 'animation' (mutable) can be function or object?!
     * @see https://stackoverflow.com/questions/50371351/typescript-check-if-objects-property-is-a-function-with-given-signature
     * "It doesn't look like typeof type guards exist for function types"
     * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-3.html#improved-behavior-for-calling-union-types
     * @see https://stackoverflow.com/questions/14638990/are-strongly-typed-functions-as-parameters-possible-in-typescript
     * @see https://stackoverflow.com/questions/55385690/passing-function-as-parameter-in-typescript-expected-0-arguments-but-got-1-ts
     * @see https://basarat.gitbook.io/typescript/type-system/callable
     * Svelte's 'onMount' has also (fn: any) as argument!
     *  TODO  create own 'InternalAnimation' Type / Interface
     */

    export let animation: (
        obj: any,
        ...args: any[]
    ) => {
        onStart: () => void
        onDestroy: () => void
        onSceneDeactivated?: () => void
        onSceneReactivated?: () => void
    } = undefined

    export let mat: { [key: string]: any } = undefined
    export let pos: PropPos = undefined
    export let rot: PropRot = undefined
    export let scale: PropScale = undefined
    export let castShadow: boolean = undefined
    export let receiveShadow: boolean = undefined

    // TODO  Implement
    export let matrix: PropMatrix4 = undefined

    //props object can be filled with anything, ideally available THREE props of course.
    export let props: { [key: string]: any } = undefined

    //reactive updating props
    $: !matrix
        ? pos
            ? isValidArray3Prop(pos)
                ? object3DUtils.tryPosUpdate(pos)
                : null
            : null
        : null
    $: !matrix
        ? rot
            ? isValidArray3Prop(rot)
                ? object3DUtils.tryRotUpdate(rot)
                : null
            : null
        : null
    $: !matrix
        ? scale
            ? isValidArray3Prop(scale)
                ? (object3DUtils.tryScaleUpdate(scale),
                  (mesh.userData.initScale = mesh.scale.x))
                : null
            : null
        : null
    $: isValidMatrix4(matrix)
        ? (console.warn(
              "SVELTHREE > Mesh : Matrix provided, will ignore 'pos', 'rot' or 'scale' props if any provided!"
          ),
          tryMatrixUpdate())
        : null

    $: castShadow ? tryCastShadowUpdate() : null
    $: receiveShadow ? tryReceiveShadowUpdate() : null

    $: props
        ? Object.keys(props).length > 0
            ? meshPropIterator
                ? meshPropIterator.tryPropsUpdate(props)
                : null
            : null
        : null

    $: mat
        ? Object.keys(mat).length > 0
            ? matPropIterator
                ? (console.info(
                      "SVELTHREE > Mesh : matPropIterator is true: ",
                      mat
                  ),
                  matPropIterator.tryPropsUpdate(mat))
                : null
            : null
        : null

    // reactive animation handling (has to be enabled as last, so that initial animation state overrides props)

    let currentSceneActive = false

    $: currentSceneActive =
        $svelthreeStores[sti].scenes[scene.userData.indexInScenes].isActive

    let animationEnabled = false
    $: animation ? (animationEnabled = true) : null

    let interactionEnabled: boolean = undefined
    $: interactive && interact
        ? (interactionEnabled = true)
        : (interactionEnabled = false)

    // -----------------------------------

    export let fnOnMount: any = undefined

    onMount(
        fnOnMount
            ? () => fnOnMount(self)
            : () => {
                  if (parent) {
                      console.info(
                          "SVELTHREE > onMount : Mesh, parent: ",
                          parent
                      )
                  } else {
                      console.info("SVELTHREE > onMount : Mesh")
                  }

                  return () => {
                      console.info("SVELTHREE > onDestroy : Mesh")
                      removeMeshFromParent()
                  }
              }
    )

    function setSTI() {
        if (scene.userData.sti >= 0) {
            sti = scene.userData.sti
        } else {
            console.warn(
                "SVELTHREE > Mesh : Failed to set 'sti' from 'scene.userData.sti', 'sti' has to be >= 0!",
                {
                    scene: scene,
                    userData: scene.userData,
                    sti: scene.userData.sti
                }
            )
            throw new Error("SVELTHREE Exception (see warning above)")
        }
    }

    function tryAddingMesh(): void {
        if (!parentForUs) {
            if (mesh.parent !== scene) {
                scene.add(mesh)
                console.info(
                    "SVELTHREE > Mesh : " +
                        geometry.type +
                        " was added to scene!",
                    {
                        mesh: mesh,
                        scene: scene,
                        total: scene.children.length
                    }
                )
            }
        } else {
            if (mesh.parent !== parentForUs) {
                parentForUs.add(mesh)
                console.info(
                    "SVELTHREE > Mesh : " +
                        geometry.type +
                        " was added to parent!",
                    {
                        mesh: mesh,
                        parent: parentForUs,
                        scene: scene,
                        total: scene.children.length
                    }
                )
            }
        }
    }

    function tryMaterialUpdate(): void {
        mesh
            ? ((mesh.material = material),
              console.info("SVELTHREE > Mesh : Material updated!"),
              matPropIterator ? matPropIterator.tryPropsUpdate(mat) : null)
            : null
    }

    function tryGeometryUpdate(): void {
        mesh
            ? ((mesh.geometry = geometry),
              console.info("SVELTHREE > Mesh : Geometry updated!"))
            : null
    }

    function tryCastShadowUpdate(): void {
        mesh ? (mesh.castShadow = castShadow) : null
    }

    function tryReceiveShadowUpdate(): void {
        mesh ? (mesh.receiveShadow = receiveShadow) : null
    }

    // TODO  implement updating Matrix
    function tryMatrixUpdate(): void {
        console.error(
            "SVELTHREE > Mesh : updating Matrix is not yet implemented!"
        )
    }

    // --- Public methods ---

    export function removeMeshFromParent(): void {
        mesh.parent.remove(mesh)
    }

    export function getMesh(): Mesh {
        return mesh
    }

    export function getName(): string {
        return name
    }

    export function getScene(): Scene {
        return scene
    }

    // --- Animation related public methods ---

    export function getAnimation(): any {
        return ani.getAnimation()
    }

    export function startAni(): void {
        ani.startAni()
    }

    // ------- Interaction --------------

    export let onClick: (e?: CustomEvent) => void = undefined
    export let onPointerUp: (e?: CustomEvent) => void = undefined
    export let onPointerDown: (e?: CustomEvent) => void = undefined
    export let onPointerOver: (e?: CustomEvent) => void = undefined
    export let onPointerOut: (e?: CustomEvent) => void = undefined
    export let onPointerEnter: (e?: CustomEvent) => void = undefined
    export let onPointerLeave: (e?: CustomEvent) => void = undefined
    export let onPointerMove: (e?: CustomEvent) => void = undefined
</script>

<svelte:options accessors={true} />
<!-- cool!: we can override parent passed on init by setting parent here to something else! -->

<slot {scene} parent={parentForSlot}></slot>

<SvelthreeAnimation
    bind:this={ani}
    bind:currentSceneActive
    {animationEnabled}
    {animation}
    {aniauto}
    obj={mesh}
    {scene} />
    

<SvelthreeInteraction
    {sti}
    {dispatch}
    obj={mesh}
    parent={self}
    {interactionEnabled} />

