<!--
@component
**svelthree** _Object3D_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	type CurrentComponentType = import("./Object3D.svelte").default

	type BoxHelperParams = ConstructorParameters<typeof BoxHelper>

	export interface IStateObject3D {
		readonly log_all: boolean
		readonly log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined
		readonly log_rs: boolean
		readonly log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined
		readonly log_mau: boolean
		readonly button: PropButton | undefined
		readonly link: PropLink | undefined
		readonly object3d: THREE_Object3D | undefined | null
		readonly name: string | undefined
		readonly tabindex: number | undefined
		readonly aria: Partial<ARIAMixin> | undefined
		readonly mau: boolean | undefined
		readonly matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined
		readonly props: PropsObject3D | undefined
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
		readonly boxParams: RemoveFirst<BoxHelperParams> | undefined
		readonly box: boolean | undefined
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
	import { if$_instance_change } from "../logic/if$/index.js"
	import {
		remove_instance,
		recreate_shadow_dom_el,
		set_initial_userdata,
		find_in_canvas
	} from "../logic/shared/index.js"

	import type { Euler, Matrix4, Quaternion, Vector3 } from "three"
	import { Object3D as THREE_Object3D } from "three"
	import type { Targetable } from "../types/types-extra.js"

	import { svelthreeStores } from "../stores/index.js"
	import { PropUtils, SvelthreeProps } from "../utils/index.js"

	import { SvelthreeAni } from "../ani/index.js"
	import type { SvelthreeAnimationFunction, SvelthreeAnimation } from "../types/types-extra.js"

	import { BoxHelper } from "three"
	import { get_root_scene } from "../utils/SceneUtils.js"

	import type { PropsObject3D } from "../types/types-comp-props.js"
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

	const verbose: boolean = verbose_mode()

	export let log_all = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	export const isObject3D = true
	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")
	const store = $svelthreeStores[sti]

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

	/** The (three) instance that was shared to this component as it's 'parent' which can be either another instance / object or a scene / root scene. */
	let our_parent: THREE_Object3D | undefined = undefined

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

	/** Returns the `object3d` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.Object3D` instances. */
	export let object3d: THREE_Object3D | undefined | null = undefined
	let object3d_uuid: string | undefined | null = undefined

	/** Sets the `name` property of the created / injected three.js instance. */
	export let name: string | undefined = undefined

	export const is_svelthree_component = true
	export const is_svelthree_object3d = true

	//  ONCE  ON  INITIALIZATION  //

	if (object3d) {
		create = false
		on_instance_provided()
	} else {
		create = true
	}

	//  INJECTION  ONCE  ON  INITIALIZATION  //

	/** Executed when / if an instance was provided **on initializiation** -> only once if at all! */
	function on_instance_provided(): void {
		if (store) {
			if (object3d?.type === "Object3D") {
				//nothing
			} else if (object3d) {
				throw new Error(
					`SVELTHREE > ${c_name} : provided 'object3d' instance has wrong type '${object3d.type}', should be '${c_name}'!`
				)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > on_instance_provided : invalid 'store' instance value!`, { store })
			throw new Error(
				`SVELTHREE > ${c_name} : Cannot process provided 'object3d' instance, invalid 'store' value!'`
			)
		}
	}

	//  INJECTION  ONCE  ON  INITIALIZATION  //

	if (!create) {
		// get the instance that was shared to us as our 'parent' or use fallback.

		our_parent = getContext("parent") || scene
		// get the shadow DOM element that was shared to us by our parent component or use fallback.

		our_parent_shadow_dom_el = getContext("parent_shadow_dom_el") || scene_shadow_dom_el

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", object3d)

		// SVELTEKIT  CSR ONLY /
		if (browser) create_shadow_dom()
	}

	$: if (!object3d && create) {
		object3d = new THREE_Object3D()

		set_initial_userdata(object3d, self)

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${object3d.type} created!`, { object3d }))
	}

	// ---  AFTER  INITIALIZATION  --- //

	// set object3d_uuid the first time
	$: if (object3d && object3d_uuid === undefined) set_uuid()

	function set_uuid(): void {
		object3d_uuid = object3d?.uuid
	}

	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'Object3D'!

	// Determining 'parent' if 'object3d' instance has to be created first / was not provided on initialization ('create' is true).
	$: if (object3d && create && scene && !our_parent) set_parent()

	function set_parent() {
		// get the instance that was shared to us as our 'parent' or use fallback.

		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", object3d)
	}

	//  IMPORTANT  TODO
	// - see https://github.com/vatro/svelthree/issues/114
	// - see https://github.com/vatro/svelthree/issues/103

	$: if (object3d && create && our_parent_shadow_dom_el === undefined) {
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

	// this reactive statement willl be triggered on any 'object3d' instance change (also e.g. `object3d.foo = value`)
	$: if (object3d)
		if$_instance_change(object3d, our_parent, object3d_uuid, create, "object3d", name, handle_instance_change)

	/** Called from by the `if$_instance_change` logic if needed. */
	function handle_instance_change(): void {
		if (object3d) {
			if ((object3d_uuid && object3d.uuid !== object3d_uuid) || !object3d_uuid) {
				const uuid_to_remove: string = object3d_uuid || object3d.uuid
				const old_instance: THREE_Object3D | undefined = find_in_canvas(store?.scenes, uuid_to_remove)

				if (old_instance) {
					remove_instance(old_instance, "object3d", object3d, self)

					// recreate 'sProps'
					if (props) {
						try {
							sProps = new SvelthreeProps(object3d)
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

			set_initial_userdata(object3d, self)

			if (our_parent) our_parent.add(object3d)
			object3d_uuid = object3d.uuid

			if (verbose && log_dev) {
				console.debug(
					...c_dev(c_name, `${object3d.type} was added to ${our_parent?.type}!`, {
						object3d,
						scene,
						total: scene?.children.length
					})
				)
			}
		}
	}

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean | undefined = undefined
	$: if (object3d) object3d.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (object3d && mau !== undefined) object3d.matrixAutoUpdate = mau

	$: if (object3d && name) object3d.name = name
	$: if (shadow_dom_el && name) shadow_dom_el.dataset.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties of the created / injected three.js instance via an `Object Literal`. */
	export let props: PropsObject3D | undefined = undefined

	$: if (!sProps && object3d && props) sProps = new SvelthreeProps(object3d)
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
	$: !matrix && object3d && pos ? set_pos() : pos && object3d ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))

		if (object3d && pos) {
			PropUtils.setPositionFromValue(object3d, pos)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_pos : invalid 'object3d' instance and / or 'pos' value!`, {
				object3d,
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
	$: !matrix && !quat && object3d && rot ? set_rot() : rot && object3d ? console.warn(w_sh.rot) : null
	function set_rot() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rot", rot))

		if (object3d && rot !== undefined) {
			PropUtils.setRotationFromValue(object3d, rot)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_rot : invalid 'object3d' instance and / or 'rot' value!`, {
				object3d,
				rot
			})
		}
	}

	/** **shorthand** attribute for setting the `quaternion` property of the created / injected three.js instance. */
	export let quat: Quaternion | Parameters<Quaternion["set"]> | undefined = undefined
	$: !matrix && object3d && quat ? set_quat() : quat && object3d ? console.warn(w_sh.quat) : null
	function set_quat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "quat", quat))

		if (object3d && quat) {
			PropUtils.setQuaternionFromValue(object3d, quat)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_quat : invalid 'object3d' instance and / or 'quat' value!`, {
				object3d,
				quat
			})
		}
	}

	export let scale: Vector3 | Parameters<Vector3["set"]> | number | undefined = undefined
	$: !matrix && object3d && scale ? set_scale() : scale && object3d ? console.warn(w_sh.scale) : null
	function set_scale() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "scale", scale))

		if (object3d && scale !== undefined) {
			PropUtils.setScaleFromValue(object3d, scale)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_scale : invalid 'object3d' instance and / or 'scale' value!`, {
				object3d,
				scale
			})
		}
	}

	/** **shorthand** attribute for calling the `svelthree`-custom `lookAt` method with the provided value as argument. */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null = undefined
	$: !matrix && object3d && lookAt ? set_lookat() : lookAt && object3d ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		if (object3d && lookAt) {
			PropUtils.setLookAtFromValue(object3d, lookAt)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_lookat : invalid 'object3d' instance and / or 'lookAt' value!`, {
				object3d,
				lookAt
			})
		}
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && object3d) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		if (object3d && matrix) {
			PropUtils.setMatrixFromValue(object3d, matrix)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_matrix : invalid 'object3d' instance and / or 'matrix' value!`, {
				object3d,
				matrix
			})
		}
	}

	/** The root scene -> `scene.parent = null`. */
	let root_scene: Scene | undefined = undefined
	let root_scene_obj: { value: Scene | undefined } = { value: undefined }

	$: if (root_scene === undefined) {
		root_scene = get_root_scene(getContext("scene"))
		root_scene_obj.value = root_scene
	}

	$: if (object3d && root_scene) {
		object3d.userData.root_scene = root_scene
	}

	export let boxParams: RemoveFirst<BoxHelperParams> | undefined = undefined
	/** Creates and adds a `BoxHelper`. */
	export let box: boolean | undefined = undefined

	/** Removes `WebGLRenderer` `"update_helpers"` event listener. */
	let remove_update_box_on_render_event: (() => void) | undefined | null = undefined

	$: if (box && object3d && !object3d.userData.box) add_box_helper()
	$: if (!box && object3d?.userData.box) remove_box_helper()

	function add_box_helper() {
		if (object3d) {
			if (boxParams) {
				object3d.userData.box = new BoxHelper(object3d, ...boxParams)
			} else {
				object3d.userData.box = new BoxHelper(object3d)
			}

			object3d.userData.box.visible = false
		} else {
			console.error(`SVELTHREE > ${c_name} > Cannot add box helper to unavailable 'object3d' instance!`, {
				object3d
			})
		}
	}

	// update and show box on next frame
	$: if (box && object3d && object3d.userData.box && $svelthreeStores[sti]?.rendererComponent && root_scene) {
		apply_box()
	}

	function apply_box(): void {
		if (object3d) {
			if (!object3d.userData.box.parent) {
				// add all boxes to the root scene!
				if (root_scene) {
					root_scene.add(object3d.userData.box)
				} else {
					console.error(`SVELTHREE > ${c_name} > Cannot add box helper to invalid 'root_scene' instance!`, {
						root_scene
					})
				}
			}

			// update box and make it visible
			object3d.userData.box.update()
			object3d.userData.box.visible = true

			// start updating
			if (!remove_update_box_on_render_event) {
				remove_update_box_on_render_event = store?.rendererComponent?.$on("update_helpers", update_box)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > apply_box : invalid 'object3d' instance value!`, { object3d })
		}
	}

	function update_box(): void {
		// `object3d` may have been nullified by `clear()`
		if (object3d) object3d.userData.box.update()
	}

	function remove_box_helper(): void {
		if (remove_update_box_on_render_event) {
			remove_update_box_on_render_event()
			remove_update_box_on_render_event = null
		}

		// `object3d` may have been nullified by `clear()`
		if (object3d?.userData.box?.parent) {
			object3d.userData.box.parent.remove(object3d.userData.box)
			object3d.userData.box = null
		}
	}

	/** Animation logic to be performed with the (three) object instance created by the component. */
	export let animation: SvelthreeAnimationFunction | undefined = undefined

	let animationEnabled = false
	$: if (animation) animationEnabled = true

	/** Immediately start provided animation, default: `false`. Alternative: `<component_reference>.start_animation()` or shorter `.start_ani()`. */
	export let aniauto: boolean | undefined = undefined

	/** (_internal_) reference to the `SvelthreeAni` instance */
	let ani: SvelthreeAni
	$: if (animation && animationEnabled) ani = new SvelthreeAni(scene, object3d, animation, !!aniauto)

	let currentSceneActive: boolean | undefined = undefined
	$: currentSceneActive = $svelthreeStores[sti]?.scenes[scene?.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** Removes the (three) instance created by / provided to the component from it's parent. */
	export const remove_instance_from_parent = async (): Promise<boolean> => {
		if (object3d) {
			const removed: boolean = remove_instance(object3d, "object3d")
			return removed
		} else {
			console.error(`SVELTHREE > ${c_name} > remove_instance_from_parent : invalid 'object3d' instance value!`, {
				object3d
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
	export const get_instance = (): THREE_Object3D | undefined | null => object3d

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

		object3d = null

		// IMPORTANT //
		// has to be set to `null`, `undefined` would set `object3d_uuid` if a cleared component recevies a object3d
		// we don't want that, beacuse then the `handle_instance_change` wouldn't be triggered!
		object3d_uuid = null
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

					if (object3d) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onMount : object3d.", {
									matrixAutoUpdate: object3d.matrixAutoUpdate,
									matrixWorldNeedsUpdate: object3d.matrixWorldNeedsUpdate
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

					if (object3d) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onDestroy : object3d.", {
									matrixAutoUpdate: object3d.matrixAutoUpdate,
									matrixWorldNeedsUpdate: object3d.matrixWorldNeedsUpdate
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

					if (object3d) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "beforeUpdate : object3d.", {
									matrixAutoUpdate: object3d.matrixAutoUpdate,
									matrixWorldNeedsUpdate: object3d.matrixWorldNeedsUpdate
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

					if (object3d) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : object3d.", {
									matrixAutoUpdate: object3d.matrixAutoUpdate,
									matrixWorldNeedsUpdate: object3d.matrixWorldNeedsUpdate
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
						if (object3d && !object3d.matrixAutoUpdate) object3d.updateMatrix()

						if (verbose && !object3d.matrixAutoUpdate && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : object3d.", {
									matrixAutoUpdate: object3d.matrixAutoUpdate,
									matrixWorldNeedsUpdate: object3d.matrixWorldNeedsUpdate
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

	export const state = (): Partial<IStateObject3D> => {
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
					object3d,
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
					boxParams,
					box,
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
