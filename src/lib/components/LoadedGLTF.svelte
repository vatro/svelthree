<!--
@component
**svelthree** _LoadedGLTF_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	type CurrentComponentType = import("./LoadedGLTF.svelte").default

	type BoxHelperParams = ConstructorParameters<typeof BoxHelper>

	export interface IStateLoadedGLTF {
		readonly log_all: boolean
		readonly log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined
		readonly log_rs: boolean
		readonly log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined
		readonly log_mau: boolean
		readonly button: PropButton | undefined
		readonly link: PropLink | undefined
		readonly container: Object3D | undefined | null
		readonly name: string | undefined
		readonly tabindex: number | undefined
		readonly aria: Partial<ARIAMixin> | undefined
		readonly add: boolean
		readonly url: string | undefined
		readonly draco: string | undefined
		readonly manager: LoadingManager | undefined
		readonly content: GLTF | undefined
		readonly afterLoaded: GLTFAfterLoadedTask[] | undefined
		readonly mau: boolean | undefined
		readonly matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined
		readonly props: PropsLoadedGLTF | undefined
		readonly pos: Vector3 | Parameters<Vector3["set"]> | undefined
		readonly rot:
			| Euler
			| Parameters<Euler["set"]>
			| Quaternion
			| Parameters<Quaternion["set"]>
			| Vector3
			| Parameters<Vector3["set"]>
			| undefined
		readonly quat: Quaternion | Parameters<Quaternion["set"]> | undefined
		readonly scale: Vector3 | Parameters<Vector3["set"]> | number | undefined
		readonly lookAt: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null
		readonly castShadow: boolean | undefined
		readonly receiveShadow: boolean | undefined
		readonly boxParams: RemoveFirst<BoxHelperParams> | undefined
		readonly box: boolean | undefined
		readonly interact: boolean | undefined | null
		readonly block: boolean
		readonly modifiers: SvelthreeModifiersProp | undefined
		readonly on_click: SvelthreePointerEventHandler | undefined
		readonly on_pointerup: SvelthreePointerEventHandler | undefined
		readonly on_pointerdown: SvelthreePointerEventHandler | undefined
		readonly on_pointerover: SvelthreePointerEventHandler | undefined
		readonly on_pointerout: SvelthreePointerEventHandler | undefined
		readonly on_pointermove: SvelthreePointerEventHandler | undefined
		readonly on_pointermoveover: SvelthreePointerEventHandler | undefined
		readonly on_keydown: SvelthreeKeyboardEventHandler | undefined
		readonly on_keypress: SvelthreeKeyboardEventHandler | undefined
		readonly on_keyup: SvelthreeKeyboardEventHandler | undefined
		readonly on_focus: SvelthreeFocusEventHandler | undefined
		readonly on_blur: SvelthreeFocusEventHandler | undefined
		readonly on_focusin: SvelthreeFocusEventHandler | undefined
		readonly on_focusout: SvelthreeFocusEventHandler | undefined
		readonly on_wheel: SvelthreeWheelEventHandler | undefined
		readonly on_wheelover: SvelthreeWheelEventHandler | undefined
		readonly animation: SvelthreeAnimationFunction | undefined
		readonly aniauto: boolean | undefined
		readonly onMountReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly beforeUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly afterUpdateStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly afterUpdateEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly afterUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
	}
</script>

