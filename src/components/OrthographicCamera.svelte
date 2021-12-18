<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
**svelthree** _OrthographicCamera_ Component.  
☝️ In order to configure / update the [OrthographicCamera]((https://threejs.org/docs/#api/en/cameras/OrthographicCamera)), you should one of these approaches without mixing them:  
- [ *recommended* ] Use `frustumSize` and `props` attributes : This way the frustum planes positions will be calculated automatically so the camera always fits the canvas size. 
If you use this approach you'll see a warning in the console if you define left, right, top and bottom properties inside `props` attribute.
- Use `params` attribute to initialize the camera and `props` attribute to mutate it's properties.
- Use `props` attribute only: Camera will be initialized with default constructor values and `props` attribute will mutate it's properties.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	export type OrthographicCameraProps = OnlyWritableNonFunctionPropsPlus<
		Omit<OrthographicCamera, PropBlackList>,
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

	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import type { Object3D } from "three"
	import { CameraHelper, Euler, Matrix4, OrthographicCamera, Quaternion, Scene, Vector3 } from "three"
	import { Camera } from "../components-internal"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList, SvelthreeAnimationFunction } from "../types-extra"
	import { svelthreeStores } from "../stores"
	import { CameraUtils, StoreUtils } from "../utils"
	import { get_current_component } from "svelte/internal"
	import { c_rs, c_lc, c_mau, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	// #endregion

	// #region --- Required Attributes

	export let scene: Scene
	const sti: number = StoreUtils.getSTIfromScene(scene, "OrthographicCamera")

	export let id: string = undefined

	export let mau: boolean = undefined

	if (!id) {
		console.warn(
			"SVELTHREE > OrthographicCamera : you have to provide an 'id' prop (not empty String) for Cameras in order to assign them to a 'WebGLRenderer' component!",
			{ id: id }
		)
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	// #endregion

	// #region --- Optional Attributes
	export let name: string = undefined

	/**
     * The value of `frustumSize` is being used for automatic calculation of default left, right, top and bottom frustum planes:
     * ```
        cam.left = (frustumSize * aspect) / -2
        cam.right = (frustumSize * aspect) / 2
        cam.top = frustumSize / 2
        cam.bottom = frustumSize / -2
     * ```
     * The value of `aspect` is being internally calculated based on current dimensions of the Canvas component (canvas.w / canvas.h).   
    */

	export let frustumSize: number = undefined

	/**
	 * Initializes the OrthographicCamera with user provided three.js-native [OrthographicCamera](https://threejs.org/docs/#api/en/cameras/OrthographicCamera) constructor parameters.
	 *
	 * Usage: `params={[...]}`
	 *
	 * ☝️ *This is an alternative to using the `frustumSize` attribute, so you'll have to manage the frustum plane positions by yourself.*
	 */
	export let params: ConstructorParameters<typeof OrthographicCamera> = undefined

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

	/** Writable, non-function OrthographicCamera properties only incl. an additional `lookAt` property. */
	export let props: { [P in keyof OrthographicCameraProps]: OrthographicCameraProps[P] } = undefined

	// #endregion

	// #region --- Initialization

	// Camera component's reference
	let camera: Camera

	const defaultParams: ConstructorParameters<typeof OrthographicCamera> =
		CameraUtils.getOrthoCamDefaultParams(frustumSize)

	let cam: OrthographicCamera

	// IMPORTANT  This will NOT work here!
	/*
	$: {
		if(cam) {
			cam.matrixAutoUpdate = mau ? true : false
		}
	}
	*/

	$: {
		if (!cam && params && params.length > 0) {
			cam = new OrthographicCamera(...params)
		} else if (!cam) {
			cam = new OrthographicCamera(...defaultParams)
		}
	}

	// IMPORTANT  This WILL work here!
	// IMPORTANT  If the object hat been reactively created (inside reactive statement), any manipulation of it has to happen
	// after the "creation"-reactive statement.
	$: {
		if (cam) {
			cam.name = name
			cam.userData.svelthreeComponent = self
			cam.matrixAutoUpdate = scene.matrixAutoUpdate ? true : false
		}
	}

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
		CameraUtils.updateOtrhoCam(cam, frustumSize, canvasW, canvasH)
	}

	$: frustumSize && cam ? CameraUtils.updateOtrhoCam(cam, frustumSize, canvasW, canvasH) : null

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
		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "onMount : cam.", {
					matrixAutoUpdate: cam.matrixAutoUpdate,
					matrixWorldNeedsUpdate: cam.matrixWorldNeedsUpdate
				})
			)
		}
		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			CameraUtils.removeHelper(cam, scene)
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "beforeUpdate : cam.", {
					matrixAutoUpdate: cam.matrixAutoUpdate,
					matrixWorldNeedsUpdate: cam.matrixWorldNeedsUpdate
				})
			)
		}
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
		if (verbose && log_mau) {
			console.debug(
				...c_mau(c_name, "afterUpdate : cam.", {
					matrixAutoUpdate: cam.matrixAutoUpdate,
					matrixWorldNeedsUpdate: cam.matrixWorldNeedsUpdate
				})
			)
		}

		if (!mau && cam?.parent?.constructor === Scene) {
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
			cam.updateMatrix()
			cam.updateMatrixWorld()
		}
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
	{frustumSize}
	{props}
	{animation}
	{aniauto}
	{log_dev}
	{log_rs}
	{log_lc}
	{log_mau}
/>
