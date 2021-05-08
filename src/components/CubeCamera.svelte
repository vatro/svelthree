<!-- 
@component
This is a **svelthree** _CubeCamera_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { onMount } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { CubeCamera, Material, Mesh, Scene, Vector3, WebGLCubeRenderTarget } from "three"
	import { svelthreeStores } from "../stores"
	import { StoreUtils } from "../utils"

	let self = get_current_component()

	export let scene: Scene
	export let parent: Mesh = undefined

	const sti: number = StoreUtils.getSTIfromScene(scene, "CubeCamera")

	export let near: number = 1
	export let far: number = 1000
	export let props: { [key: string]: any } = undefined // CubeCamera props
	export let targetProps: { [key: string]: any } = undefined // WebGLCubeRenderTarget props
	export let targetSize: number = 128

	let cubeRenderTarget = new WebGLCubeRenderTarget(targetSize, targetProps)
	let cubeCamera = new CubeCamera(near, far, cubeRenderTarget)

	/*
     not working as expected, currently just rebuilding everything on props change
      TODO  Remove if not possible without rebuilding.
    */

	/*
        let propsIterator: Propeller
        let targetPropsIterator: Propeller
        
        propsIterator = new Propeller(cubeCamera)
        targetPropsIterator = new Propeller(cubeRenderTarget)
    
        $: props
            ? Object.keys(props).length > 0
                ? propsIterator
                    ? propsIterator.tryPropsUpdate(props)
                    : null
                : null
            : null
    */

	/*
     This is not working as expected, we have to rebuild WebGLCubeRenderTarget
     in order to change settings on runtime / reactive
      TODO  Really not possible without rebuilding? Am I missing something?
      TODO  Remove if not possible without rebuilding.
    */

	/*
        $: targetProps
            ? Object.keys(targetProps).length > 0
                ? targetPropsIterator
                    ? (console.log("REACTIVE!"),
                    targetPropsIterator.tryPropsUpdate(targetProps),
                    (parent.material["envMap"] = cubeCamera.renderTarget.texture),
                    (parent.material["envMap"].needsUpdate = true),
                    (parent.material["needsUpdate"] = true))
                    : null
                : null
            : null
    */

	/*
     simply rebuild CubeCamera & WebGLCubeRenderTarget
     in order to change settings on runtime / reactive
    */

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
		console.info("SVELTHREE > onMount : CubeCamera, parent: ", parent)
		return () => {
			console.info("SVELTHREE > onDestroy : CubeCamera")
			scene.remove(cubeCamera)
			$svelthreeStores[sti].cubeCameras[camIndex] = null
		}
	})
</script>