<script lang="ts">
	import type { Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext, tick } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger.js"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger.js"
	import type { SvelthreeLifecycleCallback } from "../types/types-extra.js"
	import type { SvelthreeShadowDOMElement } from "../types/types-extra.js"

	import { remove_instance, recreate_shadow_dom_el, set_initial_userdata } from "../logic/shared/index.js"

	import type { Euler, Matrix4, Quaternion, Vector3 } from "three"
	import type { Targetable } from "../types/types-extra.js"

	import { svelthreeStores } from "../stores/index.js"
	import { PropUtils, SvelthreeProps } from "../utils/index.js"

	import { SvelthreeAni } from "../ani/index.js"
	import type { SvelthreeAnimationFunction, SvelthreeAnimation } from "../types/types-extra.js"

	import SvelthreeInteraction from "../components-internal/SvelthreeInteraction.svelte"
	import type { RaycastArray } from "../utils/RaycastArray.js"

	import { createEventDispatcher } from "svelte"
	import type { EventMapAllEventDetails, EventMapAllEvents } from "../types/types-extra.js"

	import type { Writable } from "svelte/store"
	import type { SvelthreeModifiersProp } from "../types/types-extra.js"
	import type {
		SvelthreePointerEventHandler,
		SvelthreeFocusEventHandler,
		SvelthreeKeyboardEventHandler,
		SvelthreeWheelEventHandler
	} from "../types/types-extra.js"

	import { BoxHelper } from "three"
	import { get_root_scene } from "../utils/SceneUtils.js"

	import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
	import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
	import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
	import type { AnimationClip, Group, Camera, Mesh, Light } from "three"
	import type { PropsLoadedGLTF } from "../types/types-comp-props.js"
	import type { LoadingManager } from "three"
	import { Object3D } from "three"
	import type { RemoveFirst, GLTFAfterLoadedTask } from "../types/types-extra.js"
	import type { PropButton, PropLink } from "../types/types-comp-props.js"
	import { GLTF_afterLoaded, GLTF_utils } from "../utils/index.js"

	/**
	 *  SVELTEKIT  CSR ONLY /
	 * Atm, all logic using 'document' or 'window' is wrapped in an 'if (browser)' check,
	 * and should run on CLIENT ONLY.
	 */
	const browser = !import.meta.env.SSR

	const self = get_current_component()
	const c_name = get_comp_name(self)
	/** svelthree component's type (e.g. `type` prop value of component `Foo` will be `'Foo'`) */
	export const type: string = c_name

	const verbose: boolean = verbose_mode()

	export let log_all = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	const dispatch = createEventDispatcher()

	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	interface $$Events extends EventMapAllEvents {}

	const dispatch_interaction = createEventDispatcher<EventMapAllEventDetails>()

	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")
	const store = $svelthreeStores[sti]

	/** The (three) instance that was shared to this component as it's 'parent' which can be either another instance / object or a scene / root scene. */
	let our_parent: Object3D | undefined = undefined

	/** Shadow DOM element generated by our parent scene / root scene. Used as fallback if this component has no non-`Scene` component as parent. */
	let scene_shadow_dom_el: SvelthreeShadowDOMElement = getContext("scene_shadow_dom_el")

	/** Shadow DOM element generated by our parent component (_not `Canvas`_) shared with this component (child) via context.
	Fallback is `scene_shadow_dom_el` or `shadow_root_el` in case of the `Scene` component. */
	let our_parent_shadow_dom_el: SvelthreeShadowDOMElement | undefined = undefined

	/** Shadow DOM element generated by this component. Shared by this component (as parent) to it's children via context as "parent_shadow_dom_el". */
	let shadow_dom_el: SvelthreeShadowDOMElement | undefined | null = undefined
	export const get_shadow_dom_el = (): SvelthreeShadowDOMElement | undefined | null => shadow_dom_el

	/** Specify the component / three.js object instance to act as an HTML `<button>` element. */
	export let button: PropButton | undefined = undefined

	/** Specify the component / three.js object instance to act as an HTML `<a>` element. */
	export let link: PropLink | undefined = undefined

	/** Returns the `container` instance created by the component.
	 * If the `add` attribute is set to `true` (_default_) the contents of the loaded GLTF will be added to the `container`,
	 * which will then be added to it's parent component / parent object (three) instance.
	 * If the `add` attribute is set to `false`, the `container` instance will be `undefined`
	 * and you'll have to manage adding loaded GLTF assets to your scene graph by yourself. */
	export let container: Object3D | undefined | null = undefined
	let container_uuid: string | undefined | null = undefined

	/** Sets the `name` property of the created / injected three.js instance. */
	export let name: string | undefined = undefined

	export const is_svelthree_component = true
	export const is_svelthree_container = true

	$: if (!container) {
		container = new Object3D()

		set_initial_userdata(container, self)

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${container.type} created!`, { container }))
	}

	// ---  AFTER  INITIALIZATION  --- //

	// set container_uuid the first time
	$: if (container && container_uuid === undefined) set_uuid()

	function set_uuid(): void {
		container_uuid = container?.uuid
	}

	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'LoadedGLTF'!

	// Determining 'parent' if 'container' instance has to be created first / was not provided on initialization ('create' is true).
	$: if (container && !our_parent) set_parent()

	function set_parent() {
		// get the instance that was shared to us as our 'parent' or use fallback.

		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", container)
	}

	//  IMPORTANT  TODO
	// - see https://github.com/vatro/svelthree/issues/114
	// - see https://github.com/vatro/svelthree/issues/103

	$: if (container && our_parent_shadow_dom_el === undefined) {
		our_parent_shadow_dom_el = getContext("parent_shadow_dom_el") || scene_shadow_dom_el
	}

	//  IMPORTANT  TODO
	// - see https://github.com/vatro/svelthree/issues/114
	// - see https://github.com/vatro/svelthree/issues/103

	$: if (our_parent_shadow_dom_el !== undefined) {
		// SVELTEKIT  CSR ONLY /
		if (browser) create_shadow_dom()
	}

	function create_shadow_dom(): void {
		// create / recreate and share our own shadow_dom_el as parent_shadow_dom_el
		shadow_dom_el = recreate_shadow_dom_el(shadow_dom_el, our_parent_shadow_dom_el, button, link, c_name)

		if (shadow_dom_el) {
			setContext("parent_shadow_dom_el", shadow_dom_el)
		} else {
			if (!shadow_dom_el) console.error(`SVELTHREE > ${c_name} : 'shadow_dom_el' was not created!`, shadow_dom_el)
		}
	}

	// accessability -> shadow dom focusable
	export let tabindex: number | undefined = undefined

	$: if (shadow_dom_el && tabindex !== undefined) {
		shadow_dom_el.tabIndex = tabindex
	}

	// accessability -> shadow dom wai-aria
	export let aria: Partial<ARIAMixin> | undefined = undefined

	$: if (shadow_dom_el && aria !== undefined) {
		for (const key in aria) {
			if (key === "ariaLabel") {
				// add specified `ariaLabel` as text to shadow DOM `<div>` element ONLY (for better reader support / indexing (?))
				if (!link && !button) {
					//  TODO  RECONSIDER  needs to be tested more, may be obsolete (?).
					shadow_dom_el.innerText += `${aria[key]}`
				}
			}

			try {
				Object.assign(shadow_dom_el, aria)
			} catch (err) {
				console.error(err)
			}
		}
	}

	/** If the `add` attribute is set to `true` (_default_) the contents of the loaded GLTF will be added to the `container`,
	 * which will then be added to it's parent component / parent object (three) instance.
	 * If the `add` attribute is set to `false`, the `container` instance will be `undefined`
	 * and you'll have to manage adding loaded GLTF assets to your scene graph by yourself. */
	export let add = true

	/** GLTF file `url` (_or path_). */
	export let url: string | undefined = undefined

	/** The url or path to the _Draco Decoder_.
	 * If set a [`DRACOLoader`](https://threejs.org/docs/#examples/en/loaders/DRACOLoader) instance will be created / used to decode compressed mesh data.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) */
	export let draco: string | undefined = undefined

	/*
     see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin
      TODO  implement crossOrigin
    */
	//export let crossOrigin = "" // default 'anonymous' same as ""

	/** Specify a [`LoadingManager`](https://threejs.org/docs/#api/en/loaders/managers/LoadingManager).
	 * If not specified a [`DefaultLoadingManager`](https://threejs.org/docs/#api/en/loaders/managers/DefaultLoadingManager) will be used. */
	export let manager: LoadingManager | undefined = undefined

	let loader: GLTFLoader
	let dracoLoader: DRACOLoader
	export let content: GLTF | undefined = undefined

	$: if (manager) {
		loader = new GLTFLoader(manager)
	} else {
		loader = new GLTFLoader()
	}

	$: if (draco) {
		dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(draco)
		loader.setDRACOLoader(dracoLoader)
	}

	// TODO  Do we want this to be reactive, so we can change the GLTF file on-the-fly?
	// SVELTEKIT  CSR ONLY
	$: if (browser) {
		if (url) {
			doLoad()
		} else {
			console.warn(`SVELTHREE > ${c_name} : You have to provide an 'url' attribute to load some GLTF file!`, {
				url
			})
		}
	}

	function onProgress(xhr: ProgressEvent): void {
		dispatch("progress", { total: xhr.total, loaded: xhr.loaded })
	}

	function doLoad(): void {
		// TODO  loading progress display

		if (url) {
			loader.loadAsync(url, onProgress).then((loadedGLTF: GLTF) => {
				content = loadedGLTF
				if (afterLoaded?.length) process_afterLoaded()
				dispatch("loaded")
			})
		} else {
			console.warn(
				`SVELTHREE > ${c_name} > doLoad:  You have to provide an 'url' attribute to load some GLTF file!`,
				{ url }
			)
		}
	}

	/** An Array of tasks to perform with the loaded GLTF content, these can be any of the `GLTF_afterLoaded`-utility methods / tasks (_static_) or your own method.
	 *
	 * _Example:_
	 * ```
	 * const my_after_loaded_task = (gltf_content: GLTF) => {...}
	 *
	 * <LoadedGLTF afterLoaded = {[
	 * 		GLTF_afterLoaded.remove_all_lights,
	 * 		GLTF_afterLoaded.for_all_meshes({...}),
	 * 		my_after_loaded_task
	 * ]}
	 * />
	 * ```
	 * */
	export let afterLoaded: GLTFAfterLoadedTask[] | undefined = undefined

	async function process_afterLoaded() {
		dispatch("afterLoaded_start")
		//console.log("processAfterLoaded started!")

		if (content) {
			if (afterLoaded?.length) {
				for (const fn of afterLoaded) {
					await fn(content)
				}
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > process_afterLoaded : 'content' not available!`, { content })
		}

		//console.log("processAfterLoaded finished!")
		dispatch("afterLoaded_finished")
	}

	$: if (content && add) add_content()

	function add_content(): void {
		if (container) {
			if (container.parent === null) {
				if (our_parent) {
					if (content) {
						if (content.scenes?.length > 1) {
							for (let i = 0; i < content.scenes.length; i++) {
								container.add(content.scenes[i])
							}
						} else if (content.scene) {
							container.add(content.scene)
						}
					} else {
						console.warn(`SVELTHREE > ${c_name} > add_content : no 'content' available!`, { content })
					}
					our_parent.add(container)
				} else {
					console.error(
						`SVELTHREE > ${c_name} > add_content : Cannot add 'container' to unavailable 'our_parent')!`,
						{ our_parent }
					)
				}
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > add_content : 'container' not available!`, { container })
		}
	}

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean | undefined = undefined
	$: if (container) container.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (container && mau !== undefined) container.matrixAutoUpdate = mau

	$: if (container && name) container.name = name
	$: if (shadow_dom_el && name) shadow_dom_el.dataset.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties of the created / injected three.js instance via an `Object Literal`. */
	export let props: PropsLoadedGLTF | undefined = undefined

	$: if (!sProps && container && props) sProps = new SvelthreeProps(container)
	$: if (props && sProps) update_props()
	function update_props() {
		if (props) {
			if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
			sProps.update(props)
		}
	}

	// IMPORTANT  following 'shorthand' attributes will override `props` attribute!

	/** **shorthand** attribute for setting the `position` property of the created / injected three.js instance. */
	export let pos: Vector3 | Parameters<Vector3["set"]> | undefined = undefined
	$: !matrix && container && pos ? set_pos() : pos && container ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))

		if (container && pos) {
			PropUtils.setPositionFromValue(container, pos)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_pos : invalid 'container' instance and / or 'pos' value!`, {
				container,
				pos
			})
		}
	}

	/** **shorthand** attribute for setting the `rotation` property of the created / injected three.js instance. */
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]>
		| undefined = undefined
	$: !matrix && !quat && container && rot ? set_rot() : rot && container ? console.warn(w_sh.rot) : null
	function set_rot() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rot", rot))

		if (container && rot !== undefined) {
			PropUtils.setRotationFromValue(container, rot)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_rot : invalid 'container' instance and / or 'rot' value!`, {
				container,
				rot
			})
		}
	}

	/** **shorthand** attribute for setting the `quaternion` property of the created / injected three.js instance. */
	export let quat: Quaternion | Parameters<Quaternion["set"]> | undefined = undefined
	$: !matrix && container && quat ? set_quat() : quat && container ? console.warn(w_sh.quat) : null
	function set_quat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "quat", quat))

		if (container && quat) {
			PropUtils.setQuaternionFromValue(container, quat)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_quat : invalid 'container' instance and / or 'quat' value!`, {
				container,
				quat
			})
		}
	}

	export let scale: Vector3 | Parameters<Vector3["set"]> | number | undefined = undefined
	$: !matrix && container && scale ? set_scale() : scale && container ? console.warn(w_sh.scale) : null
	function set_scale() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "scale", scale))

		if (container && scale !== undefined) {
			PropUtils.setScaleFromValue(container, scale)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_scale : invalid 'container' instance and / or 'scale' value!`, {
				container,
				scale
			})
		}
	}

	/** **shorthand** attribute for calling the `svelthree`-custom `lookAt` method with the provided value as argument. */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null = undefined
	$: !matrix && container && lookAt ? set_lookat() : lookAt && container ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		if (container && lookAt) {
			PropUtils.setLookAtFromValue(container, lookAt)
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_lookat : invalid 'container' instance and / or 'lookAt' value!`,
				{ container, lookAt }
			)
		}
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && container) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		if (container && matrix) {
			PropUtils.setMatrixFromValue(container, matrix)
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_matrix : invalid 'container' instance and / or 'matrix' value!`,
				{ container, matrix }
			)
		}
	}

	export let castShadow: boolean | undefined = undefined
	$: if (castShadow !== undefined && content) GLTF_afterLoaded.for_all_meshes({ castShadow })(content)

	export let receiveShadow: boolean | undefined = undefined
	$: if (receiveShadow !== undefined && content) GLTF_afterLoaded.for_all_meshes({ receiveShadow })(content)

	/** The root scene -> `scene.parent = null`. */
	let root_scene: Scene | undefined = undefined
	let root_scene_obj: { value: Scene | undefined } = { value: undefined }

	$: if (root_scene === undefined) {
		root_scene = get_root_scene(getContext("scene"))
		root_scene_obj.value = root_scene
	}

	$: if (container && root_scene) {
		container.userData.root_scene = root_scene
	}

	export let boxParams: RemoveFirst<BoxHelperParams> | undefined = undefined
	/** Creates and adds a `BoxHelper`. */
	export let box: boolean | undefined = undefined

	/** Removes `WebGLRenderer` `"update_helpers"` event listener. */
	let remove_update_box_on_render_event: (() => void) | undefined | null = undefined

	$: if (box && container && !container.userData.box) add_box_helper()
	$: if (!box && container?.userData.box) remove_box_helper()

	function add_box_helper() {
		if (container) {
			if (boxParams) {
				container.userData.box = new BoxHelper(container, ...boxParams)
			} else {
				container.userData.box = new BoxHelper(container)
			}

			container.userData.box.visible = false
		} else {
			console.error(`SVELTHREE > ${c_name} > Cannot add box helper to unavailable 'container' instance!`, {
				container
			})
		}
	}

	// update and show box on next frame
	$: if (box && container && container.userData.box && $svelthreeStores[sti]?.rendererComponent && root_scene) {
		apply_box()
	}

	function apply_box(): void {
		if (container) {
			if (!container.userData.box.parent) {
				// add all boxes to the root scene!
				if (root_scene) {
					root_scene.add(container.userData.box)
				} else {
					console.error(`SVELTHREE > ${c_name} > Cannot add box helper to invalid 'root_scene' instance!`, {
						root_scene
					})
				}
			}

			// update box and make it visible
			container.userData.box.update()
			container.userData.box.visible = true

			// start updating
			if (!remove_update_box_on_render_event) {
				remove_update_box_on_render_event = store?.rendererComponent?.$on("update_helpers", update_box)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > apply_box : invalid 'container' instance value!`, { container })
		}
	}

	function update_box(): void {
		// `container` may have been nullified by `clear()`
		if (container) container.userData.box.update()
	}

	function remove_box_helper(): void {
		if (remove_update_box_on_render_event) {
			remove_update_box_on_render_event()
			remove_update_box_on_render_event = null
		}

		// `container` may have been nullified by `clear()`
		if (container?.userData.box?.parent) {
			container.userData.box.parent.remove(container.userData.box)
			container.userData.box = null
		}
	}

	/** Make component's three.js object interactive -> enable raycasting, `on:<event_name>` directives and `on_<event_name>` internal actions. */
	export let interact: boolean | undefined | null = undefined

	/**
	 * Adds component's three.js object instance to the `raycast` array even if it's not set to `interact` ( _no interaction listeners_ ).
	 * This way the object acts as a pure _interaction occluder / blocker_ -> will be detected / intersected by `Raycaster`'s ray.
	 *
	 * Setting the `block` prop makes sense only if the `interact` prop is not set / set to `false`.
	 * In case `interact` prop is set / set to `true`, but no e.g. `on:<event_name>` directives or `on_<event_name>` internal actions are set,
	 * the object will automatically become an _interaction occluder / blocker_.
	 */
	export let block = false

	const interaction_on_clear: {
		interact: boolean | undefined | null
		block: boolean | undefined | null
	} = {
		interact: undefined,
		block: undefined
	}

	$: if (container) restore_interaction_props()
	async function restore_interaction_props(): Promise<void> {
		//console.warn(`comp '${name}' restore_interaction_props!`, { container, container_uuid, interact: container.userData.interact })
		if (typeof interaction_on_clear.interact === "boolean") {
			await tick()

			//console.warn(`comp '${name}' restoring 'interact' prop!`, interaction_on_clear.interact)
			interact = interaction_on_clear.interact
			interaction_on_clear.interact = null

			if (interaction_on_clear.block !== undefined && interaction_on_clear.block !== null) {
				//console.warn(`comp '${name}' restoring 'block' prop!`, interaction_on_clear.block)
				block = interaction_on_clear.block
				interaction_on_clear.block = null
			}
		}
	}

	let interactive: boolean | undefined = undefined
	const canvas_interactivity: Writable<{ enabled: boolean }> = getContext("canvas_interactivity")

	$: interactive = $canvas_interactivity.enabled

	let interactionEnabled: boolean | undefined = undefined
	$: interactionEnabled = !!interactive && !!interact

	//  IMPORTANT  not reactive
	const raycast: RaycastArray = getContext("raycast")

	// Reactively DISABLE raycasting to the created three.js instance. Only `interact` is set and `block` is false (default).
	// + `block` will be changed automatically based on pointer listeners total count via `SvelthreeInteraction` component.
	$: if (interactionEnabled && raycast && !block && container) {
		if (!raycast.includes(container)) {
			container.userData.block = false
			raycast.push(container)
		} else {
			container.userData.block = false
		}
	}

	// Reactively ENABLE raycasting to the created three.js instance -> 'interaction occluder / blocker'.
	// Only `block` is set / `true` but no `interact` / set to `false`. Since `interact` is `false`,
	// `block` will NOT be changed via `SvelthreeInteraction` component (not rendered).
	$: if (!interactionEnabled && raycast && block && container) {
		if (!raycast.includes(container)) {
			container.userData.block = true
			raycast.push(container)
		} else {
			container.userData.block = true
		}
	}

	// Reactively DISABLE raycasting to the created three.js instance. Neither `block` nor `interact` are set / are both `false`.
	// Since `interact` is `false`, `block` will NOT be changed via `SvelthreeInteraction` component (not rendered).
	$: if (!interactionEnabled && raycast && !block && container) {
		if (raycast.includes(container)) {
			raycast.splice(container.userData.index_in_raycast, 1)
			container.userData.block = false
		}
	}

	/** `SvelthreeInteraction` component reference used for reactive listener management only. */
	let interaction_comp: SvelthreeInteraction | undefined = undefined

	/**
	 * **svelthree** replacement for [`$on`](https://svelte.dev/docs#run-time-client-side-component-api-$on), does basically the same,
	 * but it doesn't return a function for removal of the listener (_like Svelte native does_), instead use `.onx(type, callback)` syntax.
	 * Needed for **reactive** interaction listener management -> _internal svelthree functionality_.
	 *
	 * ☝️ _Can be used with **interactive components only** -> `interact` prop has to be `true`._
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export const on = async (type: any, callback: any): Promise<void> => {
		if (interact) {
			if (!interaction_comp || !shadow_dom_el) await tick()

			self.$on(type, callback)
			if (interaction_comp) {
				interaction_comp.$set({ update_listeners: true })
			} else {
				console.error("SVELTHREE > Mesh > on : Couldn't update listeners, 'interaction_comp' not available!", {
					interaction_comp
				})
			}
		} else {
			console.error(
				"SVELTHREE > Mesh > on : You can call the '.on(...)' function with interactive components only! Component's 'interact' prop has to be 'true'."
			)
		}
	}

	/**
	 * **svelthree** replacement for the _event listener removal function_ returned by [`$on`](https://svelte.dev/docs#run-time-client-side-component-api-$on), does basically the same,
	 * needed for **reactive** interaction listener management -> _internal svelthree functionality_. It additionaly allows programmatic removal of all callbacks of a certain type and
	 * programmatic removal of 'forwarding' directives (no handlers) like `on:click`.
	 *
	 * ☝️ _Can be used with **interactive components only** -> `interact` prop has to be `true`._
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export const onx = async (type: any, callback: any): Promise<void> => {
		if (interact) {
			if (!interaction_comp || !shadow_dom_el) await tick()

			const cbacks = self.$$.callbacks[type]
			if (callback) {
				const index = cbacks.indexOf(callback)
				if (index !== -1) cbacks.splice(index, 1)
			} else {
				// allows e.g. onx("click") -> will remove all callbacks and the callback type itself
				// this way we can also programatically delete 'forwarding' directives (no handlers) like `on:click`
				self.$$.callbacks[type].length = 0
				delete self.$$.callbacks[type]
			}

			if (interaction_comp) {
				interaction_comp.$set({ update_listeners: true })
			} else {
				console.error("SVELTHREE > Mesh > on : Couldn't update listeners, 'interaction_comp' not available!", {
					interaction_comp
				})
			}
		} else {
			console.error(
				"SVELTHREE > Mesh > onx : You can call the '.onx(...)' function with interactive components only! Component's 'interact' prop has to be 'true'!"
			)
		}
	}

	/** Interaction modifiers. */
	export let modifiers: SvelthreeModifiersProp | undefined = undefined

	export let on_click: SvelthreePointerEventHandler | undefined = undefined
	$: if (on_click !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_pointerup: SvelthreePointerEventHandler | undefined = undefined
	$: if (on_pointerup !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_pointerdown: SvelthreePointerEventHandler | undefined = undefined
	$: if (on_pointerdown !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_pointerover: SvelthreePointerEventHandler | undefined = undefined
	$: if (on_pointerover !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_pointerout: SvelthreePointerEventHandler | undefined = undefined
	$: if (on_pointerout !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_pointermove: SvelthreePointerEventHandler | undefined = undefined
	$: if (on_pointermove !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_pointermoveover: SvelthreePointerEventHandler | undefined = undefined
	$: if (on_pointermoveover !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_keydown: SvelthreeKeyboardEventHandler | undefined = undefined
	$: if (on_keydown !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_keypress: SvelthreeKeyboardEventHandler | undefined = undefined
	$: if (on_keypress !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_keyup: SvelthreeKeyboardEventHandler | undefined = undefined
	$: if (on_keyup !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_focus: SvelthreeFocusEventHandler | undefined = undefined
	$: if (on_focus !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_blur: SvelthreeFocusEventHandler | undefined = undefined
	$: if (on_blur !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_focusin: SvelthreeFocusEventHandler | undefined = undefined
	$: if (on_focusin !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_focusout: SvelthreeFocusEventHandler | undefined = undefined
	$: if (on_focusout !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_wheel: SvelthreeWheelEventHandler | undefined = undefined // ->  TODO  implement
	$: if (on_wheel !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	export let on_wheelover: SvelthreeWheelEventHandler | undefined = undefined // -> TODO  implement
	$: if (on_wheelover !== undefined && interaction_comp && shadow_dom_el) {
		interaction_comp.$set({ update_listeners: true })
	}

	/** Animation logic to be performed with the (three) object instance created by the component. */
	export let animation: SvelthreeAnimationFunction | undefined = undefined

	let animationEnabled = false
	$: if (animation) animationEnabled = true

	/** Immediately start provided animation, default: `false`. Alternative: `<component_reference>.start_animation()` or shorter `.start_ani()`. */
	export let aniauto: boolean | undefined = undefined

	/** (_internal_) reference to the `SvelthreeAni` instance */
	let ani: SvelthreeAni
	$: if (animation && animationEnabled) ani = new SvelthreeAni(scene, container, animation, !!aniauto)

	let currentSceneActive: boolean | undefined = undefined
	$: currentSceneActive = $svelthreeStores[sti]?.scenes[scene?.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** Removes the (three) instance created by / provided to the component from it's parent. */
	export const remove_instance_from_parent = async (): Promise<boolean> => {
		if (container) {
			const removed: boolean = remove_instance(container, "container")
			return removed
		} else {
			console.error(`SVELTHREE > ${c_name} > remove_instance_from_parent : invalid 'container' instance value!`, {
				container
			})
			return false
		}
	}
	/**
	 * Same as `remove_instance_from_parent()` just shorter syntax.
	 * Removes the (three) instance of the object created by the component from it's parent.
	 */
	export const remove = remove_instance_from_parent

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): Object3D | undefined | null => container

	export const get_animations = (): AnimationClip[] | undefined => content?.animations
	export const get_scene = (): Group | undefined => content?.scene
	export const get_scenes = (): Group[] | undefined => content?.scenes
	export const get_cameras = (): Camera[] | undefined => content?.cameras
	export const get_asset = (): GLTF["asset"] | undefined => content?.asset
	export const get_scene_meshes = async (): Promise<Mesh[]> => await GLTF_utils.get_all_scene_meshes(content?.scene)
	export const get_all_meshes = async (): Promise<Mesh[]> => await GLTF_utils.get_all_meshes(content)
	export const get_scene_lights = async (): Promise<Light[]> => await GLTF_utils.get_all_scene_lights(content?.scene)
	export const get_all_lights = async (): Promise<Light[]> => await GLTF_utils.get_all_lights(content)

	/** Returns the `animation` object. */
	export const get_animation = (): SvelthreeAnimation | undefined => ani.getAnimation()
	/** Same as `get_animation()` just shorter syntax. Returns the `animation` object. */
	export const get_ani = get_animation

	/** Starts the `animation` object. */
	export const start_animation = (): void => ani.startAnimation()
	/** Same as `start_animation()` just shorter syntax. Starts the `animation` object. */
	export const start_ani = start_animation

	/** Sets `focus()` on the component / it's shadow dom element. */
	export const focused = (): void => {
		if (shadow_dom_el) {
			shadow_dom_el.focus()
		} else {
			console.error(
				`SVELTHREE > ${c_name} > Cannot set 'focus' because component's ShadowDOM-Element is not available!`,
				{ shadow_dom_el }
			)
		}
	}

	/**
	 * Primarily for internal usage. Clears all references to the currently managed three.js instance.
	 * Called by `remove_instance(...)` / `clear_old_component()` if the instance has been
	 * assigned to some other component (_before_).
	 */
	export const clear = () => {
		//console.warn(`CLEAR! -> ${name}`)

		interaction_on_clear.interact = interact
		interaction_on_clear.block = block
		interact = null

		container = null

		// IMPORTANT //
		// has to be set to `null`, `undefined` would set `container_uuid` if a cleared component recevies a container
		// we don't want that, beacuse then the `handle_instance_change` wouldn't be triggered!
		container_uuid = null
	}

	import type { SvelthreeComponentShadowDOMChild } from "../types/types-extra.js"
	const generated_children: SvelthreeComponentShadowDOMChild[] = []
	const user_created_children: SvelthreeComponentShadowDOMChild[] = []

	/**
	 * Pushes a user-created (_e.g. via `new Mesh({...})`_) or an internally generated / created (e.g. via `SvelthreeGLTF.apply(...)`) `svelthree`-component
	 * to a corresponding Array containing all user-created / internally generated (_registered_) child components, in order for them to be destroyed at the same time
	 * the parent component gets destroyed (_`onDestroy`_). See also `comp_ref.get_user_created_children()` and `comp_ref.get_generated_children()`.
	 */
	export const register_child_component = (
		component: SvelthreeComponentShadowDOMChild,
		generated?: boolean
	): SvelthreeComponentShadowDOMChild[] => {
		if (generated) {
			if (!generated_children.includes(component)) {
				generated_children.push(component)
			}

			return generated_children
		} else {
			if (!user_created_children.includes(component)) {
				user_created_children.push(component)
			}

			return user_created_children
		}
	}

	function destroy_registered_child_components(arr: (SvelthreeComponentShadowDOMChild | null)[]) {
		if (arr.length) {
			for (let i = 0; i < arr.length; i++) {
				const child_comp: SvelthreeComponentShadowDOMChild | null = arr[i]
				if (child_comp) child_comp.$destroy()
				arr[i] = null
			}

			arr.length = 0
		}
	}

	export const get_user_created_children = (): SvelthreeComponentShadowDOMChild[] => user_created_children
	export const get_generated_children = (): SvelthreeComponentShadowDOMChild[] => generated_children

	/** **Completely replace** `svelthree`-component's default `onMount`-callback logic, any `onMountStart` & `onMountEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onMountReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	onMount(
		onMountReplace
			? () => (onMountReplace as SvelthreeLifecycleCallback<CurrentComponentType>)(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.om)) {
						console.info(...c_lc(c_name, "onMount"))
					}

					if (container) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onMount : container.", {
									matrixAutoUpdate: container.matrixAutoUpdate,
									matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
								})
							)
						}

						//no special `svelthree`-logic here
					}
			  }
	)

	/** **Inject** functionality at the **start** of `svelthree`-component's default `onDestroy`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onDestroyStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	/** **Inject** functionality at the **end** of `svelthree`-component's default `onDestroy`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onDestroyEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	/** **Completely replace** `svelthree`-component's default `onDestroy`-callback logic, any `onDestroyStart` & `onDestroyEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let onDestroyReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	onDestroy(
		onDestroyReplace
			? () => (onDestroyReplace as SvelthreeLifecycleCallback<CurrentComponentType>)(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.od)) {
						console.info(...c_lc(c_name, "onDestroy"))
					}

					if (container) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onDestroy : container.", {
									matrixAutoUpdate: container.matrixAutoUpdate,
									matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
								})
							)
						}

						if (onDestroyStart) {
							if (onDestroyStart.constructor.name === "AsyncFunction") {
								await onDestroyStart(self)
							} else {
								onDestroyStart(self)
							}
						}

						remove_box_helper()
						if (ani) ani.destroyAnimation()

						destroy_registered_child_components(generated_children)
						destroy_registered_child_components(user_created_children)

						if (onDestroyEnd) {
							if (onDestroyEnd.constructor.name === "AsyncFunction") {
								await onDestroyEnd(self)
							} else {
								onDestroyEnd(self)
							}
						}
					}
			  }
	)

	/** **Completely replace** `svelthree`-component's default `beforeUpdate`-callback logic, any `beforeUpdateStart` & `beforeUpdateEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let beforeUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	beforeUpdate(
		beforeUpdateReplace
			? () => (beforeUpdateReplace as SvelthreeLifecycleCallback<CurrentComponentType>)(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.bu)) {
						console.info(...c_lc(c_name, "beforeUpdate"))
					}

					if (container) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "beforeUpdate : container.", {
									matrixAutoUpdate: container.matrixAutoUpdate,
									matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
								})
							)
						}

						//no special `svelthree`-logic here
					}
			  }
	)

	/** **Inject** functionality at the **start** of `svelthree`-component's default `afterUpdate`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let afterUpdateStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	/** **Inject** functionality at the **end** of `svelthree`-component's default `afterUpdate`-callback logic (`asynchronous`).
	 * Only asynchronous functions will be `await`ed. (_default verbosity will not be affected_)
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let afterUpdateEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	/** **Completely replace** `svelthree`-component's default `afterUpdate`-callback logic, any `afterUpdateStart` & `afterUpdateEnd` logic will be ignored (_default verbosity will be gone_).
	 *
	 * **Accepts** a `SvelthreeLifecycleCallback<T>`-type function as a **value**, which can also be explicitly typed as a **synchronous** (_type `SvelthreeLifecycleCallbackSync<T>`_) or an **asynchronous** (_type `SvelthreeLifecycleCallbackAsync<T>`_) callback:
	 * ```ts
	 * (comp: T) => unknown | Promise<unknown>
	 * ```
	 * ☝️ _the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_. */
	export let afterUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined = undefined

	afterUpdate(
		afterUpdateReplace
			? () => (afterUpdateReplace as SvelthreeLifecycleCallback<CurrentComponentType>)(self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.au)) {
						console.info(...c_lc(c_name, "afterUpdate"))
					}

					if (container) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : container.", {
									matrixAutoUpdate: container.matrixAutoUpdate,
									matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
								})
							)
						}

						if (afterUpdateStart) {
							if (afterUpdateStart.constructor.name === "AsyncFunction") {
								await afterUpdateStart(self)
							} else {
								afterUpdateStart(self)
							}
						}

						// Update local matrix after all (props) changes (async microtasks) have been applied.
						if (container && !container.matrixAutoUpdate) container.updateMatrix()

						if (verbose && !container.matrixAutoUpdate && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : container.", {
									matrixAutoUpdate: container.matrixAutoUpdate,
									matrixWorldNeedsUpdate: container.matrixWorldNeedsUpdate
								})
							)
						}

						if (store) {
							if (!store.rendererComponent) {
								await tick()
							}
							if (!store.rendererComponent) {
								console.error(
									`SVELTHREE > ${c_name} > afterUpdate : Cannot schedule auto-render, 'store.rendererComponent' not available!`,
									{ rendererComponent: store.rendererComponent }
								)
							} else {
								schedule_render_auto()
							}
						} else {
							console.error(`SVELTHREE > ${c_name} > afterUpdate : invalid 'store' instance value!`, {
								store
							})
						}

						if (afterUpdateEnd) {
							if (afterUpdateEnd.constructor.name === "AsyncFunction") {
								await afterUpdateEnd(self)
							} else {
								afterUpdateEnd(self)
							}
						}
					}
			  }
	)

	const schedule_render_auto = (): void => {
		if (store?.rendererComponent?.get_mode() === "auto") {
			// prevent an additional component update by not accessing the `root_scene` prop directly.
			if (root_scene_obj.value) {
				root_scene_obj.value.userData.dirty = true
			} else {
				console.error(
					`SVELTHREE > ${c_name} > schedule_render_auto : Cannot mark 'root_scene' as 'dirty', 'root_scene_obj.value' not available!`,
					{ root_scene_obj, root_scene }
				)
			}
			store.rendererComponent.schedule_render_auto(root_scene)
		}
	}

	export const state = (): Partial<IStateLoadedGLTF> => {
		return {}
	}

	if (!Object.hasOwn(self, "state")) {
		Object.defineProperty(self, "state", {
			value: () => {
				return {
					log_all,
					log_dev,
					log_rs,
					log_lc,
					log_mau,
					button,
					link,
					container,
					name,
					tabindex,
					aria,
					add,
					url,
					draco,
					manager,
					content,
					afterLoaded,
					mau,
					matrix,
					props,
					pos,
					rot,
					quat,
					scale,
					lookAt,
					castShadow,
					receiveShadow,
					boxParams,
					box,
					interact,
					block,
					modifiers,
					on_click,
					on_pointerup,
					on_pointerdown,
					on_pointerover,
					on_pointerout,
					on_pointermove,
					on_pointermoveover,
					on_keydown,
					on_keypress,
					on_keyup,
					on_focus,
					on_blur,
					on_focusin,
					on_focusout,
					on_wheel,
					on_wheelover,
					animation,
					aniauto,
					onMountReplace,
					onDestroyStart,
					onDestroyEnd,
					onDestroyReplace,
					beforeUpdateReplace,
					afterUpdateStart,
					afterUpdateEnd,
					afterUpdateReplace
				}
			},
			writable: false
		})
	}
</script>

{#if $svelthreeStores[sti]?.renderer?.xr.enabled === false && interact}
	<SvelthreeInteraction
		bind:this={interaction_comp}
		{shadow_dom_el}
		{modifiers}
		{dispatch_interaction}
		obj={container}
		parent={self}
		{interactionEnabled}
		{log_dev}
		{log_lc}
	/>
{/if}
