<script lang="ts">
	import { afterUpdate, beforeUpdate, createEventDispatcher, onMount } from "svelte"
	import { get_current_component } from "svelte/internal"
	import {
		BufferGeometry,
		Euler,
		Material,
		Matrix4,
		Points,
		PointsMaterial,
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

	const sti: number = StoreUtils.getSTIfromScene(scene, "Points")

	let interactive: boolean = undefined
	$: interactive = $svelthreeStores[sti].canvas.interactive

	let generate = false
	export let points: Points = undefined

	export let material: Material | Material[] | PointsMaterial = undefined
	export let geometry: BufferGeometry = undefined

	if (points) {
		generate = false
		onPointsProvided()
	} else {
		generate = true
	}

	function onPointsProvided(): void {
		// check if points is really a Points then do the rest
		if (points.type === "Points") {
			if (points.geometry) {
				geometry = points.geometry
			}

			if (points.material) {
				material = points.material
			} else {
				console.warn("SVELTHREE > Points : Points provided, but has no material!", { points: points })
			}

			if (logInfo)
				console.info("SVELTHREE > Points : Saved geometry:", {
					geometry: geometry
				})
			if (logInfo)
				console.info("SVELTHREE > Points : Saved material:", {
					material: material
				})

			points.userData.initScale = points.scale.x
		}
	}

	// Determining parent immediately if points is available on initialization (generate false)
	if (!generate) {
		if (!parent) {
			parentForSlot = points
		} else {
			if (parent !== points) {
				parentForUs = parent
				parentForSlot = points
			}
		}
	}

	// Determining if points has to be generated first, was not available on initialization (generate true)
	// triggered as soon as points is generated
	$: points ? checkParentSlot() : null

	function checkParentSlot() {
		if (generate) {
			if (points && !parent) {
				//parent was not provided, means we are the root parent
				parentForSlot = points
			} else {
				if (!points) {
					console.error("SVELTHREE > Points : 'parent' check : no points provided yet!")
				} else if (parent) {
					//parent is already there, either it has been provided or set on points generation to the points itself
					//means this parent was provided and we are child
					if (parent !== points) {
						//set self as parent for next slot
						parentForUs = parent
						parentForSlot = points
					} else {
						/* nothing */
					}
				}
			}
		}
	}

	// reactive creating / recreating points
	$: geometry && generate ? onGeometryProvided() : null

	function onGeometryProvided() {
		if (logInfo) console.info("SVELTHREE > Points : Geometry provided!")
		tryGeometryUpdate()
	}

	$: if (material && generate) {
		if (logInfo) console.info("SVELTHREE > Points : Material provided!")
		tryMaterialUpdate()
	}

	// change geometry and material on provided points

	// we know points has geometry if geometry is available and !generate, it was referenced onPointsProvided()
	$: geometry && !generate ? (geometry !== points.geometry ? tryGeometryUpdate() : null) : null

	// we know points has material if material is available and !generate, it was referenced onPointsProvided()
	$: material && !generate ? (material !== points.material ? tryMaterialUpdate() : null) : null

	$: if (geometry && material && !points && generate) {
		points = new Points(geometry, material)

		points.name = name
		points.userData.initScale = points.scale.x
		points.userData.svelthreeComponent = self

		if (logInfo)
			console.info("SVELTHREE > Points : " + geometry.type + " created!", {
				points: points
			})
		if (logInfo) console.info("SVELTHREE > Points : saved 'geometry' (generated):", geometry)
		if (logInfo) console.info("SVELTHREE > Points : saved 'material' (generated):", material)
	}

	// this statement is being triggered on creation / recreation
	$: points ? tryAddingPoints() : console.error("SVELTHREE > Points : points was not created!")

	export let userData: { [key: string]: any } = undefined

	$: userData ? tryApplyUserData() : null

	function tryApplyUserData(): void {
		if (points) {
			points.userData = { ...points.userData, ...userData }
		}
	}

	/*
     TODO `mat` shorthand attribute:

     Recommended (workaround / see below): Assign a typed object for correct code completion / list of available properties, for example:

     ```javascript
     const pointsStdMatProps: PointsStandardMaterialParameters = { ... }
     <Points mat={pointsStdMatProps} />
     ```
     It would be nice if we could get correct code completion of available properties based on the `material` attribute value / specified Material
     Unfortunately this doesn't seem to be possible atm due to [Svelte language-tools limitations](https://github.com/sveltejs/language-tools/issues/442). 🤔
     Any help / hints concerning this issue are very welcome! 👍
    */

	/** Shorthand attribute for specifying / mutating **Material properties**. */

	export let mau: boolean = undefined

	$: if (points) {
		points.matrixAutoUpdate = mau ? true : false
	}

	type PointsProps = OnlyWritableNonFunctionPropsPlus<
		Omit<Points, PropBlackList>,
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
	export let props: { [P in keyof PointsProps]: PointsProps[P] } = undefined

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
		console.log("%c--------> Points > reactive statement! useBVH && geometry", `${css_rs}`, useBVH, geometry)

		console.warn("SVELTHREE > Points : (BVH) Using BVH!")

		if (Object.keys(BufferGeometry.prototype).indexOf("computeBoundsTree") > -1) {
			if (logInfo) console.info("SVELTHREE > Points : Using BVH, points.matrixWorld: ", points.matrixWorld)

			// TOFIX  TODO  BVH needs more love and documentation!
			// do we nee to something with the geometry here?! (below was uncommented before, but it broke tryMatrixWorldUpdate --> double transformation )
			// points.geometry.applyMatrix4(points.worldMatrix)

			const geom: BufferGeometryWithBVH = points.geometry as BufferGeometryWithBVH
			geom.computeBoundsTree()
			if (logInfo) console.info("SVELTHREE > Points : (BVH) computeBoundsTree finished, points: ", points)
		} else {
			console.error("SVELTHREE > Points : (BVH) points.geometry.computeBoundsTree not available!")
		}
		//}

		// use BVH per default, if object is interactive and touchable, even if useBVH is not enabled
		// BVH is being enabled globally (Canvas / store)
		/*
                if(interact && xrHandTouch && !useBVH) {

                }
                */
	} else {
		if (points.geometry.hasOwnProperty("boundsTree")) {
			if (logInfo) console.info("SVELTHREE > Points : (BVH) try disposing boundsTree!", points)
			if (points.geometry.hasOwnProperty("disposeBoundsTree")) {
				const geom: BufferGeometryWithBVH = points.geometry as BufferGeometryWithBVH
				geom.disposeBoundsTree()
				if (logInfo) console.info("SVELTHREE > Points : (BVH) boundsTree disposed!", points)
			} else {
				console.error("SVELTHREE > Points : (BVH) points.geometry.disposeBoundsTree not available!")
			}
		}
	}

	// IMPORTANT  `props` will be overridden by shorthand attributes!
	let sProps: SvelthreeProps
	$: !sProps && points && props ? (sProps = new SvelthreeProps(points)) : null
	//$: props && sProps ? sProps.update(props) : null
	$: props && sProps ? updateProps() : null

	function updateProps() {
		if (logRS) console.log("%c--------> Points > reactive statement! props", `${css_rs}`, props)
		sProps.update(props)
	}

	$: points.castShadow = castShadow ? true : false
	$: points.receiveShadow = receiveShadow ? true : false

	//#region --- 'Object3D' Specific Code

	// PERFORMANCE  FAST  This approach is about 25% faster than using a SvelthreeObject3D component!
	/* PERFORMANCE  FASTER  Setting props directly via PropUtils seems to be a bit faster, since
    we're bypassing the Propeller. The performance gain is not very significant, but it makes more sense,
    because we KNOW these properties are available on the Points. Type checking happens in PropUtils.
    The Propeller was meant to be used with the 'props' attribute.
    */
	// Skipping Propeller completely (we KNOW points has these properties).
	// Value Type is being checked in PropUtils.

	const w_sh = PropUtils.getShortHandAttrWarnings("SVELTHREE > Points >")
	const wrn = PropUtils.warn

	// IMPORTANT  shorthand attributes will override `props` attribute!
	//$: !matrix && points && pos ? PropUtils.setPositionFromValue(points, pos) : pos && points ? wrn(w_sh.pos) : null

	$: !matrix && points && pos ? setPositionFromValue() : pos && points ? wrn(w_sh.pos) : null

	function setPositionFromValue() {
		if (logRS) console.log("%c--------> Points > reactive statement! pos", `${css_rs}`, pos)
		PropUtils.setPositionFromValue(points, pos)
	}

	//$: !matrix && !quat && points && rot ? PropUtils.setRotationFromValue(points, rot) : rot && points ? wrn(w_sh.rot) : null
	$: !matrix && !quat && points && rot ? setRotationFromValue() : rot && points ? wrn(w_sh.rot) : null

	function setRotationFromValue() {
		if (logRS) console.log("%c--------> Points > reactive statement! rot", `${css_rs}`, rot)
		PropUtils.setRotationFromValue(points, rot)
	}

	//$: !matrix && !quat && points && rot ? PropUtils.setRot(points, rot) : rot && points ? wrn(w_sh.rot) : null

	// PERFORMANCE  IMPORTANT  NOT BOTTLENECK --> doin this directly like this doesn't significantly improve performance!
	/*
    $: if(!matrix && !quat && points && rot) {
        points.rotation.set(rot[0], rot[1], rot[2])
        points.matrixAutoUpdate = true
        points.matrixWorldNeedsUpdate = true
    }
    */

	//$: !matrix && points && quat ? PropUtils.setQuaternionFromValue(points, quat) : quat && points ? wrn(w_sh.quat) : null
	$: !matrix && points && quat ? setQuaternionFromValue() : quat && points ? wrn(w_sh.quat) : null

	function setQuaternionFromValue() {
		if (logRS) console.log("%c--------> Points > reactive statement! quat", `${css_rs}`, quat)
		PropUtils.setQuaternionFromValue(points, quat)
	}

	//$: !matrix && points && scale ? PropUtils.setScaleFromValue(mepointssh, scale) : scale && points ? wrn(w_sh.scale) : null
	$: !matrix && points && scale ? setScaleFromValue() : scale && points ? wrn(w_sh.scale) : null

	function setScaleFromValue() {
		if (logRS) console.log("%c--------> Points > reactive statement! scale", `${css_rs}`, scale)
		PropUtils.setScaleFromValue(points, scale)
	}

	// TODO  LookAt HAS TO BE CALLED AS LAST! --> CHECK ORDER IN COMPILED BUNDLE!!!
	// see `$$self.$$set`
	/* Ok,  IMPORTANT  the order of reactive statements inside `$$self.$$set` corresponds to the order of DECLARATION,
    so why this was working is because we're currently calling `updateMatrix` on every `PropUtils` change
    */

	//$: !matrix && points && lookAt ? PropUtils.setLookAtFromValue(points, lookAt) : lookAt && points ? wrn(w_sh.lookAt) : null
	$: !matrix && points && lookAt ? setLookAtFromValue() : lookAt && points ? wrn(w_sh.lookAt) : null

	function setLookAtFromValue() {
		if (logRS) console.log("%c--------> Points > reactive statement! lookAt", `${css_rs}`, lookAt)
		PropUtils.setLookAtFromValue(points, lookAt)
	}

	//$: matrix && points ? PropUtils.setMatrixFromValue(points, matrix) : null
	$: matrix && points ? setMatrixFromValue() : null

	function setMatrixFromValue() {
		if (logRS) console.log("%c--------> Points > reactive statement! matrix", `${css_rs}`, matrix)
		PropUtils.setMatrixFromValue(points, matrix)
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
						if (logInfo) console.info("SVELTHREE > onMount : Points, parent: ", parent)
					} else {
						if (logInfo) console.info("SVELTHREE > onMount : Points")
					}

					if (logLC) logCurrentState(`----> Points > onMount`, null)

					//console.warn("SVELTHREE > onMount : Points : points.matrixAutoUpdate", points.matrixAutoUpdate)

					return () => {
						if (logInfo) console.info("SVELTHREE > onDestroy : Points")
						removePointsFromParent()
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
		if (logLC) logCurrentState("%c------> Points > beforeUpdate", css_ba)
		//if(name) { console.warn(`Points before update! ${name}`) }
		//await tick()
		if (points.matrixWorldNeedsUpdate === false) {
			points.matrixAutoUpdate = mau
		}

		//pointsDirty = false
		//if(name) { console.warn(`Points before update! ${name} ----> >>> AFTER tick()!`) }
	})

	// PERFORMANCE  IMPORTANT  NOT BOTTLENECK --> commenting out doesn't significantly improve performance

	afterUpdate(() => {
		if (dirty) {
			timeAfter = performance.now()
			dirty = false
			updateTime = timeAfter - timeBefore
		}
		if (logLC) logCurrentState("%c------> Points > afterUpdate", css_aa, updateTime)

		//  BUG  IMPORTANT  this tick halts everything / causes crash!
		//await tick()
		//if(name) { console.warn(`Points after update! ${name}`) }

		/*
        if(pointsDirty) {
            pointsDirty = false
            if(name) { console.warn(`Points after update! ${name}`) }
            if (points.matrixWorldNeedsUpdate === false) {
                points.matrixAutoUpdate = mau
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

	function tryAddingPoints(): void {
		if (!parentForUs) {
			if (points.parent !== scene) {
				scene.add(points)
				if (logInfo)
					console.info("SVELTHREE > Points : " + geometry.type + " was added to scene!", {
						points: points,
						scene: scene,
						total: scene.children.length
					})

				if (arReticle || arReticleAuto) {
					$svelthreeStores[sti].xr.reticle = points
				}
			}
		} else {
			if (points.parent !== parentForUs) {
				parentForUs.add(points)
				if (logInfo)
					console.info("SVELTHREE > Points : " + geometry.type + " was added to parent!", {
						points: points,
						parent: parentForUs,
						scene: scene,
						total: scene.children.length
					})
				if (arReticle || arReticleAuto) {
					$svelthreeStores[sti].xr.reticle = points
				}
			}
		}
	}

	function tryMaterialUpdate(): void {
		if (points) {
			points.material = material
			if (logInfo) console.info("SVELTHREE > Points : Material updated!")
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
		points.geometry = geometry as BufferGeometry
		if (logInfo) console.info("SVELTHREE > Points : Geometry updated!")
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
					reticle: points,
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
					reticle: points
				})
			}
		}
	}

	function showReticle(): void {
		points.visible = true
	}

	function hideReticle(): void {
		points.visible = false
	}

	function poseReticle(hit: any = undefined, referenceSpace: any = undefined): void {
		if (logInfo) console.info("poseReticle!", $svelthreeStores[sti].xr.reticle)
		points.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix)
	}

	// public methods

	export function removePointsFromParent(): void {
		points.parent.remove(points)
	}

	export function getPoints(): Points {
		return points
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

	type PointsInteractionHandler = (e?: CustomEvent) => void

	export let onClick: PointsInteractionHandler = undefined
	export let onPointerUp: PointsInteractionHandler = undefined
	export let onPointerDown: PointsInteractionHandler = undefined
	export let onPointerOver: PointsInteractionHandler = undefined
	export let onPointerOut: PointsInteractionHandler = undefined
	export let onPointerEnter: PointsInteractionHandler = undefined
	export let onPointerLeave: PointsInteractionHandler = undefined
	export let onPointerMove: PointsInteractionHandler = undefined

	// XR

	let currentXRSessionMode: string = undefined
	$: currentXRSessionMode = $svelthreeStores[sti].xr.sessionMode

	let currentXRInputType: XrSessionVRInputType = undefined
	$: currentXRInputType = $svelthreeStores[sti].xr.currentVRInputType

	// controller
	export let onSelect: PointsInteractionHandler = undefined
	export let onSelectStart: PointsInteractionHandler = undefined
	export let onSelectEnd: PointsInteractionHandler = undefined
	export let onSqueeze: PointsInteractionHandler = undefined
	export let onSqueezeStart: PointsInteractionHandler = undefined
	export let onSqueezeEnd: PointsInteractionHandler = undefined

	// hands
	export let onPinchStart: PointsInteractionHandler = undefined
	export let onPinchEnd: PointsInteractionHandler = undefined
	export let onPinchRemoteStart: PointsInteractionHandler = undefined
	export let onPinchRemoteEnd: PointsInteractionHandler = undefined
	export let onPinchTouchStart: PointsInteractionHandler = undefined
	export let onPinchTouchEnd: PointsInteractionHandler = undefined
</script>

<!-- for usage with the modified Svelte version -->
<!-- <svelte:options accessors useAccMod accessorsAsync /> -->

<!--
@component
This is a **svelthree** _Points_ Component.
 TODO  Link to Docs.
-->
<!-- DEPRECATED  PERFORMANCE  SLOW : Lower performance over putting reactive statements directly inside the <script>-tag.
     IMPORTANT  using svelte child-components has significant performance impact, especially with a lot of objects + especially
     if a lot of props are being just passed to them, since these child-components also run through the complete svelte
     update-process on every parent-component update.

    <SvelthreeObject3D obj={points} {matrixAutoUpdate} {pos} {rot} {quat} {scale} {lookAt} {matrix} />
-->

<!-- <SvelthreeProps2 {props} obj={points} /> -->

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
		obj={points}
		{scene} />
{/if}

{#if $svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr.enabled === false}
	<SvelthreeInteraction {sti} {dispatch} obj={points} parent={self} {interactionEnabled} />
{/if}

{#if $svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr.enabled === true}
	{#if currentXRSessionMode === XRDefaults.SESSION_MODE_AR}
		<SvelthreeInteractionAR {sti} {dispatch} obj={points} parent={self} {interactionEnabled} />
	{/if}

	{#if currentXRSessionMode === XRDefaults.SESSION_MODE_VR}
		{#if currentXRInputType === XRDefaults.VR_INPUT_TYPE_GRIPPABLE}
			<SvelthreeInteractionVRGrippable {sti} {dispatch} obj={points} parent={self} {interactionEnabled} />
		{/if}
		{#if currentXRInputType === XRDefaults.VR_INPUT_TYPE_HAND}
			<!-- TODO  get rid of the SvelthreeInteractionVRHands component / create a ts class -->
			<SvelthreeInteractionVRHands
				{sti}
				{dispatch}
				obj={points}
				parent={self}
				{interactionEnabled}
				{pinchRemote}
				{pinchTouch}
				{pinchHybrid}
				{xrHandTouch} />
		{/if}
	{/if}
{/if}
