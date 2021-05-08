<!-- for usage with the modified Svelte version -->
<!-- <svelte:options accessors useAccMod accessorsAsync /> -->

<!--
@component
This is a **svelthree** _Mesh_ Component.
 TODO  Link to Docs.
-->
<script lang="ts">
	import { afterUpdate, beforeUpdate, createEventDispatcher, onMount } from "svelte"
	import { get_current_component } from "svelte/internal"
	import {
		BufferGeometry,
		Euler,
		Material,
		Matrix4,
		Mesh,
		Object3D,
		Quaternion,
		Scene,
		Vector3
	} from "three"
	import {
		SvelthreeAnimation,
		SvelthreeInteraction,
		SvelthreeInteractionAR,
		SvelthreeInteractionVRGrippable,
		SvelthreeInteractionVRHands
	} from "../components-internal"
	import { XRDefaults } from "../constants"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList, SvelthreeAnimationFunction } from "../types-extra"
	import { svelthreeStores } from "../stores"
	import { PropUtils, StoreUtils, SvelthreeProps } from "../utils"
	import type { XrSessionVRInputType } from "../xr/types-svelthree"

	const css_rs = "color: red;font-weight:bold;"
	const css_ba = "color: blue;font-weight:bold;"
	const css_aa = "color: green;font-weight:bold;"
	export let logInfo: boolean = false
	export let logRS: boolean = false
	export let logLC: boolean = false

	// SvelthreeAnimation Component's reference
	let ani: any

	const self = get_current_component()
	const dispatch = createEventDispatcher()

	// construction
	// SVELTE  IMPORTANT  the order of reactive statement checks inside `$$self.$$set` corresponds to the ORDER OF DECLARATION!

	export let scene: Scene
	export let name: string = undefined
	export let arReticle: boolean = false
	export let arReticleAuto: boolean = false
	export let parent: Object3D = undefined
	export let parentForSlot: Object3D = undefined
	export let parentForUs: Object3D = undefined

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto: boolean = undefined
	export let interact: boolean = undefined

	// interaction XR
	// pinch
	export let pinchRemote: boolean = undefined
	export let pinchTouch: boolean = undefined
	export let pinchHybrid: boolean = undefined

	export let xrHandTouch: boolean = undefined

	export function pinchRemoteEnabled(): boolean {
		return pinchRemote
	}

	export function pinchTouchEnabled(): boolean {
		return pinchTouch
	}

	export function pinchHybridEnabled(): boolean {
		return pinchHybrid
	}

	export function xrHandTouchEnabled(): boolean {
		return xrHandTouch
	}

	const sti: number = StoreUtils.getSTIfromScene(scene, "Mesh")

	let interactive: boolean = undefined
	$: interactive = $svelthreeStores[sti].canvas.interactive

	let generate = false
	export let mesh: Mesh = undefined

	export let material: Material | Material[] = undefined
	export let geometry: BufferGeometry = undefined

	if (mesh) {
		generate = false
		onMeshProvided()
	} else {
		generate = true
	}

	function onMeshProvided(): void {
		// check if mesh is really a Mesh then do the rest
		if (mesh.type === "Mesh") {
			if (mesh.geometry) {
				geometry = mesh.geometry
			}

			if (mesh.material) {
				material = mesh.material
			} else {
				console.warn("SVELTHREE > Mesh : Mesh provided, but has no material!", { mesh: mesh })
			}

			if (logInfo) console.info("SVELTHREE > Mesh : Saved geometry:", { geometry: geometry })
			if (logInfo) console.info("SVELTHREE > Mesh : Saved material:", { material: material })

			mesh.userData.initScale = mesh.scale.x
		}
	}

	// Determining parent immediately if mesh is available on initialization (generate false)
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

	// Determining if mesh has to be generated first, was not available on initialization (generate true)
	// triggered as soon as mesh is generated
	$: mesh ? checkParentSlot() : null

	function checkParentSlot() {
		if (generate) {
			if (mesh && !parent) {
				//parent was not provided, means we are the root parent
				parentForSlot = mesh
			} else {
				if (!mesh) {
					console.error("SVELTHREE > Mesh : 'parent' check : no mesh provided yet!")
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
	$: geometry && generate ? onGeometryProvided() : null

	function onGeometryProvided() {
		if (logInfo) console.info("SVELTHREE > Mesh : Geometry provided!")
		tryGeometryUpdate()
	}

	$: if (material && generate) {
		if (logInfo) console.info("SVELTHREE > Mesh : Material provided!")
		tryMaterialUpdate()
	}

	// change geometry and material on provided mesh

	// we know mesh has geometry if geometry is available and !generate, it was referenced onMeshProvided()
	$: geometry && !generate ? (geometry !== mesh.geometry ? tryGeometryUpdate() : null) : null

	// we know mesh has material if material is available and !generate, it was referenced onMeshProvided()
	$: material && !generate ? (material !== mesh.material ? tryMaterialUpdate() : null) : null

	$: if (geometry && material && !mesh && generate) {
		mesh = new Mesh(geometry, material)

		mesh.name = name
		mesh.userData.initScale = mesh.scale.x
		mesh.userData.svelthreeComponent = self

		if (logInfo) console.info("SVELTHREE > Mesh : " + geometry.type + " created!", { mesh: mesh })
		if (logInfo) console.info("SVELTHREE > Mesh : saved 'geometry' (generated):", geometry)
		if (logInfo) console.info("SVELTHREE > Mesh : saved 'material' (generated):", material)
	}

	// this statement is being triggered on creation / recreation
	$: mesh ? tryAddingMesh() : console.error("SVELTHREE > Mesh : mesh was not created!")

	export let userData: { [key: string]: any } = undefined

	$: userData ? tryApplyUserData() : null

	function tryApplyUserData(): void {
		if (mesh) {
			mesh.userData = { ...mesh.userData, ...userData }
		}
	}

	/*
     TODO `mat` shorthand attribute:

     Recommended (workaround / see below): Assign a typed object for correct code completion / list of available properties, for example:

     ```javascript
     const meshStdMatProps: MeshStandardMaterialParameters = { ... }
     <Mesh mat={meshStdMatProps} />
     ```
     It would be nice if we could get correct code completion of available properties based on the `material` attribute value / specified Material
     Unfortunately this doesn't seem to be possible atm due to [Svelte language-tools limitations](https://github.com/sveltejs/language-tools/issues/442). 🤔
     Any help / hints concerning this issue are very welcome! 👍
    */

	/** Shorthand attribute for specifying / mutating **Material properties**. */

	export let mau: boolean = undefined

	$: if (mesh) {
		mesh.matrixAutoUpdate = mau ? true : false
	}

	type MeshProps = OnlyWritableNonFunctionPropsPlus<
		Omit<Mesh, PropBlackList>,
		{
			position?: Vector3 | Parameters<Vector3["set"]>
			scale?: Vector3 | Parameters<Vector3["set"]>
			rotation?:
				| Euler
				| Parameters<Euler["set"]>
				| Quaternion
				| Parameters<Quaternion["set"]>
				| Vector3
				| Parameters<Vector3["set"]>
			quaternion?: Quaternion | Parameters<Quaternion["set"]>
			matrix?: Matrix4 | Parameters<Matrix4["set"]>
		}
	>

	/** `props` shorthand attribute. ☝️ Other shorthand attributes like `pos`, `rot`, `scale` etc. will override corresponding properties inside the `props` object, try to avoid this!*/
	export let props: { [P in keyof MeshProps]: MeshProps[P] } = undefined

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	export let quat: Quaternion | Parameters<Quaternion["set"]> = undefined
	export let scale: Vector3 | Parameters<Vector3["set"]> = undefined

	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined

	/**
	 * ☝️ `matrix` shorthand attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` shorthand attributes!
	 */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	export let castShadow: boolean = undefined
	export let receiveShadow: boolean = undefined

	let sMat: SvelthreeProps
	$: !sMat && material ? (sMat = new SvelthreeProps(material)) : null
	export let mat: { [key: string]: any } = undefined
	$: mat && sMat ? sMat.update(mat) : null

	// reactive updating props

	interface BufferGeometryWithBVH extends BufferGeometry {
		computeBoundsTree: any
		disposeBoundsTree: any
		boundsTree: any
	}

	let useBVH: boolean = false
	$: useBVH = $svelthreeStores[sti].useBVH

	// compute / recompute BVH
	$: if (useBVH && geometry) {
		console.log("%c--------> Mesh > reactive statement! useBVH && geometry", `${css_rs}`, useBVH, geometry)

		// use BVH if enabled
		// if($svelthreeStores[sti].useBVH) {
		// Using pre-made functions, see https://github.com/gkjohnson/three-mesh-bvh
		console.warn("SVELTHREE > Mesh : (BVH) Using BVH!")

		if (Object.keys(BufferGeometry.prototype).indexOf("computeBoundsTree") > -1) {
			if (logInfo) console.info("SVELTHREE > Mesh : Using BVH, mesh.matrixWorld: ", mesh.matrixWorld)

			// TOFIX  TODO  BVH needs more love and documentation!
			// do we nee to something with the geometry here?! (below was uncommented before, but it broke tryMatrixWorldUpdate --> double transformation )
			// mesh.geometry.applyMatrix4(mesh.worldMatrix)

			const geom: BufferGeometryWithBVH = mesh.geometry as BufferGeometryWithBVH
			geom.computeBoundsTree()
			if (logInfo) console.info("SVELTHREE > Mesh : (BVH) computeBoundsTree finished, mesh: ", mesh)
		} else {
			console.error("SVELTHREE > Mesh : (BVH) mesh.geometry.computeBoundsTree not available!")
		}
		//}

		// use BVH per default, if object is interactive and touchable, even if useBVH is not enabled
		// BVH is being enabled globally (Canvas / store)
		/*
                if(interact && xrHandTouch && !useBVH) {

                }
                */
	} else {
		if (mesh.geometry.hasOwnProperty("boundsTree")) {
			if (logInfo) console.info("SVELTHREE > Mesh : (BVH) try disposing boundsTree!", mesh)
			if (mesh.geometry.hasOwnProperty("disposeBoundsTree")) {
				const geom: BufferGeometryWithBVH = mesh.geometry as BufferGeometryWithBVH
				geom.disposeBoundsTree()
				if (logInfo) console.info("SVELTHREE > Mesh : (BVH) boundsTree disposed!", mesh)
			} else {
				console.error("SVELTHREE > Mesh : (BVH) mesh.geometry.disposeBoundsTree not available!")
			}
		}
	}

	// IMPORTANT  `props` will be overridden by shorthand attributes!
	let sProps: SvelthreeProps
	$: !sProps && mesh && props ? (sProps = new SvelthreeProps(mesh)) : null
	//$: props && sProps ? sProps.update(props) : null
	$: props && sProps ? updateProps() : null

	function updateProps() {
		if (logRS) console.log("%c--------> Mesh > reactive statement! props", `${css_rs}`, props)
		sProps.update(props)
	}

	$: mesh.castShadow = castShadow ? true : false
	$: mesh.receiveShadow = receiveShadow ? true : false

	//#region --- 'Object3D' Specific Code

	// PERFORMANCE  FAST  This approach is about 25% faster than using a SvelthreeObject3D component!
	/* PERFORMANCE  FASTER  Setting props directly via PropUtils seems to be a bit faster, since
    we're bypassing the Propeller. The performance gain is not very significant, but it makes more sense,
    because we KNOW these properties are available on the Mesh. Type checking happens in PropUtils.
    The Propeller was meant to be used with the 'props' attribute.
    */
	// Skipping Propeller completely (we KNOW mesh has these properties).
	// Value Type is being checked in PropUtils.

	const w_sh = PropUtils.getShortHandAttrWarnings("SVELTHREE > Mesh >")
	const wrn = PropUtils.warn

	// IMPORTANT  shorthand attributes will override `props` attribute!
	//$: !matrix && mesh && pos ? PropUtils.setPositionFromValue(mesh, pos) : pos && mesh ? wrn(w_sh.pos) : null

	$: !matrix && mesh && pos ? setPositionFromValue() : pos && mesh ? wrn(w_sh.pos) : null

	function setPositionFromValue() {
		if (logRS) console.log("%c--------> Mesh > reactive statement! pos", `${css_rs}`, pos)
		PropUtils.setPositionFromValue(mesh, pos)
	}

	//$: !matrix && !quat && mesh && rot ? PropUtils.setRotationFromValue(mesh, rot) : rot && mesh ? wrn(w_sh.rot) : null
	$: !matrix && !quat && mesh && rot ? setRotationFromValue() : rot && mesh ? wrn(w_sh.rot) : null

	function setRotationFromValue() {
		if (logRS) console.log("%c--------> Mesh > reactive statement! rot", `${css_rs}`, rot)
		PropUtils.setRotationFromValue(mesh, rot)
	}

	//$: !matrix && !quat && mesh && rot ? PropUtils.setRot(mesh, rot) : rot && mesh ? wrn(w_sh.rot) : null

	// PERFORMANCE  IMPORTANT  NOT BOTTLENECK --> doin this directly like this doesn't significantly improve performance!
	/*
    $: if(!matrix && !quat && mesh && rot) {
        mesh.rotation.set(rot[0], rot[1], rot[2])
        mesh.matrixAutoUpdate = true
        mesh.matrixWorldNeedsUpdate = true
    }
    */

	//$: !matrix && mesh && quat ? PropUtils.setQuaternionFromValue(mesh, quat) : quat && mesh ? wrn(w_sh.quat) : null
	$: !matrix && mesh && quat ? setQuaternionFromValue() : quat && mesh ? wrn(w_sh.quat) : null

	function setQuaternionFromValue() {
		if (logRS) console.log("%c--------> Mesh > reactive statement! quat", `${css_rs}`, quat)
		PropUtils.setQuaternionFromValue(mesh, quat)
	}

	//$: !matrix && mesh && scale ? PropUtils.setScaleFromValue(mesh, scale) : scale && mesh ? wrn(w_sh.scale) : null
	$: !matrix && mesh && scale ? setScaleFromValue() : scale && mesh ? wrn(w_sh.scale) : null

	function setScaleFromValue() {
		if (logRS) console.log("%c--------> Mesh > reactive statement! scale", `${css_rs}`, scale)
		PropUtils.setScaleFromValue(mesh, scale)
	}

	// TODO  LookAt HAS TO BE CALLED AS LAST! --> CHECK ORDER IN COMPILED BUNDLE!!!
	// see `$$self.$$set`
	/* Ok,  IMPORTANT  the order of reactive statements inside `$$self.$$set` corresponds to the order of DECLARATION,
    so why this was working is because we're currently calling `updateMatrix` on every `PropUtils` change
    */

	//$: !matrix && mesh && lookAt ? PropUtils.setLookAtFromValue(mesh, lookAt) : lookAt && mesh ? wrn(w_sh.lookAt) : null
	$: !matrix && mesh && lookAt ? setLookAtFromValue() : lookAt && mesh ? wrn(w_sh.lookAt) : null

	function setLookAtFromValue() {
		if (logRS) console.log("%c--------> Mesh > reactive statement! lookAt", `${css_rs}`, lookAt)
		PropUtils.setLookAtFromValue(mesh, lookAt)
	}

	//$: matrix && mesh ? PropUtils.setMatrixFromValue(mesh, matrix) : null
	$: matrix && mesh ? setMatrixFromValue() : null

	function setMatrixFromValue() {
		if (logRS) console.log("%c--------> Mesh > reactive statement! matrix", `${css_rs}`, matrix)
		PropUtils.setMatrixFromValue(mesh, matrix)
	}

	//#endregion

	// reactive animation handling (has to be enabled as last, so that initial animation state overrides props)

	let currentSceneActive = false
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.indexInScenes]?.isActive

	let animationEnabled = false
	$: animation ? (animationEnabled = true) : null

	let interactionEnabled: boolean = undefined
	$: interactive && interact ? (interactionEnabled = true) : (interactionEnabled = false)

	// -----------------------------------

	export let fnOnMount: any = undefined

	onMount(
		fnOnMount
			? () => fnOnMount(self)
			: () => {
					if (parent) {
						if (logInfo) console.info("SVELTHREE > onMount : Mesh, parent: ", parent)
					} else {
						if (logInfo) console.info("SVELTHREE > onMount : Mesh")
					}

					if (logLC) logCurrentState(`----> Mesh > onMount`, null)

					//console.warn("SVELTHREE > onMount : Mesh : mesh.matrixAutoUpdate", mesh.matrixAutoUpdate)

					return () => {
						if (logInfo) console.info("SVELTHREE > onDestroy : Mesh")
						removeMeshFromParent()
					}
			  }
	)

	let updateTime
	let timeBefore
	let timeAfter
	let dirty = false

	// TODO  CONFIRM: Reactive statements cause "beforeUpdate" but they don't end in "afterUpdate" (except the prop has been reassigned, then afterUpdate will be triggered)
	// Nevertheless they are microtasks the scene waits for in order to trigger an "afterUpdate"
	// Check once again and cinfirm bulletproof / write down!!!
	beforeUpdate(async () => {
		if (!dirty) {
			timeBefore = performance.now()
			dirty = true
		}
		if (logLC) logCurrentState("%c------> Mesh > beforeUpdate", css_ba)
		//if(name) { console.warn(`Mesh before update! ${name}`) }
		//await tick()
		if (mesh.matrixWorldNeedsUpdate === false) {
			mesh.matrixAutoUpdate = mau
		}

		//meshDirty = false
		//if(name) { console.warn(`Mesh before update! ${name} ----> >>> AFTER tick()!`) }
	})

	// PERFORMANCE  IMPORTANT  NOT BOTTLENECK --> commenting out doesn't significantly improve performance

	afterUpdate(() => {
		if (dirty) {
			timeAfter = performance.now()
			dirty = false
			updateTime = timeAfter - timeBefore
		}
		if (logLC) logCurrentState("%c------> Mesh > afterUpdate", css_aa, updateTime)

		//  BUG  IMPORTANT  this tick halts everything / causes crash!
		//await tick()
		//if(name) { console.warn(`Mesh after update! ${name}`) }

		/*
        if(meshDirty) {
            meshDirty = false
            if(name) { console.warn(`Mesh after update! ${name}`) }
            if (mesh.matrixWorldNeedsUpdate === false) {
                mesh.matrixAutoUpdate = mau
            }
        }
        */
	})

	function logCurrentState(prefix: string, css: string, upt?: number) {
		if (self) {
			console.log(
				`${prefix}!`,
				`${css}`,
				upt ? "update time: " + upt : "",
				` pos:`,
				self.$capture_state()["pos"],
				` rot:`,
				self.$capture_state()["rot"],
				` quat:`,
				self.$capture_state()["quat"],
				` scale:`,
				self.$capture_state()["scale"],
				` lookAt:`,
				self.$capture_state()["lookAt"],
				` matrix:`,
				self.$capture_state()["matrix"],
				` props:`,
				self.$capture_state()["props"]
			)
		} else {
			console.log(`${prefix}! self not available!`)
		}
	}

	function tryAddingMesh(): void {
		if (!parentForUs) {
			if (mesh.parent !== scene) {
				scene.add(mesh)
				if (logInfo)
					console.info("SVELTHREE > Mesh : " + geometry.type + " was added to scene!", {
						mesh: mesh,
						scene: scene,
						total: scene.children.length
					})

				if (arReticle || arReticleAuto) {
					$svelthreeStores[sti].xr.reticle = mesh
				}
			}
		} else {
			if (mesh.parent !== parentForUs) {
				parentForUs.add(mesh)
				if (logInfo)
					console.info("SVELTHREE > Mesh : " + geometry.type + " was added to parent!", {
						mesh: mesh,
						parent: parentForUs,
						scene: scene,
						total: scene.children.length
					})
				if (arReticle || arReticleAuto) {
					$svelthreeStores[sti].xr.reticle = mesh
				}
			}
		}
	}

	function tryMaterialUpdate(): void {
		if (mesh) {
			mesh.material = material
			if (logInfo) console.info("SVELTHREE > Mesh : Material updated!")
			/*
            if (mat && Object.keys(mat).length > 0) {
                Propeller.update(material, mat)
            }
            */
			forceMatUpdate()
		}
	}

	function forceMatUpdate(): void {
		if (sMat && mat) sMat.update(mat)
	}

	function tryGeometryUpdate(): void {
		mesh.geometry = geometry as BufferGeometry
		if (logInfo) console.info("SVELTHREE > Mesh : Geometry updated!")
	}

	// --- AR Reticle basic auto display and positioning -------

	$: if (arReticle || arReticleAuto) {
		if ($svelthreeStores[sti].xr.hitTestResults) {
			handleHitTestResults()
		}
	}

	function handleHitTestResults() {
		if ($svelthreeStores[sti].xr.hitTestResults.length > 0) {
			let hit = $svelthreeStores[sti].xr.hitTestResults[0]
			let referenceSpace = $svelthreeStores[sti].renderer.xr.getReferenceSpace()

			//console.log({ hit: hit, referenceSpace: referenceSpace })

			if ($svelthreeStores[sti].xr.reticle) {
				if (arReticleAuto) {
					showReticle()
					poseReticle(hit, referenceSpace)
				}

				dispatch("hit", {
					reticle: mesh,
					hitPose: hit.getPose(referenceSpace).transform.matrix
				})
			}
		} else {
			if ($svelthreeStores[sti].xr.reticle) {
				if (arReticleAuto) {
					if ($svelthreeStores[sti].xr.reticle.visible) {
						hideReticle()
					}
				}

				dispatch("nohit", {
					reticle: mesh
				})
			}
		}
	}

	function showReticle(): void {
		mesh.visible = true
	}

	function hideReticle(): void {
		mesh.visible = false
	}

	function poseReticle(hit: any = undefined, referenceSpace: any = undefined): void {
		if (logInfo) console.info("poseReticle!", $svelthreeStores[sti].xr.reticle)
		mesh.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix)
	}

	// public methods

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

	// animation related public methods

	export function getAnimation(): any {
		return ani.getAnimation()
	}

	export function startAni(): void {
		ani.startAni()
	}

	// interaction

	type MeshInteractionHandler = (e?: CustomEvent) => void

	export let onClick: MeshInteractionHandler = undefined
	export let onPointerUp: MeshInteractionHandler = undefined
	export let onPointerDown: MeshInteractionHandler = undefined
	export let onPointerOver: MeshInteractionHandler = undefined
	export let onPointerOut: MeshInteractionHandler = undefined
	export let onPointerEnter: MeshInteractionHandler = undefined
	export let onPointerLeave: MeshInteractionHandler = undefined
	export let onPointerMove: MeshInteractionHandler = undefined

	// XR

	let currentXRSessionMode: string = undefined
	$: currentXRSessionMode = $svelthreeStores[sti].xr.sessionMode

	let currentXRInputType: XrSessionVRInputType = undefined
	$: currentXRInputType = $svelthreeStores[sti].xr.currentVRInputType

	// controller
	export let onSelect: MeshInteractionHandler = undefined
	export let onSelectStart: MeshInteractionHandler = undefined
	export let onSelectEnd: MeshInteractionHandler = undefined
	export let onSqueeze: MeshInteractionHandler = undefined
	export let onSqueezeStart: MeshInteractionHandler = undefined
	export let onSqueezeEnd: MeshInteractionHandler = undefined

	// hands
	export let onPinchStart: MeshInteractionHandler = undefined
	export let onPinchEnd: MeshInteractionHandler = undefined
	export let onPinchRemoteStart: MeshInteractionHandler = undefined
	export let onPinchRemoteEnd: MeshInteractionHandler = undefined
	export let onPinchTouchStart: MeshInteractionHandler = undefined
	export let onPinchTouchEnd: MeshInteractionHandler = undefined
</script>

<!-- DEPRECATED  PERFORMANCE  SLOW : Lower performance over putting reactive statements directly inside the <script>-tag.
     IMPORTANT  using svelte child-components has significant performance impact, especially with a lot of objects + especially
     if a lot of props are being just passed to them, since these child-components also run through the complete svelte
     update-process on every parent-component update.

    <SvelthreeObject3D obj={mesh} {matrixAutoUpdate} {pos} {rot} {quat} {scale} {lookAt} {matrix} />
-->

<!-- <SvelthreeProps2 {props} obj={mesh} /> -->

<!-- cool!: we can override parent passed on init by setting parent here to something else! -->
<slot {scene} parent={parentForSlot} />

<!-- PERFORMANCE  IMPORTANT  these components are not Bottleneck! -->
<!-- TODO  get rid of the SvelthreeAnimation component / create a ts class -->
{#if animation}
	<SvelthreeAnimation
		bind:this={ani}
		bind:currentSceneActive
		{animationEnabled}
		{animation}
		{aniauto}
		obj={mesh}
		{scene} />
{/if}

{#if $svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr.enabled === false}
	<SvelthreeInteraction {sti} {dispatch} obj={mesh} parent={self} {interactionEnabled} />
{/if}

{#if $svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr.enabled === true}
	{#if currentXRSessionMode === XRDefaults.SESSION_MODE_AR}
		<SvelthreeInteractionAR {sti} {dispatch} obj={mesh} parent={self} {interactionEnabled} />
	{/if}

	{#if currentXRSessionMode === XRDefaults.SESSION_MODE_VR}
		{#if currentXRInputType === XRDefaults.VR_INPUT_TYPE_GRIPPABLE}
			<SvelthreeInteractionVRGrippable {sti} {dispatch} obj={mesh} parent={self} {interactionEnabled} />
		{/if}
		{#if currentXRInputType === XRDefaults.VR_INPUT_TYPE_HAND}
			<!-- TODO  get rid of the SvelthreeInteractionVRHands component / create a ts class -->
			<SvelthreeInteractionVRHands
				{sti}
				{dispatch}
				obj={mesh}
				parent={self}
				{interactionEnabled}
				{pinchRemote}
				{pinchTouch}
				{pinchHybrid}
				{xrHandTouch} />
		{/if}
	{/if}
{/if}
