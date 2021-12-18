<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _Empty_ Component.  
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	export type EmptyProps = OnlyWritableNonFunctionPropsPlus<
		Omit<Object3D, PropBlackList>,
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
</script>

<script lang="ts">
	import { afterUpdate, onMount, beforeUpdate } from "svelte"
	import { Euler, Matrix4, Object3D, Quaternion, Scene, Vector3 } from "three"
	import { SvelthreeAnimation } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList, SvelthreeAnimationFunction } from "../types-extra"
	import { svelthreeStores } from "../stores"
	import { PropUtils, StoreUtils, SvelthreeProps } from "../utils"
	import { self, get_current_component } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	let ani: any

	// construction

	export const isEmpty: boolean = true

	export let name: string = undefined

	export let mau: boolean = undefined

	export let parent: Object3D = undefined
	export let parentForSlot: Object3D = undefined
	export let parentForUs: Object3D = undefined
	export let aniauto: boolean = undefined

	export let scene: Scene
	const sti: number = StoreUtils.getSTIfromScene(scene, "Empty")

	let empty: Object3D = undefined
	$: empty === undefined ? createEmpty() : null

	function createEmpty(): void {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "createEmpty!"))
		empty = new Object3D()
		empty.name = name
		empty.userData.svelthreeComponent = self
	}

	$: if (empty) {
		empty.matrixAutoUpdate = scene.matrixAutoUpdate ? true : false
	}

	// determining parent immediately
	$: if (empty) {
		if (!parent) {
			parentForSlot = empty
		} else {
			if (parent !== empty) {
				parentForUs = parent
				parentForSlot = empty
			}
		}
	}

	$: empty ? addEmpty() : null

	function addEmpty(): void {
		if (!parentForUs) {
			if (empty.parent !== scene) {
				scene.add(empty)
				if (verbose && log_dev) {
					console.debug(
						...c_dev(c_name, `${empty.type} added to scene!`, {
							empty: empty,
							scene: scene,
							total: scene.children.length
						})
					)
				}
			}
		} else {
			if (empty.parent !== parentForUs) {
				parentForUs.add(empty)
				if (verbose && log_dev) {
					console.debug(
						...c_dev(c_name, `${empty.type} added to parent!`, {
							empty: empty,
							scene: scene,
							total: scene.children.length
						})
					)
				}
			}
		}
	}

	export let animation: SvelthreeAnimationFunction = undefined

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	export let quat: Quaternion = undefined

	export let scale: Vector3 | Parameters<Vector3["set"]> = undefined

	/**
	 * ☝️ If `matrix` attribute is provided, `pos`, `rot`, `scale` attributes as well as any provided transform props will be overridden!
	 */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	let sProps: SvelthreeProps
	$: !sProps && empty ? (sProps = new SvelthreeProps(empty)) : null

	export let props: { [P in keyof EmptyProps]: EmptyProps[P] } = undefined

	$: props && sProps ? sProps.update(props) : null

	//#region --- 'Object3D' Specific Code

	//$: mesh.castShadow = castShadow ? true : false
	//$: mesh.receiveShadow = receiveShadow ? true : false

	// PERFORMANCE  FAST  This approach is about 25% faster than using a SvelthreeObject3D component!
	/* PERFORMANCE  FASTER  Setting props directly via PropUtils seems to be a bit faster, since
    we're bypassing the Propeller. The performance gain is not very significant, but it makes more sense,
    because we KNOW these properties are available on the Mesh. Type checking happens in PropUtils.
    The Propeller was meant to be used with the 'props' attribute.
    */
	// Skipping Propeller completely (we KNOW empty has these properties).
	// Value Type is being checked in PropUtils.
	$: !matrix && empty && pos ? PropUtils.setPositionFromValue(empty, pos) : null
	$: !matrix && empty && rot ? PropUtils.setRotationFromValue(empty, rot) : null
	$: !matrix && empty && quat ? PropUtils.setQuaternionFromValue(empty, quat) : null
	$: !matrix && empty && scale ? PropUtils.setScaleFromValue(empty, scale) : null
	//$: !matrix && empty && lookAt ? PropUtils.setLookAtFromValue(empty, lookAt) : null
	$: matrix && empty ? PropUtils.setMatrixFromValue(empty, matrix) : null

	//#endregion

	// reactive animation handling (has to be enabled as last, so that initial animation state overrides props)

	let currentSceneActive = false
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.indexInScenes]?.isActive

	let animationEnabled = false
	$: animation ? (animationEnabled = true) : null

	// -----------------------------------

	export let fnOnMount: any = undefined

	onMount(
		fnOnMount
			? () => fnOnMount(self)
			: () => {
					if (verbose && log_lc) console.info(...c_lc(c_name, "onMount"))
					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "onMount : empty.", {
								matrixAutoUpdate: empty.matrixAutoUpdate,
								matrixWorldNeedsUpdate: empty.matrixWorldNeedsUpdate
							})
						)
					}
					return () => {
						if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
						removeEmptyFromParent()
					}
			  }
	)

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "beforeUpdate : empty.", {
					matrixAutoUpdate: empty.matrixAutoUpdate,
					matrixWorldNeedsUpdate: empty.matrixWorldNeedsUpdate
				})
			)
		}
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))

		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "beforeUpdate : empty.", {
					matrixAutoUpdate: empty.matrixAutoUpdate,
					matrixWorldNeedsUpdate: empty.matrixWorldNeedsUpdate
				})
			)
		}

		if (!mau && empty?.parent?.constructor === Scene) {
			/*
				if top level object (scene is direct parent), update self and kick off update of all children, no need to
				check for children, updateMatrixWorld() will do it!
			/*

			/*
				if this.matrixWorldNeedsUpdate = false, matrixWorld will be skipped and the
				function will move to checking all children (without forcing, because scene.autoUpdate = false),
				IMPORTANT  remember -> Scene is also an Object3D!.
				The first child object with .matrixWorldNeedsUpdate = true will kick off
				FORCED update of it's children.
					
				see https://github.com/mrdoob/three.js/blob/a43d2386f58ed0929d894923291a0e86909108b3/src/core/Object3D.js#L573-L605
			*/

			/*
				 IMPORTANT  THREE  updateMatrixWorld() sets .matrixWorldNeedsUpdate to `false`
				 IMPORTANT  THREE  Object3D.updateMatrix() sets .matrixWorldNeedsUpdate to `true` but is MOSTLY being
				executed only if matrixAutoUpdate = true, but sometimes it always gets executes,  TODO  nail it down,
				search for 'updateMatrix()' in three source + WRITE IT DOWN!
			*/

			//	Update local and world matrix after all (prop) changes (microtasks) have been applied.
			empty.updateMatrix()
			empty.updateMatrixWorld()
		}
	})

	// public methods

	export function removeEmptyFromParent(): void {
		empty.parent.remove(empty)
	}

	export function getEmpty(): Object3D {
		return empty
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
</script>

<slot {scene} parent={parentForSlot} />

<SvelthreeAnimation
	bind:this={ani}
	bind:currentSceneActive
	{animationEnabled}
	{animation}
	{aniauto}
	obj={empty}
	{scene}
	{log_dev}
	{log_rs}
	{log_lc}
	{log_mau}
/>
