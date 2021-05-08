<!-- 
@component
This is a **svelthree** _Scene_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import { Color, Scene } from "svelthree-three"
	import { svelthreeStores } from "../stores"

	const css_rs = "color: red;font-weight:bold;"
	const css_ba = "color: blue;font-weight:bold;"
	const css_aa = "color: green;font-weight:bold;"
	export let logInfo: boolean = false
	export let logRS: boolean = false
	export let logLC: boolean = false

	export let id: string = undefined
	if (!id) {
		console.warn(
			"SVELTHREE > Scene : You have to provide an 'id' prop (not empty String) for Scenes in order to assign them to a 'WebGLRenderer' component!",
			{ id: id }
		)
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	//  TODO  Fix / complete processing Scene props (atm only background, see onMount)!
	// props object can be filled with anything, ideally available THREE props of course.
	export let props: { [key: string]: any } = undefined

	export let sti: number
	export let mau: boolean = undefined

	if (sti === undefined) {
		console.warn("SVELTHREE > Scene : You have to provide a {sti} prop for the Scene!", { sti: sti })
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	const svelthreeStore = $svelthreeStores[sti]

	let scene: Scene = new Scene()

	$: mau ? enableSceneAuto() : disableSceneAuto()

	function enableSceneAuto() {
		scene.autoUpdate = true
		scene.matrixAutoUpdate = true
	}

	function disableSceneAuto() {
		scene.autoUpdate = false
		scene.matrixAutoUpdate = false
	}

	// TODO  WHY?  setting scene.autoUpdate to false literally everything, especially lookAt
	//$: scene.autoUpdate = mau ? true : false

	scene.userData.isActive = false
	scene.userData.id = id
	scene.userData.sti = sti
	scene.userData.animations = []
	scene.userData.indexInScenes = svelthreeStore.scenes.length
	svelthreeStore.scenes.push({ scene: scene, id: id, isActive: false })

	onMount(() => {
		if (logLC) logCurrentState("--> Scene > onMount", null)
		if (logInfo) console.info("SVELTHREE > onMount : Scene", { sti: sti })
		console.warn("SVELTHREE > onMount : Scene : scene.matrixAutoUpdate:", scene.matrixAutoUpdate)

		for (let p in props) {
			switch (p) {
				case "background":
					scene[p] = new Color(props[p])
					break
			}
		}

		//updateSceneMatrixWorld(true)

		return () => {
			if (logInfo) console.info("SVELTHREE > onDestroy : Scene")
			// TODO  remove self from svelthreeStore
		}
	})

	// call this to remove the renderer component listener
	let removeUpdateOnRenderListener: () => void

	export let update: "before_render" | "change" = undefined

	$: scene.autoUpdate === false && update === "before_render" && $svelthreeStores[sti].rendererComponent
		? startUpdateOnRenderListener()
		: stopUpdateOnRenderListener()

	function startUpdateOnRenderListener() {
		//console.log("startUpdateOnRenderListener call!")
		if (!removeUpdateOnRenderListener) {
			//console.log("startUpdateOnRenderListener creation!")
			removeUpdateOnRenderListener = $svelthreeStores[sti].rendererComponent.$on(
				"before_render_scene",
				updateSceneMatrixWorldOnRender
			)
		}
	}

	function stopUpdateOnRenderListener() {
		if (removeUpdateOnRenderListener) {
			removeUpdateOnRenderListener()
		}
	}

	function updateSceneMatrixWorldOnRender() {
		//console.log("Scene updateSceneMatrixWorld 'render'!")
		updateSceneMatrixWorld()
	}

	// kicks off updating matrixWorld of the whole scene graph
	function updateSceneMatrixWorld(force: boolean = false) {
		if (scene.parent === null) {
			if (scene.matrixAutoUpdate === false) {
				scene.matrixWorldNeedsUpdate ? scene.updateMatrix() : null
			}
			scene.updateMatrixWorld(force)
		}
	}

	let updateTime
	let timeBefore
	let timeAfter
	let dirty = false

	beforeUpdate(() => {
		//console.warn("***** Scene beforeUpdate!")
		if (logLC) logCurrentState("%c----> Scene > beforeUpdate", css_ba)
		if (!dirty) {
			timeBefore = performance.now()
		}
		dirty = true
	})

	// PERFORMANCE  IMPORTANT  NOT BOTTLENECK --> commenting out doesn't significantly improve performance

	afterUpdate(() => {
		updateSceneMatrices()
	})

	function updateSceneMatrices() {
		if (scene) {
			if (scene.autoUpdate === false && update === "change") {
				//await tick()

				if (dirty) {
					//console.warn("##### Scene afterUpdate 'change'")
					//debugger
					updateSceneMatrixWorld()
					dirty = false

					timeAfter = performance.now()
					updateTime = timeAfter - timeBefore
					if (logLC) logCurrentState("%c----> Scene > afterUpdate", css_aa, updateTime)
				}
			}
		} else {
			throw new Error(
				"SVELTHREE Exception! > Oops, 'scene' is not available on 'afterUpdate', this is very wrong!"
			)
		}
	}

	function logCurrentState(prefix: string, css: string, upt?: number) {
		console.log(`${prefix}!`, `${css}`, upt ? "update time: " + upt : "")
	}

	// public methods

	export function getScene(): Scene {
		return scene
	}

	export function getId(): string {
		return id
	}
</script>

<slot {scene} />
