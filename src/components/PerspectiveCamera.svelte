<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _PerspectiveCamera_ Component.  
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	export type PerspectiveCameraProps = OnlyWritableNonFunctionPropsPlus<
		Omit<PerspectiveCamera, PropBlackList>,
		{
			lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
			position?: Vector3 | Parameters<Vector3["set"]>
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
	// #region --- Imports

	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import type { Object3D } from "three"
	import { CameraHelper, Euler, Matrix4, PerspectiveCamera, Quaternion, Scene, Vector3 } from "three"
	import { Camera } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList, SvelthreeAnimationFunction } from "../types-extra"
	import { svelthreeStores } from "../stores"
	import { CameraUtils, StoreUtils } from "../utils"
	import { get_current_component } from "svelte/internal"
	import { c_rs, c_lc, c_mau, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	// #endregion

	const self = get_current_component()
	const c_name = get_comp_name(self)
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	// #region --- Required Attributes
	export let scene: Scene
	const sti: number = StoreUtils.getSTIfromScene(scene, "PerspectiveCamera")

	export let id: string = undefined

	if (!id) {
		console.warn(
			"SVELTHREE > PerspectiveCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!",
			{ id: id }
		)
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	// #endregion

	// #region --- Optional Attributes
	export let name: string = undefined

	/**
	 * Initializes the PerspectiveCamera with user provided three.js-native
	 * [PerspectiveCamera](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera) constructor parameters.
	 *
	 * Usage: `params={[...]}`
	 *
	 * ☝️ *If not provided three.js default parameters will be used.*
	 */
	export let params: ConstructorParameters<typeof PerspectiveCamera> = undefined

	export let mau: boolean = undefined

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

	/**
	 * ☝️ If `matrix` attribute is provided, `pos`, `rot`, `scale` attributes as well as any provided transform props will be overridden!
	 */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	/** Writable, non-function PerspectiveCamera properties only incl. an additional `lookAt` property. */
	export let props: { [P in keyof PerspectiveCameraProps]: PerspectiveCameraProps[P] } = undefined

	export let animation: SvelthreeAnimationFunction = undefined
	export let aniauto = false

	/** Creates and adds a CameraHelper. */
	export let helper: boolean = undefined

	$: {
		if (cam && !cam.userData.helper && helper) {
			const camHelper: CameraHelper = CameraUtils.createHelper(cam, scene)

			if (verbose && log_rs) {
				console.debug(c_name, `[${cam.type}] + HELPER added!`, {
					camHelper,
					scene,
					total: scene.children.length
				})
			}
		}
	}

	$: cam && cam.userData.helper && !helper ? CameraUtils.removeHelper(cam, scene) : null

	// #endregion

	// #region --- Initialization

	// Camera component's reference
	let camera: Camera

	let cam: PerspectiveCamera

	if (params && params.length > 0) {
		cam = new PerspectiveCamera(...params)
	} else {
		cam = new PerspectiveCamera()
	}

	cam.name = name
	cam.userData.svelthreeComponent = self

	// #endregion

	// #region --- Reactiveness

	let canvas: HTMLCanvasElement = undefined
	$: canvas = $svelthreeStores[sti].canvas.dom

	let canvasW: number
	let canvasH: number

	$: canvasW = $svelthreeStores[sti].canvas.dim.w
	$: canvasH = $svelthreeStores[sti].canvas.dim.h

	// Executed on Canvas dimensions change
	$: if ((canvasW || canvasH) && canvas) {
		CameraUtils.updatePerspCam(cam, canvasW, canvasH)
	}

	// #endregion

	// #region --- Public Methods

	export function getId(): string {
		return id
	}

	export function getSTI(): number {
		return sti
	}

	export function getCamera(): THREE.Camera {
		return camera.getCamera()
	}

	export function getIndexInCameras(): number {
		return camera.getIndexInCameras()
	}

	export function getHelper(): CameraHelper {
		return cam.userData.helper as CameraHelper
	}

	export function setHelperAttr(enabled: boolean): void {
		helper = enabled
	}

	export function getHelperAttr(): boolean {
		return helper
	}

	// #endregion

	// #region --- Lifecycle

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			CameraUtils.removeHelper(cam, scene)
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
	})

	// #endregion
</script>

<Camera
	bind:this={camera}
	{scene}
	{sti}
	{cam}
	{id}
	{mau}
	{helper}
	{pos}
	{rot}
	{quat}
	{lookAt}
	{matrix}
	{props}
	{animation}
	{aniauto}
	{log_dev}
	{log_rs}
	{log_lc}
	{log_mau}
/>
