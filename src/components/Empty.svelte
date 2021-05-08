<!-- 
@component
This is a **svelthree** _Empty_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { afterUpdate, onMount } from "svelte"
	import { Euler, Matrix4, Object3D, Quaternion, Scene, Vector3 } from "svelthree-three"
	import { SvelthreeAnimation } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList, SvelthreeAnimationFunction } from "../types-extra"
	import { svelthreeStores } from "../stores"
	import { PropUtils, StoreUtils, SvelthreeProps } from "../utils"

	let ani: any

	// construction

	export const isEmpty: boolean = true

	export let name: string = undefined

	export let mau: boolean = undefined

	afterUpdate(() => {
		if (empty) {
			if (empty.parent?.constructor === Scene) {
				// if top level object, update self and kick off update of all children:

				/*
                if this.matrixWorldNeedsUpdate = false, matrixWorld will be skipped and the
                function will move to checking all children (without forcing).
                The first child object with .matrixWorldNeedsUpdate = true will kick off
                forced update of it's children.
                
                see https://github.com/mrdoob/three.js/blob/a43d2386f58ed0929d894923291a0e86909108b3/src/core/Object3D.js#L573-L605
                */
				empty.updateMatrixWorld()
			}
		}
	})

	export let parent: Object3D = undefined
	export let parentForSlot: Object3D = undefined
	export let parentForUs: Object3D = undefined
	export let aniauto: boolean = undefined

	export let scene: Scene
	const sti: number = StoreUtils.getSTIfromScene(scene, "Empty")

	let empty: Object3D = new Object3D()
	empty.name = name

	$: empty.userData.matrixAutoUpdate = mau

	scene.add(empty)

	console.info("SVELTHREE > EMPTY added!", {
		empty: empty,
		scene: scene,
		total: scene.children.length
	})

	// determining parent immediately

	if (!parent) {
		parentForSlot = empty
	} else {
		if (parent !== empty) {
			parentForUs = parent
			parentForSlot = empty
		}
	}

	addEmpty()

	function addEmpty(): void {
		if (!parentForUs) {
			if (empty.parent !== scene) {
				scene.add(empty)
				console.info("SVELTHREE > EMPTY " + empty.type + " added to scene!", {
					empty: empty,
					scene: scene,
					total: scene.children.length
				})
			}
		} else {
			if (empty.parent !== parentForUs) {
				parentForUs.add(empty)
				console.info("SVELTHREE > EMPTY " + empty.type + " added to parent!", {
					empty: empty,
					scene: scene,
					total: scene.children.length
				})
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

	type EmptyProps = OnlyWritableNonFunctionPropsPlus<
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
					console.info("SVELTHREE > onMount : Empty")
					return () => {
						console.info("SVELTHREE > onDestroy : Empty")
						removeEmptyFromParent()
					}
			  }
	)

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
	{scene} />
