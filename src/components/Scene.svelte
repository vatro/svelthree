<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _Scene_ Component.  
[ tbd ]  Link to Docs.
-->
<script lang="ts">
	import { afterUpdate, beforeUpdate, onMount } from "svelte"
	import { Color, Scene } from "three"
	import { svelthreeStores } from "../stores"
	import { get_current_component } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

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
		if (verbose && log_lc && (log_lc.all || log_lc.om)) console.info(...c_lc(c_name, "onMount"))
		if (verbose && log_dev) console.debug(...c_dev(c_name, "sti", sti))
		if (verbose && log_mau) {
			console.debug(...c_dev(c_name, "onMount -> scene.matrixAutoUpdate:", scene.matrixAutoUpdate))
		}

		for (let p in props) {
			switch (p) {
				case "background":
					scene[p] = new Color(props[p])
					break
			}
		}

		//updateSceneMatrixWorld(true)

		return () => {
			if (verbose && log_lc && (log_lc.all || log_lc.od)) console.info(...c_lc(c_name, "onDestroy"))
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
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "startUpdateOnRenderListener call!"))
		if (!removeUpdateOnRenderListener) {
			//if (verbose && log_dev) console.debug(...c_dev(c_name, "startUpdateOnRenderListener creation!"))
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
		//if (verbose && log_dev) console.debug(...c_dev(c_name, "updateSceneMatrixWorldOnRender! (Scene updateSceneMatrixWorld 'render'!"))
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
		if (verbose && log_lc && (log_lc.all || log_lc.bu)) console.info(...c_lc(c_name, "beforeUpdate"))
		if (!dirty) {
			timeBefore = performance.now()
		}
		dirty = true
	})

	// PERFORMANCE  IMPORTANT  NOT BOTTLENECK --> commenting out doesn't significantly improve performance

	afterUpdate(() => {
		if (verbose && log_lc && (log_lc.all || log_lc.au)) console.info(...c_lc(c_name, "afterUpdate"))
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

					if (verbose && log_dev) {
						console.debug(...c_dev(c_name, "afterUpdate > updateSceneMatrices! ->", { updateTime }))
					}
				}
			}
		} else {
			throw new Error(
				"SVELTHREE Exception! > Oops, 'scene' is not available on 'afterUpdate', this is very wrong!"
			)
		}
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
