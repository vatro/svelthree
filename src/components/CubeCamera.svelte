<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _CubeCamera_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { CubeCamera, Material, Mesh, Scene, Vector3, WebGLCubeRenderTarget } from "three"
	import { svelthreeStores } from "../stores"
	import { StoreUtils } from "../utils"
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

	export let scene: Scene
	export let parent: Mesh = undefined
	export let name: string = undefined

	const sti: number = StoreUtils.getSTIfromScene(scene, "CubeCamera")

	export let near: number = 1
	export let far: number = 1000
	export let props: { [key: string]: any } = undefined // CubeCamera props
	export let targetProps: { [key: string]: any } = undefined // WebGLCubeRenderTarget props
	export let targetSize: number = 128

	let cubeRenderTarget = new WebGLCubeRenderTarget(targetSize, targetProps)
	let cubeCamera = new CubeCamera(near, far, cubeRenderTarget)

	// Simply rebuild CubeCamera & WebGLCubeRenderTarget in order to change settings on runtime / reactive.
	$: props || targetProps || targetSize || near || far ? rebuild() : null

	interface MaterialWithEnvMap extends Material {
		envMap?: THREE.Texture | null
	}

	function rebuild() {
		cubeRenderTarget = new WebGLCubeRenderTarget(targetSize, targetProps)
		cubeCamera = new CubeCamera(near, far, cubeRenderTarget)
		if (parent.material.hasOwnProperty("envMap")) {
			;(parent.material as MaterialWithEnvMap).envMap = cubeCamera.renderTarget.texture
		}
	}

	cubeCamera.name = name
	cubeCamera.userData.svelthreeComponent = self

	scene.add(cubeCamera)

	$svelthreeStores[sti].cubeCameras.push(self)

	let camIndex: number = undefined
	camIndex = $svelthreeStores[sti].cubeCameras.length - 1

	export function getIndex(): number {
		return camIndex
	}

	// update the render target cube
	// call it from WebGL Renderer
	export function doUpdate() {
		if ($svelthreeStores[sti].currentSceneIndex) {
			parent.visible = false
			let wp: Vector3 = new Vector3()
			parent.getWorldPosition(wp)
			cubeCamera.position.copy(wp)
			let renderer = $svelthreeStores[sti].renderer
			let scene = $svelthreeStores[sti].scenes[$svelthreeStores[sti].currentSceneIndex - 1].scene
			cubeCamera.update(renderer, scene)
			parent.visible = true
		}
	}

	onMount(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		if (verbose && log_dev) console.debug(...c_dev(c_name, "onMount -> parent", parent))
		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
			scene.remove(cubeCamera)
			$svelthreeStores[sti].cubeCameras[camIndex] = null
		}
	})

	beforeUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
	})

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
	})
</script>
