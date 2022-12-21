<!--
@component
**svelthree** _Scene_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	type CurrentComponentType = import("./Scene.svelte").default

	type BoxHelperParams = ConstructorParameters<typeof BoxHelper>

	export interface IStateScene {
		readonly log_all: boolean
		readonly log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined
		readonly log_rs: boolean
		readonly log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined
		readonly log_mau: boolean
		readonly id: string | undefined
		readonly button: PropButton | undefined
		readonly link: PropLink | undefined
		readonly scene: THREE_Scene | undefined | null
		readonly name: string | undefined
		readonly tabindex: number | undefined
		readonly aria: Partial<ARIAMixin> | undefined
		readonly mau: boolean | undefined
		readonly matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined
		readonly props: PropsScene | undefined
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
		readonly bg: Texture | Color | string | number | [r: number, g: number, b: number] | Vector3 | undefined
		readonly bg_tex: { url: string; mapping?: Mapping } | undefined
		readonly fog: FogBase | undefined
		readonly env: Texture | undefined
		readonly env_tex: { url: string; mapping?: Mapping } | undefined
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
	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext, tick } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger.js"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger.js"
	import type { SvelthreeLifecycleCallback } from "../types/types-extra.js"
	import type { SvelthreeShadowDOMElement } from "../types/types-extra.js"
	import { if$_instance_change } from "../logic/if$/index.js"
	import {
		remove_instance,
		recreate_shadow_dom_el,
		set_initial_userdata,
		find_in_canvas
	} from "../logic/shared/index.js"

	import type { Euler, Matrix4, Quaternion, Vector3 } from "three"
	import type { Object3D } from "three"
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

	import { Scene as THREE_Scene } from "three"
	import type { PropsScene } from "../types/types-comp-props.js"
	import type { FogBase, Color, Mapping, Texture } from "three"
	import { EquirectangularReflectionMapping, TextureLoader } from "three"
	import type { RemoveFirst } from "../types/types-extra.js"
	import type { PropButton, PropLink } from "../types/types-comp-props.js"

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

	const shadow_root: Writable<{ element: HTMLDivElement }> = getContext("shadow_root")
	let shadow_root_el: HTMLDivElement
	$: shadow_root_el = $shadow_root.element

	const verbose: boolean = verbose_mode()

	export let log_all = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	interface $$Events extends EventMapAllEvents {}

	const dispatch_interaction = createEventDispatcher<EventMapAllEventDetails>()

	/** `id` is used to identify / assign a Scene to a 'WebGLRenderer' component.
	 * `id` is **not needed if** a Scene component is a child of any Object3D (e.g. another Scene) in this case
	 * it will be treated as a standard Object3D asset. */
	export let id: string | undefined = undefined

	const sti: number = getContext("store_index")
	const store = $svelthreeStores[sti]

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

	/** The (three) instance that was shared to this component as it's 'parent' which can be either another instance / object or a scene / root scene. */
	let our_parent: Object3D | undefined = undefined

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

	/** Returns the `scene` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.Scene` instances. */
	export let scene: THREE_Scene | undefined | null = undefined
	let scene_uuid: string | undefined | null = undefined

	/** Sets the `name` property of the created / injected three.js instance. */
	export let name: string | undefined = undefined
	let scene_is_active: boolean | undefined = undefined

	export const is_svelthree_component = true
	export const is_svelthree_scene = true

	//  ONCE  ON  INITIALIZATION  //

	if (scene) {
		create = false
		on_instance_provided()
	} else {
		create = true
	}

	//  INJECTION  ONCE  ON  INITIALIZATION  //

	/** Executed when / if an instance was provided **on initializiation** -> only once if at all! */
	function on_instance_provided(): void {
		if (store) {
			if (scene?.type === "Scene") {
				//nothing
			} else if (scene) {
				throw new Error(
					`SVELTHREE > ${c_name} : provided 'scene' instance has wrong type '${scene.type}', should be '${c_name}'!`
				)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > on_instance_provided : invalid 'store' instance value!`, { store })
			throw new Error(`SVELTHREE > ${c_name} : Cannot process provided 'scene' instance, invalid 'store' value!'`)
		}
	}

	//  INJECTION  ONCE  ON  INITIALIZATION  //

	if (!create) {
		// get the instance that was shared to us as our 'parent' or use fallback.
		// IMPORTANT  is allowed to be `undefined` in the `Scene` component!
		our_parent = getContext("parent") || getContext("scene")
		// get the shadow DOM element that was shared to us by our parent component or use fallback.
		// IMPORTANT  is allowed to be `undefined` in the `Scene` component!
		our_parent_shadow_dom_el = getContext("parent_shadow_dom_el")

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", scene)

		// SVELTEKIT  CSR ONLY /
		if (browser) create_shadow_dom()
	}

	$: if (!scene && create && store) {
		// handle Scene as normal Object3D if it has a parent

		scene = new THREE_Scene()

		set_initial_userdata(scene, self)

		// get the instance that was shared to us as our 'parent' or use fallback.
		// IMPORTANT  is allowed to be `undefined` in the `Scene` component!
		our_parent = getContext("parent") || getContext("scene")
		// get the shadow DOM element that was shared to us by our parent component or use fallback.
		// IMPORTANT  is allowed to be `undefined` in the `Scene` component!
		our_parent_shadow_dom_el = getContext("parent_shadow_dom_el")

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", scene)

		// SVELTEKIT  CSR ONLY /
		if (browser) create_shadow_dom()

		if (!our_parent) {
			// 'scene' is a 'root' Scene, direct child of the Canvas component

			// 'scene' is a 'root' Scene, it should have an 'id'.
			if (!id) {
				console.warn(
					"SVELTHREE > Scene : an 'id' prop (not empty String) for Scenes in order to assign them to a 'WebGLRenderer' component!",
					{ id: id }
				)
				throw new Error("SVELTHREE Exception (see warning above)")
			}

			scene.userData.id = id
			scene.userData.sti = sti

			scene_is_active = false
			scene.userData.isActive = scene_is_active

			store.scenes.push({ scene: scene, id: id, isActive: false })
		}

		// every scene spreads it's onw instance to children overwriting the 'root scene' instance
		// so if we need a reference to the topmost 'root scene' from an object inside some nested
		// scene, we have to search for it, see e.g. the `CubeCamera` component
		setContext("scene", scene)

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${scene.type} created!`, { scene }))
	}

	// ---  AFTER  INITIALIZATION  --- //

	// set scene_uuid the first time
	$: if (scene && scene_uuid === undefined) set_uuid()

	function set_uuid(): void {
		scene_uuid = scene?.uuid
	}

	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'Scene'!

	// GENERATOR REMARK: 'parent_logic_if_inst_not_provided' excluded for 'Scene'!

	function create_shadow_dom(): void {
		// create / recreate and share our own shadow_dom_el as parent_shadow_dom_el
		shadow_dom_el = recreate_shadow_dom_el(shadow_dom_el, our_parent_shadow_dom_el, button, link, c_name)

		if (shadow_dom_el) {
			setContext("parent_shadow_dom_el", shadow_dom_el)
		} else {
			if (!shadow_dom_el) console.error(`SVELTHREE > ${c_name} : 'shadow_dom_el' was not created!`, shadow_dom_el)
		}
	}

	// IMPORTANT  append scenes only when `shadow_root_el` is available!
	$: if (shadow_root_el && shadow_dom_el) {
		let target_shadow_dom = our_parent_shadow_dom_el || shadow_root_el

		if (!shadow_dom_el.parentNode) {
			if (target_shadow_dom) {
				target_shadow_dom.appendChild(shadow_dom_el)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > couldn't append shadow dom, no 'target_shadow_dom'!`,
					target_shadow_dom
				)
			}
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

	// this reactive statement willl be triggered on any 'scene' instance change (also e.g. `scene.foo = value`)
	$: if (scene) if$_instance_change(scene, our_parent, scene_uuid, create, "scene", name, handle_instance_change)

	/** Called from by the `if$_instance_change` logic if needed. */
	function handle_instance_change(): void {
		if (scene) {
			let old_raycast = false
			let old_block = false

			if ((scene_uuid && scene.uuid !== scene_uuid) || !scene_uuid) {
				const uuid_to_remove: string = scene_uuid || scene.uuid
				const old_instance: Object3D | undefined = find_in_canvas(store?.scenes, uuid_to_remove)

				if (old_instance) {
					remove_instance(old_instance, "scene", scene, self)

					// remove `old_instance` from raycast if needed
					if (old_instance && raycast.includes(old_instance)) {
						old_raycast = true
						old_block = old_instance.userData.block
						raycast.splice(old_instance.userData.index_in_raycast, 1)
					}

					// recreate 'sProps'
					if (props) {
						try {
							sProps = new SvelthreeProps(scene)
						} catch (err) {
							console.error(err)
						}
					}
				} else {
					console.error(
						`SVELTHREE > ${c_name} > handle_instance_change : invalid 'old_instance' instance value!`,
						{ old_instance }
					)
				}
			}

			set_initial_userdata(scene, self)

			// add 'scene' (provided instance) to raycast if needed
			if (old_raycast) {
				if (!raycast.includes(scene)) {
					scene.userData.block = old_block // will this somehow be handeled automatically?
					raycast.push(scene)
				}
			}

			if (our_parent) our_parent.add(scene)
			scene_uuid = scene.uuid
			scene_obj.value = scene

			if (verbose && log_dev) {
				console.debug(
					...c_dev(c_name, `${scene.type} was added to ${our_parent?.type}!`, {
						scene,
						total: scene?.children.length
					})
				)
			}
		}
	}

	/** Set `Scene`'s `.matrixAutoUpdate` which will also be set for all objects (*components*) in the scene (*default is `true`*).
	 * You can override `Scene`'s `.matrixAutoUpdate` per component by setting their own `mau` shorthand attribute to `true` or `false`.
	 * Also: `mau` can be changed on-the-fly. */
	export let mau: boolean | undefined = undefined

	// IMPORTANT  +  COOL!  SVELTE  this runs only on 'mau' change!
	$: if (mau !== undefined) {
		mau === true ? enable_scene_auto() : disable_scene_auto()
	}

	function enable_scene_auto() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "mau > enable_scene_auto!", { mau }))

		if (scene) {
			// IMPORTANT  lets the renderer perform scene.updateMatrixWorld() on every render pass.
			// THREE  TS: no `autoUpdate` in type `THREE.Scene`
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			scene.autoUpdate = true

			// IMPORTANT  `scene.updateMatrixWorld()` will always call `matrixUpdate()` first which will set `scene.matrixWorldNeedsUpdate` to `true`.
			scene.matrixAutoUpdate = true

			if (verbose && log_mau) {
				// THREE  TS: no `autoUpdate` in type `THREE.Scene`
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				console.debug(...c_mau(c_name, "enable_scene_auto! scene.autoUpdate:", scene.autoUpdate))
			}
			if (verbose && log_mau) {
				console.debug(...c_mau(c_name, "enable_scene_auto! scene.matrixAutoUpdate:", scene.matrixAutoUpdate))
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > enable_scene_auto : invalid 'scene' instance value!`, { scene })
		}
	}

	function disable_scene_auto() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "mau > disable_scene_auto!", { mau }))

		if (scene) {
			// IMPORTANT  lets the renderer perform scene.updateMatrixWorld() on every render pass -> we don't have to do it in the component!.
			// THREE  TS: no `autoUpdate` in type `THREE.Scene`
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			scene.autoUpdate = true

			// IMPORTANT  prevents calling `matrixUpdate()` on `scene.updateMatrixWorld()`
			// -> won't set `scene.matrixWorldNeedsUpdate = true`...
			// -> won't set `force = true`, preventing forced `updateMatrixWorld()` of all scene children in case the scene matrix hasn't changed.
			// -> https://github.com/mrdoob/three.js/blob/6a51509d8aeac60ac3fe0f6766a15f5342d6e643/src/core/Object3D.js#L565-L605
			scene.matrixAutoUpdate = false

			if (verbose && log_mau) {
				// THREE  TS: no `autoUpdate` in type `THREE.Scene`
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				console.debug(...c_mau(c_name, "disable_scene_auto! scene.autoUpdate:", scene.autoUpdate))
			}
			if (verbose && log_mau) {
				console.debug(...c_mau(c_name, "disable_scene_auto! scene.matrixAutoUpdate:", scene.matrixAutoUpdate))
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > disable_scene_auto : invalid 'scene' instance value!`, { scene })
		}
	}

	$: if (scene && name) scene.name = name
	$: if (shadow_dom_el && name) shadow_dom_el.dataset.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties of the created / injected three.js instance via an `Object Literal`. */
	export let props: PropsScene | undefined = undefined

	$: if (!sProps && scene && props) sProps = new SvelthreeProps(scene)
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
	$: !matrix && scene && pos ? set_pos() : pos && scene ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))

		if (scene && pos) {
			PropUtils.setPositionFromValue(scene, pos)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_pos : invalid 'scene' instance and / or 'pos' value!`, {
				scene,
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
	$: !matrix && !quat && scene && rot ? set_rot() : rot && scene ? console.warn(w_sh.rot) : null
	function set_rot() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rot", rot))

		if (scene && rot !== undefined) {
			PropUtils.setRotationFromValue(scene, rot)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_rot : invalid 'scene' instance and / or 'rot' value!`, {
				scene,
				rot
			})
		}
	}

	/** **shorthand** attribute for setting the `quaternion` property of the created / injected three.js instance. */
	export let quat: Quaternion | Parameters<Quaternion["set"]> | undefined = undefined
	$: !matrix && scene && quat ? set_quat() : quat && scene ? console.warn(w_sh.quat) : null
	function set_quat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "quat", quat))

		if (scene && quat) {
			PropUtils.setQuaternionFromValue(scene, quat)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_quat : invalid 'scene' instance and / or 'quat' value!`, {
				scene,
				quat
			})
		}
	}

	export let scale: Vector3 | Parameters<Vector3["set"]> | number | undefined = undefined
	$: !matrix && scene && scale ? set_scale() : scale && scene ? console.warn(w_sh.scale) : null
	function set_scale() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "scale", scale))

		if (scene && scale !== undefined) {
			PropUtils.setScaleFromValue(scene, scale)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_scale : invalid 'scene' instance and / or 'scale' value!`, {
				scene,
				scale
			})
		}
	}

	/** **shorthand** attribute for calling the `svelthree`-custom `lookAt` method with the provided value as argument. */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null = undefined
	$: !matrix && scene && lookAt ? set_lookat() : lookAt && scene ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		if (scene && lookAt) {
			PropUtils.setLookAtFromValue(scene, lookAt)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_lookat : invalid 'scene' instance and / or 'lookAt' value!`, {
				scene,
				lookAt
			})
		}
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && scene) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		if (scene && matrix) {
			PropUtils.setMatrixFromValue(scene, matrix)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_matrix : invalid 'scene' instance and / or 'matrix' value!`, {
				scene,
				matrix
			})
		}
	}

	export let castShadow: boolean | undefined = undefined
	$: if (castShadow !== undefined && scene) scene.castShadow = castShadow

	export let receiveShadow: boolean | undefined = undefined
	$: if (receiveShadow !== undefined && scene) scene.receiveShadow = receiveShadow

	/** Scene `.background`. */
	export let bg: Texture | Color | string | number | [r: number, g: number, b: number] | Vector3 | undefined =
		undefined
	$: if (bg) set_bg()

	function set_bg(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "bg", bg))

		if (scene && bg) {
			if (bg.constructor?.name === "Texture") {
				scene.background = bg as Texture
			} else {
				PropUtils.setColorFromValueKey(
					scene,
					bg as Color | string | number | [r: number, g: number, b: number] | Vector3,
					"background"
				)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > set_bg : invalid 'scene' instance and / or 'bg' value!`, {
				scene,
				bg
			})
		}
	}

	/** Scene background texture image (*url/path*) and mapping method.
	 * Loads the texture image, creates a texture and sets it as Scene `.background`.*/
	export let bg_tex: { url: string; mapping?: Mapping } | undefined = undefined
	$: if (bg_tex) set_bg_tex()

	function set_bg_tex(): Texture | undefined | null {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "bg_tex", bg_tex))

		//  SVELTEKIT  CSR ONLY
		if (browser) {
			if (scene && bg_tex) {
				const env_texture_loader = new TextureLoader().load(bg_tex.url, (tex) => {
					if (bg_tex && bg_tex.mapping) {
						tex.mapping = bg_tex.mapping
					} else {
						console.warn(
							`SVELTHREE > ${c_name} > set_bg_tex : invalid 'bg_tex' prop or 'bg_tex.mapping' value!`,
							{ bg_tex }
						)
					}
					if (scene && tex) {
						scene.background = tex
					} else {
						console.error(
							`SVELTHREE > ${c_name} > set_bg_tex : invalid 'scene' instance and / or 'tex' value!`,
							{ scene, tex }
						)
					}
				})

				return env_texture_loader
			} else {
				console.error(
					`SVELTHREE > ${c_name} > set_bg_tex : invalid 'scene' instance and / or 'bg_tex' prop value!`,
					{ scene, bg_tex }
				)
				return null
			}
		}
	}

	/** Scene `.fog`. */
	export let fog: FogBase | undefined = undefined
	$: if (fog) set_fog()

	function set_fog(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "fog", bg))
		if (scene && fog) {
			scene.fog = fog
		} else {
			console.error(`SVELTHREE > ${c_name} > set_fog : invalid 'scene' instance and / or 'fog' prop value!`, {
				scene,
				fog
			})
		}
	}

	/** Scene `.environment` texture. */
	export let env: Texture | undefined = undefined
	$: if (env) set_env()

	function set_env(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "env", env))
		if (scene && env) {
			scene.environment = env
		} else {
			console.error(`SVELTHREE > ${c_name} > set_env : invalid 'scene' instance and / or 'env' prop value!`, {
				scene,
				env
			})
		}
	}

	/** Scene environment texture image (*url/path*) and mapping method (*optional, default: `EquirectangularReflectionMapping`*).
	 * Loads the texture image, creates a texture and sets it as Scene `.environment`. */
	export let env_tex: { url: string; mapping?: Mapping } | undefined = undefined
	$: if (env_tex) set_env_tex()

	function set_env_tex(): Texture | undefined | null {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "env_tex", env_tex))

		//  SVELTEKIT  CSR ONLY
		if (browser) {
			if (scene) {
				if (env_tex) {
					const env_texture_loader = new TextureLoader().load(env_tex.url, (tex) => {
						if (env_tex) {
							if (env_tex.mapping) {
								tex.mapping = env_tex.mapping | EquirectangularReflectionMapping
							} else {
								// default mapping
								tex.mapping = EquirectangularReflectionMapping
							}
							if (scene && tex) {
								scene.environment = tex
							} else {
								console.error(
									`SVELTHREE > ${c_name} > set_env_tex : invalid 'scene' instance and / or 'tex' value!`,
									{ scene, tex }
								)
							}
						} else {
							console.error(`SVELTHREE > ${c_name} > set_env_tex : invalid 'env_tex' prop value!`, {
								env_tex
							})
						}
					})

					return env_texture_loader
				} else {
					console.error(`SVELTHREE > ${c_name} > set_env_tex : invalid 'env_tex' prop value!`, { env_tex })
					return null
				}
			} else {
				console.error(`SVELTHREE > ${c_name} > set_env_tex : invalid 'scene' instance value!`, { scene })
				return null
			}
		}
	}

	/** The root scene -> `scene.parent = null`. */
	let root_scene: THREE_Scene | null | undefined = undefined
	let root_scene_obj: { value: THREE_Scene | null | undefined } = { value: undefined }
	let scene_obj: { value: THREE_Scene | null | undefined } = { value: undefined }

	$: if (root_scene === undefined) {
		root_scene = get_root_scene(getContext("scene"))

		if (scene) {
			if (root_scene === scene) {
				// we are the root scene
				root_scene = null
				root_scene_obj.value = root_scene
				scene_obj.value = scene
			} else {
				root_scene_obj.value = root_scene
				scene.userData.root_scene = root_scene
				scene_obj.value = scene
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > reactive conditional logic 'if (root_scene === undefined)' : invalid 'scene' instance value!`,
				{ scene }
			)
		}
	}

	export let boxParams: RemoveFirst<BoxHelperParams> | undefined = undefined
	/** Creates and adds a `BoxHelper`. */
	export let box: boolean | undefined = undefined

	/** Removes `WebGLRenderer` `"update_helpers"` event listener. */
	let remove_update_box_on_render_event: (() => void) | undefined | null = undefined

	$: if (box && scene && root_scene && !scene.userData.box) add_box_helper()
	$: if (!box && scene?.userData.box) remove_box_helper()

	function add_box_helper() {
		if (scene) {
			if (boxParams) {
				scene.userData.box = new BoxHelper(scene, ...boxParams)
			} else {
				scene.userData.box = new BoxHelper(scene)
			}

			scene.userData.box.visible = false
		} else {
			console.error(`SVELTHREE > ${c_name} > Cannot add box helper to unavailable 'scene' instance!`, { scene })
		}
	}

	// update and show box on next frame
	$: if (box && scene && scene.userData.box && $svelthreeStores[sti]?.rendererComponent && root_scene) {
		apply_box()
	}

	function apply_box(): void {
		if (scene) {
			if (!scene.userData.box.parent) {
				// add all boxes to the root scene!
				if (root_scene) {
					root_scene.add(scene.userData.box)
				} else {
					console.error(`SVELTHREE > ${c_name} > Cannot add box helper to invalid 'root_scene' instance!`, {
						root_scene
					})
				}
			}

			// update box and make it visible
			scene.userData.box.update()
			scene.userData.box.visible = true

			// start updating
			if (!remove_update_box_on_render_event) {
				remove_update_box_on_render_event = store?.rendererComponent?.$on("update_helpers", update_box)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > apply_box : invalid 'scene' instance value!`, { scene })
		}
	}

	function update_box(): void {
		// `scene` may have been nullified by `clear()`
		if (scene) scene.userData.box.update()
	}

	function remove_box_helper(): void {
		if (remove_update_box_on_render_event) {
			remove_update_box_on_render_event()
			remove_update_box_on_render_event = null
		}

		// `scene` may have been nullified by `clear()`
		if (scene?.userData.box?.parent) {
			scene.userData.box.parent.remove(scene.userData.box)
			scene.userData.box = null
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

	$: if (scene) restore_interaction_props()
	async function restore_interaction_props(): Promise<void> {
		//console.warn(`comp '${name}' restore_interaction_props!`, { scene, scene_uuid, interact: scene.userData.interact })
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
	$: if (interactionEnabled && raycast && !block && scene) {
		if (!raycast.includes(scene)) {
			scene.userData.block = false
			raycast.push(scene)
		} else {
			scene.userData.block = false
		}
	}

	// Reactively ENABLE raycasting to the created three.js instance -> 'interaction occluder / blocker'.
	// Only `block` is set / `true` but no `interact` / set to `false`. Since `interact` is `false`,
	// `block` will NOT be changed via `SvelthreeInteraction` component (not rendered).
	$: if (!interactionEnabled && raycast && block && scene) {
		if (!raycast.includes(scene)) {
			scene.userData.block = true
			raycast.push(scene)
		} else {
			scene.userData.block = true
		}
	}

	// Reactively DISABLE raycasting to the created three.js instance. Neither `block` nor `interact` are set / are both `false`.
	// Since `interact` is `false`, `block` will NOT be changed via `SvelthreeInteraction` component (not rendered).
	$: if (!interactionEnabled && raycast && !block && scene) {
		if (raycast.includes(scene)) {
			raycast.splice(scene.userData.index_in_raycast, 1)
			scene.userData.block = false
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
	$: if (animation && animationEnabled) ani = new SvelthreeAni(scene, scene, animation, !!aniauto)

	let currentSceneActive: boolean | undefined = undefined
	$: currentSceneActive = $svelthreeStores[sti]?.scenes[scene?.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** Removes the (three) instance created by / provided to the component from it's parent. */
	export const remove_instance_from_parent = async (): Promise<boolean> => {
		if (scene) {
			const removed: boolean = remove_instance(scene, "scene")
			return removed
		} else {
			console.error(`SVELTHREE > ${c_name} > remove_instance_from_parent : invalid 'scene' instance value!`, {
				scene
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
	export const get_instance = (): THREE_Scene | undefined | null => scene

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

		scene = null

		// IMPORTANT //
		// has to be set to `null`, `undefined` would set `scene_uuid` if a cleared component recevies a scene
		// we don't want that, beacuse then the `handle_instance_change` wouldn't be triggered!
		scene_uuid = null
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

					if (scene) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onMount : scene.", {
									matrixAutoUpdate: scene.matrixAutoUpdate,
									matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
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

					if (scene) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onDestroy : scene.", {
									matrixAutoUpdate: scene.matrixAutoUpdate,
									matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
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

					if (scene) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "beforeUpdate : scene.", {
									matrixAutoUpdate: scene.matrixAutoUpdate,
									matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
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

					if (scene) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : scene.", {
									matrixAutoUpdate: scene.matrixAutoUpdate,
									matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
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
						if (scene && !scene.matrixAutoUpdate) scene.updateMatrix()

						if (verbose && !scene.matrixAutoUpdate && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : scene.", {
									matrixAutoUpdate: scene.matrixAutoUpdate,
									matrixWorldNeedsUpdate: scene.matrixWorldNeedsUpdate
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
			if (root_scene) {
				// we're not the root scene (root_scene is not `null`)
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
			} else {
				// we're are the root scene (root_scene is `null`)
				// prevent an additional component update by not accessing the `scene` prop directly.
				if (scene_obj.value) {
					scene_obj.value.userData.dirty = true
				} else {
					console.error(
						`SVELTHREE > ${c_name} > schedule_render_auto : Cannot mark Scene (is root Scene) as 'dirty', 'scene_obj.value' not available!`,
						{ scene_obj, scene }
					)
				}
				store.rendererComponent.schedule_render_auto(scene)
			}
		}
	}

	export const state = (): Partial<IStateScene> => {
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
					id,
					button,
					link,
					scene,
					name,
					tabindex,
					aria,
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
					bg,
					bg_tex,
					fog,
					env,
					env_tex,
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

<slot />

{#if $svelthreeStores[sti]?.renderer?.xr.enabled === false && interact}
	<SvelthreeInteraction
		bind:this={interaction_comp}
		{shadow_dom_el}
		{modifiers}
		{dispatch_interaction}
		obj={scene}
		parent={self}
		{interactionEnabled}
		{log_dev}
		{log_lc}
	/>
{/if}
