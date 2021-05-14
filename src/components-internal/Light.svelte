<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _Light_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import type { Color, Euler, Light, Matrix4, Object3D, Quaternion, Scene, Vector3 } from "three"
	import type { SvelthreeAnimationFunction } from "../types-extra"
	import { svelthreeStores } from "../stores"
	import { LightUtils, PropUtils, StoreUtils, SvelthreeProps } from "../utils"
	import type { default as Empty } from "../components/Empty.svelte"
	import type { default as Mesh } from "../components/Mesh.svelte"
	import SvelthreeAnimation from "./SvelthreeAnimation.svelte"

	const css_rs = "color: red;font-weight:bold;"
	const css_ba = "color: blue;font-weight:bold;"
	const css_aa = "color: green;font-weight:bold;"
	export let logInfo: boolean = false
	export let logRS: boolean = false
	export let logLC: boolean = false

	let ani: any

	// construction
	export let scene: Scene
	const sti: number = StoreUtils.getSTIfromScene(scene, "Light")

	export let parent: Object3D = undefined
	export let parentForUs: Object3D = undefined

	export let light: Light = undefined

	if (!light) {
		console.warn("SVELTHREE > Light : light was not provided by parent component!", { light: light })
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	if (parent) {
		// parent is already there, either it has been provided or set on light generation to the light itself
		// means this parent was provided and we are child
		if (parent !== light) {
			// set self as parent for next slot
			parentForUs = parent
		} else {
			/* nothing */
		}
	}

	tryAddingLight()

	function tryAddingLight(): void {
		if (!parentForUs) {
			// add to scene if no parent was provided & scene is not parent already
			if (light.parent !== scene) {
				scene.add(light)
				if (logInfo)
					console.info("SVELTHREE > Light : " + light.type + " was added to scene!", {
						light: light,
						scene: scene,
						total: scene.children.length
					})
			}
		} else {
			// add to provided parent if it's not parent already
			if (light.parent !== parentForUs) {
				parentForUs.add(light)
				if (logInfo)
					console.info("SVELTHREE > Light : " + light.type + " was added to parent!", {
						light: light,
						parent: parentForUs,
						scene: scene,
						total: scene.children.length
					})
			}
		}
	}

	// props
	// shorthand props can be set directly as props

	export let mau: boolean = undefined

	// we can do this, because 'userData.matrixAutoUpdate' can be 'undefined'
	$: if (light) {
		light.matrixAutoUpdate = mau ? true : false
	}

	// accept anything from the specific light component
	export let props: { [key: string]: any } = undefined

	export let helper: boolean = undefined
	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto: boolean = undefined

	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	export let quat: Quaternion = undefined

	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined

	export let target: Object3D | Empty | Mesh | boolean = undefined

	/**
	 * ☝️ If `matrix` attribute is provided, `pos`, `rot`, `scale` attributes as well as any provided transform props will be overridden!
	 */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	export let color: Color | string | [r: number, g: number, b: number] | Vector3 = undefined
	export let intensity: number = undefined

	// #region --- Lights with 'target' property

	/*
        Triggers a Light Helper update if the position of the target has changed
    */

	let updateTarget = false
	$: !matrix && light && target ? (updateTarget = true) : null

	function doUpdateTarget() {
		updateTarget = false

		if (light.hasOwnProperty("target")) {
			if (isEmpty(target)) {
				light["target"] = target.getEmpty()
			} else if (isMesh(target)) {
				light["target"] = target.getMesh()
			} else if ((target as Object3D).isObject3D) {
				light["target"] = target
			} else if (typeof target === "boolean") {
				scene.add(light["target"])
			}
		}
	}

	function isEmpty(t: Object3D | Empty | Mesh | boolean): t is Empty {
		if (t.hasOwnProperty("getEmpty")) {
			return true
		}
		return false
	}

	function isMesh(t: Object3D | Empty | Mesh | boolean): t is Mesh {
		if (t.hasOwnProperty("getMesh")) {
			return true
		}
		return false
	}

	let targetPos: [number, number, number] = [0, 0, 0]
	let targetPosPrev: [number, number, number] = undefined

	// if the Light is a Light with a 'target' property, start / stop monitoring 'target' position changes if helper is enabled / disabled
	$: !matrix && light && light["target"]?.isObject3D && $svelthreeStores[sti].rendererComponent
		? startMonitoringTargetPosition()
		: stopMonitoringTargetPosition()

	// call this to remove the renderer component listener
	let removeTargetPositionListener: () => void

	function startMonitoringTargetPosition(): void {
		if (logRS) console.log("%c*--------> Light > reactive statement! startMonitoringTargetPosition!", `${css_rs}`)

		// IMPORTANT  this does NOT cause a component update! (instead of using requestAnimationFrame)
		// COOL!  this way the helper is 100% synchronious (not 1 frame late)
		if (!removeTargetPositionListener) {
			removeTargetPositionListener = $svelthreeStores[sti].rendererComponent.$on(
				"before_render_int",
				checkTargetPosition
			)
		}
	}

	function stopMonitoringTargetPosition(): void {
		if (removeTargetPositionListener) {
			removeTargetPositionListener()
			removeTargetPositionListener = undefined
		}
	}

	function checkTargetPosition(): void {
		// don't check for changes if 'target' is not added to scene (doesn't have parent)

		if (updateTarget) doUpdateTarget()

		if (light["target"]?.isObject3D && light["target"].parent !== null) {
			targetPos[0] = (light["target"] as Object3D).position.x
			targetPos[1] = (light["target"] as Object3D).position.y
			targetPos[2] = (light["target"] as Object3D).position.z

			if (targetPosPrev === undefined) {
				targetPosPrev = [...targetPos]
				onTargetPosChanged()
			} else {
				if (targetPosChanged()) {
					onTargetPosChanged()
				}
			}
		}

		light.updateMatrix()
		light.updateMatrixWorld()
		if (helper) LightUtils.updateHelper(light)
	}

	function targetPosChanged(): boolean {
		for (let i = 0; i < 3; i++) {
			if (targetPos[i] !== targetPosPrev[i]) {
				targetPosPrev = [...targetPos]
				return true
			}
		}
		return false
	}

	function onTargetPosChanged(): void {
		if (light["target"].matrixAutoUpdate === false) {
			light["target"].updateMatrix()
			light["target"].updateMatrixWorld()
		}
	}

	// #endregion

	let sProps: SvelthreeProps
	$: !sProps && light ? (sProps = new SvelthreeProps(light)) : null
	//$: props && sProps ? sProps.update(props) : null
	$: props && sProps ? updateProps() : null

	function updateProps() {
		if (logRS) console.log("%c*--------> Light > reactive statement! props", `${css_rs}`, props)
		sProps.update(props)
	}

	// reactive updating props

	//#region --- 'Object3D' Specific Code

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${light.type} >`)
	const wrn = PropUtils.warn

	//$: !matrix && light && pos ? PropUtils.setPositionFromValue(light, pos) : pos && light ? wrn(w_sh.pos) : null
	$: !matrix && light && pos ? setPos() : pos && light ? wrn(w_sh.pos) : null

	function setPos() {
		if (logRS) console.log("%c*--------> Light > reactive statement! pos", `${css_rs}`, pos)
		PropUtils.setPositionFromValue(light, pos)
	}

	/*
    $: !matrix && !quat && light && rot
        ? PropUtils.setRotationFromValue(light, rot)
        : rot && light
        ? wrn(w_sh.rot)
        : null
        */
	$: !matrix && !quat && light && rot ? setRot() : rot && light ? wrn(w_sh.rot) : null

	function setRot() {
		if (logRS) console.log("%c*--------> Light > reactive statement! rot", `${css_rs}`, rot)
		PropUtils.setRotationFromValue(light, rot)
	}

	//$: !matrix && light && quat ? PropUtils.setQuaternionFromValue(light, quat) : quat && light ? wrn(w_sh.quat) : null
	$: !matrix && light && quat ? setQuat() : quat && light ? wrn(w_sh.quat) : null

	function setQuat() {
		if (logRS) console.log("%c*--------> Light > reactive statement! quat", `${css_rs}`, quat)
		PropUtils.setQuaternionFromValue(light, quat)
	}

	// RECONSIDER  TODO  currently not using 'scale' in lights
	// $: !matrix && light && scale ? PropUtils.setScaleFromValue(light, scale) : scale && light ? wrn(w_sh.scale) : null

	/*
    $: if (!matrix && light && lookAt) {
        PropUtils.setLookAtFromValue(light, lookAt)
    } else if (lookAt && light) {
        wrn(w_sh.lookAt)
    }
    */
	$: if (!matrix && light && lookAt) {
		setLookAt()
	} else if (lookAt && light) {
		wrn(w_sh.lookAt)
	}

	function setLookAt() {
		if (logRS) console.log("%c*--------> Light > reactive statement! lookAt", `${css_rs}`, lookAt)
		PropUtils.setLookAtFromValue(light, lookAt)
	}

	//$: matrix && light ? PropUtils.setMatrixFromValue(light, matrix) : null
	$: matrix && light ? setMatrix() : null

	function setMatrix() {
		if (logRS) console.log("%c*--------> Light > reactive statement! matrix", `${css_rs}`, matrix)
		PropUtils.setMatrixFromValue(light, matrix)
	}

	//#endregion

	//$: intensity ? PropUtils.setIntensity(light, intensity) : null
	$: intensity ? setIntensity() : null

	function setIntensity() {
		if (logRS) console.log("%c*--------> Light > reactive statement! intensity", `${css_rs}`, intensity)
		PropUtils.setMatrixFromValue(light, intensity)
	}

	//$: color ? PropUtils.setColorFromValueKey(light, color, "color") : null
	$: color ? setColor() : null

	function setColor() {
		if (logRS) console.log("%c*--------> Light > reactive statement! color", `${css_rs}`, color)
		PropUtils.setColorFromValueKey(light, color, "color")
	}

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
					if (logLC) logCurrentState(`*----> Light > onMount`, null)
					if (logInfo) console.info("SVELTHREE > onMount : Light")
					console.warn("SVELTHREE >  onMount : Light : light.matrixAutoUpdate", light.matrixAutoUpdate)

					return () => {
						if (logInfo) console.info("SVELTHREE > onDestroy : Light")
						removeLightFromParent()
					}
			  }
	)

	beforeUpdate(() => {
		if (logLC) logCurrentState("%c*------> Light > beforeUpdate", css_ba)
	})

	afterUpdate(() => {
		if (logLC) logCurrentState("%c*------> Light > afterUpdate", css_aa)
		if (light.matrixWorldNeedsUpdate === false) {
			light.matrixAutoUpdate = mau
		}
	})

	function logCurrentState(prefix: string, css: string) {
		console.log(`${prefix}!`, `${css}`)
	}

	// public methods

	export function removeLightFromParent(): void {
		light.parent.remove(light)
	}

	// animation related public methods

	export function getAnimation(): any {
		return ani.getAnimation()
	}

	export function startAni(): void {
		ani.startAni()
	}

</script>

<SvelthreeAnimation
	bind:this={ani}
	bind:currentSceneActive
	{animationEnabled}
	{animation}
	{aniauto}
	obj={light}
	{scene} />
