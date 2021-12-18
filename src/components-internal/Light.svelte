<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _Light_ Component.  
[ tbd ]  Link to Docs.
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
	import { self, get_current_component } from "svelte/internal"
	import { c_rs_int, c_dev, c_lc_int, c_mau, verbose_mode, get_comp_name_int } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name_int(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = undefined
	export let log_rs: boolean = false
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = undefined
	export let log_mau: boolean = false

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
				if (verbose && log_dev) {
					console.debug(
						...c_dev(c_name, `${light.type} was added to scene!`, {
							light,
							scene,
							total: scene.children.length
						})
					)
				}
			}
		} else {
			// add to provided parent if it's not parent already
			if (light.parent !== parentForUs) {
				parentForUs.add(light)
				if (verbose && log_dev) {
					console.debug(
						...c_dev(c_name, `${light.type} was added to parent!`, {
							light,
							parent: parentForUs,
							scene,
							total: scene.children.length
						})
					)
				}
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

	export let target: Object3D | Empty | Mesh<any> | boolean = undefined

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

	function isEmpty(t: Object3D | Empty | Mesh<any> | boolean): t is Empty {
		if (t.hasOwnProperty("getEmpty")) {
			return true
		}
		return false
	}

	function isMesh(t: Object3D | Empty | Mesh<any> | boolean): t is Mesh<any> {
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
		// IMPORTANT  this does NOT cause a component update! (instead of using requestAnimationFrame)
		// COOL!  this way the helper is 100% synchronious (not 1 frame late)
		if (!removeTargetPositionListener) {
			if (verbose && log_rs) console.debug(...c_rs_int(c_name, "startMonitoringTargetPosition!"))
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
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "props", props))
		sProps.update(props)
	}

	// reactive updating props

	//#region --- 'Object3D' Specific Code

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${light.type} >`)

	//$: !matrix && light && pos ? PropUtils.setPositionFromValue(light, pos) : pos && light ? console.warn(w_sh.pos) : null
	$: !matrix && light && pos ? setPos() : pos && light ? console.warn(w_sh.pos) : null

	function setPos() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "pos", pos))
		PropUtils.setPositionFromValue(light, pos)
	}

	/*
    $: !matrix && !quat && light && rot
        ? PropUtils.setRotationFromValue(light, rot)
        : rot && light
        ? console.warn(w_sh.rot)
        : null
        */
	$: !matrix && !quat && light && rot ? setRotationFromValue() : rot && light ? console.warn(w_sh.rot) : null

	function setRotationFromValue() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "rot", rot))
		PropUtils.setRotationFromValue(light, rot)
	}

	//$: !matrix && light && quat ? PropUtils.setQuaternionFromValue(light, quat) : quat && light ? console.warn(w_sh.quat) : null
	$: !matrix && light && quat ? setQuat() : quat && light ? console.warn(w_sh.quat) : null

	function setQuat() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "quat", quat))
		PropUtils.setQuaternionFromValue(light, quat)
	}

	// RECONSIDER  TODO  currently not using 'scale' in lights
	// $: !matrix && light && scale ? PropUtils.setScaleFromValue(light, scale) : scale && light ? console.warn(w_sh.scale) : null

	/*
    $: if (!matrix && light && lookAt) {
        PropUtils.setLookAtFromValue(light, lookAt)
    } else if (lookAt && light) {
        console.warn(w_sh.lookAt)
    }
    */
	$: if (!matrix && light && lookAt) {
		setLookAt()
	} else if (lookAt && light) {
		console.warn(w_sh.lookAt)
	}

	function setLookAt() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "lookAt", lookAt))
		PropUtils.setLookAtFromValue(light, lookAt)
	}

	//$: matrix && light ? PropUtils.setMatrixFromValue(light, matrix) : null
	$: matrix && light ? setMatrix() : null

	function setMatrix() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "matrix", matrix))
		PropUtils.setMatrixFromValue(light, matrix)
	}

	//#endregion

	//$: intensity ? PropUtils.setIntensity(light, intensity) : null
	$: intensity ? setIntensity() : null

	function setIntensity() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "intensity", intensity))
		PropUtils.setMatrixFromValue(light, intensity)
	}

	//$: color ? PropUtils.setColorFromValueKey(light, color, "color") : null
	$: color ? setColor() : null

	function setColor() {
		if (verbose && log_rs) console.debug(...c_rs_int(c_name, "color", color))
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
					if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc_int(c_name, "onMount"))
					if (verbose && log_mau) {
						console.debug(...c_mau(c_name, "onMount : light.matrixAutoUpdate", light.matrixAutoUpdate))
					}

					return () => {
						if (verbose && log_lc) console.info(...c_lc_int(c_name, "onDestroy"))
						removeLightFromParent()
					}
			  }
	)

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc_int(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc_int(c_name, "afterUpdate"))
		if (light.matrixWorldNeedsUpdate === false) {
			light.matrixAutoUpdate = mau
		}
		if (verbose && log_mau) {
			console.debug(...c_mau(c_name, "afterUpdate : light.matrixAutoUpdate", light.matrixAutoUpdate))
		}
	})

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
	{scene}
/>
