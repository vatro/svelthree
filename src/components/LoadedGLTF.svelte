<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!-- 
@component
This is a **svelthree** _LoadedGLTF_ Component.  
 TODO  Link to Docs.
-->
<script lang="ts">
	import { createEventDispatcher } from "svelte"
	import type { Group, LoadingManager } from "three"
	import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
	import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
	import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader"
	import { get_current_component } from "svelte/internal"
	import { c_rs, c_lc, c_mau, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"

	const c_name = get_comp_name(get_current_component())
	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	const dispatch: (type: string, detail?: any) => void = createEventDispatcher()

	// @see https://threejs.org/docs/#manual/en/introduction/Loading-3D-models

	// construction
	export let name: string = undefined

	export let path: string = undefined
	export let async: boolean = undefined

	// optional attributes
	export let draco: boolean = undefined
	export let dracoPath: string = undefined

	if (!dracoPath && draco) {
		console.warn("SVELTHREE > LoadedGLTF : You need to provide a 'dracoPath' prop if you use Draco!", {
			path: path
		})
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	/*
     see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin
      TODO  implement crossOrigin
    */
	//export let crossOrigin = "" // default 'anonymous' same as ""

	export let manager: LoadingManager

	let loader: GLTFLoader
	let dracoLoader: DRACOLoader
	let content: GLTF

	manager ? (loader = new GLTFLoader()) : (loader = new GLTFLoader(manager))

	draco
		? ((dracoLoader = new DRACOLoader()), dracoLoader.setDecoderPath(dracoPath), loader.setDRACOLoader(dracoLoader))
		: null

	// we want this to be reactive, so we can change GLTF  TODO  check it
	$: if (path) {
		doLoad()
	} else {
		console.warn("SVELTHREE > LoadedGLTF : You have to provide a 'path' prop!", { path: path })
		throw new Error("SVELTHREE Exception (see warning above)")
	}

	function onProgress(xhr: ProgressEvent): void {
		dispatch("progress", { total: xhr.total, loaded: xhr.loaded })
	}

	function doLoad(): void {
		//loaded = false // we could display something else here when loading?

		if (async) {
			loader.loadAsync(path, onProgress).then((loadedGLTF: GLTF) => {
				content = loadedGLTF
				dispatch("loaded")
			})
		} else {
			loader.load(
				path,
				function (loadedGLTF) {
					content = loadedGLTF
					dispatch("loaded")
				},
				// called while loading is progressing
				function (xhr: ProgressEvent) {
					dispatch("progress", {
						total: xhr.total,
						loaded: xhr.loaded
					})
				},
				function (error) {
					console.error("SVELTHREE > LoadedGLTF : doLoad : An error happened!", error)
				}
			)
		}
	}

	// public methods

	export function getAllScenes(): Group[] {
		return content.scenes
	}

	export function getContent(): GLTF {
		return content
	}
</script>
