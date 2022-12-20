<!--
@component
**svelthree** _SpotLight_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	type CurrentComponentType = import("./SpotLight.svelte").default

	type HelperParams = ConstructorParameters<typeof SpotLightHelper>

	export interface IStateSpotLight {
		readonly log_all: boolean
		readonly log_dev: { [P in keyof LogDEV]: LogDEV[P] } | undefined
		readonly log_rs: boolean
		readonly log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined
		readonly log_mau: boolean
		readonly light: THREE_SpotLight | undefined | null
		readonly name: string | undefined
		readonly params: ConstructorParameters<typeof THREE_SpotLight> | undefined
		readonly tabindex: number | undefined
		readonly aria: Partial<ARIAMixin> | undefined
		readonly target: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null
		readonly mau: boolean | undefined
		readonly matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined
		readonly props: PropsSpotLight | undefined
		readonly pos: Vector3 | Parameters<Vector3["set"]> | undefined
		readonly lookAt: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null
		readonly angle: number | undefined
		readonly decay: number | undefined
		readonly distance: number | undefined
		readonly penumbra: number | undefined
		readonly power: number | undefined
		readonly color: Color | string | number | [r: number, g: number, b: number] | Vector3 | undefined
		readonly intensity: number | undefined
		readonly shadowMapSize: number | undefined
		readonly shadowBias: number | undefined
		readonly castShadow: boolean | undefined
		readonly shadowProps: PropsSpotLightShadow | undefined
		readonly shadowCameraProps: PropsPerspectiveCamera | undefined
		readonly helperParams: RemoveFirst<HelperParams> | undefined
		readonly helper: boolean | undefined
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

	import type { Matrix4, Vector3 } from "three"
	import type { Targetable } from "../types/types-extra.js"

	import { svelthreeStores } from "../stores/index.js"
	import { PropUtils, SvelthreeProps } from "../utils/index.js"

	import { SvelthreeAni } from "../ani/index.js"
	import type { SvelthreeAnimationFunction, SvelthreeAnimation } from "../types/types-extra.js"

	import SvelthreeLightWithShadow from "../components-internal/SvelthreeLightWithShadow.svelte"

	import type { Object3D } from "three"

	import { SpotLight as THREE_SpotLight } from "three"
	import { SpotLightHelper } from "three"
	import type { PropsSpotLight, PropsSpotLightShadow, PropsPerspectiveCamera } from "../types/types-comp-props.js"
	import type { Color } from "three"
	import type { RemoveFirst } from "../types/types-extra.js"
	import { get_root_scene } from "../utils/SceneUtils.js"

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

	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")
	const store = $svelthreeStores[sti]

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

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

	/** Returns the `light` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.SpotLight` instances. */
	export let light: THREE_SpotLight | undefined | null = undefined
	let light_uuid: string | undefined | null = undefined

	/** Sets the `name` property of the created / injected three.js instance. */
	export let name: string | undefined = undefined

	export const is_svelthree_component = true
	export const is_svelthree_light = true

	//  ONCE  ON  INITIALIZATION  //

	if (light) {
		create = false
		on_instance_provided()
	} else {
		create = true
	}

	//  INJECTION  ONCE  ON  INITIALIZATION  //

	/** Executed when / if an instance was provided **on initializiation** -> only once if at all! */
	function on_instance_provided(): void {
		if (store) {
			if (light?.type === "SpotLight") {
				// light with `target`: remember built-in target.
				light.target.userData.is_builtin_target
				light.userData.builtin_target = light.target
				light.userData.target_uuid = light.target.uuid
			} else if (light) {
				throw new Error(
					`SVELTHREE > ${c_name} : provided 'light' instance has wrong type '${light.type}', should be '${c_name}'!`
				)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > on_instance_provided : invalid 'store' instance value!`, { store })
			throw new Error(`SVELTHREE > ${c_name} : Cannot process provided 'light' instance, invalid 'store' value!'`)
		}
	}

	//  INJECTION  ONCE  ON  INITIALIZATION  //

	if (!create) {
		// get the instance that was shared to us as our 'parent' or use fallback.

		our_parent = getContext("parent") || scene
		// get the shadow DOM element that was shared to us by our parent component or use fallback.

		our_parent_shadow_dom_el = getContext("parent_shadow_dom_el") || scene_shadow_dom_el

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", light)

		// SVELTEKIT  CSR ONLY /
		if (browser) create_shadow_dom()
	}

	/** Initializes `SpotLight` with provided constructor parameters.*/
	export let params: ConstructorParameters<typeof THREE_SpotLight> | undefined = undefined

	$: if (!light && create) {
		if (params) {
			light = new THREE_SpotLight(...params)
		} else {
			light = new THREE_SpotLight()
		}

		set_initial_userdata(light, self)

		if (verbose && log_dev) console.debug(...c_dev(c_name, `${light.type} created!`, { light }))
	}

	// ---  AFTER  INITIALIZATION  --- //

	// set light_uuid the first time
	$: if (light && light_uuid === undefined) set_uuid()

	function set_uuid(): void {
		light_uuid = light?.uuid
	}

	// GENERATOR REMARK: 'reactive_re_creation_logic' not implemented for 'SpotLight'!

	// Determining 'parent' if 'light' instance has to be created first / was not provided on initialization ('create' is true).
	$: if (light && create && scene && !our_parent) set_parent()

	function set_parent() {
		// get the instance that was shared to us as our 'parent' or use fallback.

		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", light)
	}

	//  IMPORTANT  TODO
	// - see https://github.com/vatro/svelthree/issues/114
	// - see https://github.com/vatro/svelthree/issues/103

	$: if (light && create && our_parent_shadow_dom_el === undefined) {
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
		shadow_dom_el = recreate_shadow_dom_el(shadow_dom_el, our_parent_shadow_dom_el, null, null, c_name)

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
				// add specified `ariaLabel` as text to generated shadow DOM `<div>` element (for better reader support / indexing (?))
				//  TODO  RECONSIDER  needs to be tested more, may be obsolete (?).
				shadow_dom_el.innerText += `${aria[key]}`
			}

			try {
				Object.assign(shadow_dom_el, aria)
			} catch (err) {
				console.error(err)
			}
		}
	}

	// this reactive statement willl be triggered on any 'light' instance change (also e.g. `light.foo = value`)
	$: if (light) if$_instance_change(light, our_parent, light_uuid, create, "light", name, handle_instance_change)

	/** Called from by the `if$_instance_change` logic if needed. */
	function handle_instance_change(): void {
		if (light) {
			if ((light_uuid && light.uuid !== light_uuid) || !light_uuid) {
				const uuid_to_remove: string = light_uuid || light.uuid
				const old_instance: Object3D | undefined = find_in_canvas(store?.scenes, uuid_to_remove)

				if (old_instance) {
					remove_instance(old_instance, "light", light, self)

					// recreate 'sProps'
					if (props) {
						try {
							sProps = new SvelthreeProps(light)
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

			set_initial_userdata(light, self)
			// light with `target`: remember built-in target.
			light.target.userData.is_builtin_target
			light.userData.builtin_target = light.target
			light.userData.target_uuid = light.target.uuid

			if (our_parent) our_parent.add(light)
			light_uuid = light.uuid

			if (verbose && log_dev) {
				console.debug(
					...c_dev(c_name, `${light.type} was added to ${our_parent?.type}!`, {
						light,
						scene,
						total: scene?.children.length
					})
				)
			}
		}
	}

	/** Set `target` of a `Light` with a `target` (`SpotLight` and `DirectionalLight`). Alternatively use `lookAt` which has the same funcionality. */
	export let target: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null = undefined
	$: if (!matrix && !lookAt && light && target) {
		set_target()
	} else {
		if (!light && target) {
			console.error(`SVELTHREE > ${c_name} > Trying to set 'target' : Invalid 'light' instance!`, { light })
		}
		if (matrix && target) {
			console.error(
				`SVELTHREE > ${c_name} > Trying to set 'target' : You cannot use 'target' prop together with 'matrix' prop!`
			)
		}
		if (lookAt && target) {
			console.error(
				`SVELTHREE > ${c_name} > Trying to set 'target' : You cannot use 'lookAt' & 'target' props together!`
			)
		}
	}

	function set_target(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "target", target))
		if (light && target) {
			PropUtils.setLookAtFromValue(light, target)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_target : invalid 'light' instance and / or 'target' value!`, {
				light,
				target
			})
		}
	}

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean | undefined = undefined
	$: if (light) light.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (light && mau !== undefined) light.matrixAutoUpdate = mau

	$: if (light && name) light.name = name
	$: if (shadow_dom_el && name) shadow_dom_el.dataset.name = name

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> | undefined = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties of the created / injected three.js instance via an `Object Literal`. */
	export let props: PropsSpotLight | undefined = undefined

	$: if (!sProps && light && props) sProps = new SvelthreeProps(light)
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
	$: !matrix && light && pos ? set_pos() : pos && light ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))

		if (light && pos) {
			PropUtils.setPositionFromValue(light, pos)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_pos : invalid 'light' instance and / or 'pos' value!`, {
				light,
				pos
			})
		}
	}

	/** **shorthand** attribute for calling the `svelthree`-custom `lookAt` method with the provided value as argument. You can alternatively use the `target` **shorthand** attribute which has the same funcionality. */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Targetable | undefined | null = undefined
	$: if (!matrix && !target && light && lookAt) {
		set_lookat()
	} else {
		if (!light && lookAt) {
			console.error(`SVELTHREE > ${c_name} > Trying to set 'lookAt' : Invalid 'light' instance!`, { light })
		}
		if (matrix && lookAt) {
			console.error(
				`SVELTHREE > ${c_name} > Trying to set 'lookAt' : You cannot use 'lookAt' prop together with 'matrix' prop!`
			)
		}
		if (target && lookAt) {
			console.error(
				`SVELTHREE > ${c_name} > Trying to set 'lookAt' : You cannot use 'lookAt' & 'target' props together!`
			)
		}
	}
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		if (light && lookAt) {
			PropUtils.setLookAtFromValue(light, lookAt)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_lookat : invalid 'light' instance and / or 'lookAt' value!`, {
				light,
				lookAt
			})
		}
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && light) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		if (light && matrix) {
			PropUtils.setMatrixFromValue(light, matrix)
		} else {
			console.error(`SVELTHREE > ${c_name} > set_matrix : invalid 'light' instance and / or 'matrix' value!`, {
				light,
				matrix
			})
		}
	}

	/** Maximum extent of the `SpotLight`, in radians, from its direction. Should be no more than `Math.PI/2`.
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/lights/SpotLight.angle) */
	export let angle: number | undefined = undefined
	$: if (light && angle !== undefined) set_angle()
	function set_angle(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "angle", angle))
		if (light && angle !== undefined) {
			light.angle = angle
		} else {
			console.error(`SVELTHREE > ${c_name} > set_angle : invalid 'light' instance and / or 'angle' value!`, {
				light,
				angle
			})
		}
	}

	/**
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/lights/SpotLight.decay) */
	export let decay: number | undefined = undefined
	$: if (light && decay !== undefined) set_decay()
	function set_decay(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "decay", decay))
		if (light && decay !== undefined) {
			light.decay = decay
		} else {
			console.error(`SVELTHREE > ${c_name} > set_decay : invalid 'light' instance and / or 'decay' value!`, {
				light,
				decay
			})
		}
	}

	/**
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/lights/SpotLight.distance) */
	export let distance: number | undefined = undefined
	$: if (light && distance !== undefined) set_distance()
	function set_distance(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "distance", distance))
		if (light && distance !== undefined) {
			light.distance = distance
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_distance : invalid 'light' instance and / or 'distance' value!`,
				{ light, distance }
			)
		}
	}

	/**
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/lights/SpotLight.penumbra) */
	export let penumbra: number | undefined = undefined
	$: if (light && penumbra !== undefined) set_penumbra()
	function set_penumbra(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "penumbra", penumbra))
		if (light && penumbra !== undefined) {
			light.penumbra = penumbra
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_penumbra : invalid 'light' instance and / or 'penumbra' value!`,
				{ light, penumbra }
			)
		}
	}

	/**
	 * [See threejs-docs.](https://threejs.org/docs/#api/en/lights/SpotLight.power) */
	export let power: number | undefined = undefined
	$: if (light && power !== undefined) set_power()
	function set_power(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "power", power))
		if (light && power !== undefined) {
			light.power = power
		} else {
			console.error(`SVELTHREE > ${c_name} > set_power : invalid 'light' instance and / or 'power' value!`, {
				light,
				power
			})
		}
	}

	export let color: Color | string | number | [r: number, g: number, b: number] | Vector3 | undefined = undefined
	$: if (light && color) set_color()
	function set_color(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "color", color))
		if (light && color !== undefined) {
			PropUtils.setColorFromValueKey(light, color, "color")
		} else {
			console.error(`SVELTHREE > ${c_name} > set_color : invalid 'light' instance and / or 'color' value!`, {
				light,
				color
			})
		}
	}

	/** The light's intensity. Default is 1. */
	export let intensity: number | undefined = undefined
	$: if (light && intensity !== undefined) set_intensity()
	function set_intensity(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "intensity", intensity))
		if (light && intensity !== undefined) {
			light.intensity = intensity
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_intensity : invalid 'light' instance and / or 'intensity' value!`,
				{ light, intensity }
			)
		}
	}

	export let shadowMapSize: number | undefined = undefined

	export let shadowBias: number | undefined = undefined

	export let castShadow: boolean | undefined = undefined

	/** **shorthand** attribute for setting properties of `light.shadow` via an `Object Literal`. */
	export let shadowProps: PropsSpotLightShadow | undefined = undefined

	/** **shorthand** attribute for setting properties of `light.shadow.camera` via an `Object Literal`. */
	export let shadowCameraProps: PropsPerspectiveCamera | undefined = undefined

	export let helperParams: RemoveFirst<HelperParams> | undefined = undefined
	export let helper: boolean | undefined = undefined

	$: light && helper ? add_helper() : null
	$: light && helper !== undefined && !helper ? remove_helper() : null

	// TODO  implements changing params / recreating helper
	function add_helper(): void {
		if (light) {
			if (!light.userData.helper) {
				if (helperParams) {
					light.userData.helper = new SpotLightHelper(light, ...helperParams)
				} else {
					light.userData.helper = new SpotLightHelper(light)
				}

				if (scene) {
					scene.add(light.userData.helper)
				} else {
					console.error(`SVELTHREE > ${c_name} > add_helper : invalid 'scene' instance value!`, { scene })
				}
			} else {
				console.warn(
					`SVELTHREE > ${c_name} > add_helper : Didn't create new helper, 'light.userData.helper' instance already available!`,
					{ light, helper: light.userData.helper }
				)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > add_helper : invalid 'light' instance value!`, { light })
		}
	}

	function remove_helper(): void {
		if (light) {
			if (light.userData.helper) {
				if (light.userData.helper.parent) {
					light.userData.helper.parent.remove(light.userData.helper)
					light.userData.helper = null
				} else {
					console.error(
						`SVELTHREE > ${c_name} > remove_helper : Couldn't remove 'light.userData.helper' from it's 'parent' (not available)!`,
						{ parent: light.userData.helper.parent }
					)
				}
			} else {
				// nothing, silent
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > remove_helper : invalid 'light' instance value!`, { light })
		}
	}

	// update light helper on every render!
	$: if (
		light &&
		helper &&
		((!matrix && !!lookAt !== !!target) || (matrix && !lookAt && !target)) &&
		light.target?.isObject3D &&
		$svelthreeStores[sti]?.rendererComponent
	) {
		start_updating_helper()
	} else {
		reset_light_target()
		stop_updating_helper()
		update_light_helper()
	}

	// call this to remove the renderer component listener
	let remove_helper_updater: (() => void) | undefined

	function start_updating_helper() {
		// IMPORTANT  this does NOT cause a component update! (instead of using requestAnimationFrame)
		// COOL!  this way the helper is 100% synchronious (not 1 frame late)
		if (!remove_helper_updater) {
			if (verbose && log_rs) console.debug(...c_rs(c_name, "start updating light helper on 'before_render_int'!"))
			remove_helper_updater = store?.rendererComponent?.$on("before_render_int", update_light_helper)
		}
	}

	function update_light_helper(): void {
		if (helper) {
			if (light) {
				if (light.userData.helper) {
					light.userData.helper.update()
				} else {
					console.error(
						`SVELTHREE > ${c_name} > update_light_target : Invalid 'light.userData.helper' value!`,
						{
							helper: light.userData.helper
						}
					)
				}
			} else {
				console.error(`SVELTHREE > ${c_name} > update_light_target : Invalid 'light' value!`, {
					light
				})
			}
		}
	}

	function stop_updating_helper(): void {
		if (remove_helper_updater) {
			remove_helper_updater()
			remove_helper_updater = undefined
		}
	}

	// set light target to built-in target and remove it from it's parent
	// we want to keep the last orientation.
	function reset_light_target(): void {
		if (light) {
			if (light.userData.target_uuid !== light.userData.builtin_target.uuid) {
				const builtin_target = light.userData.builtin_target as THREE.Object3D
				light.target.getWorldPosition(builtin_target.position)
				builtin_target.updateMatrix()
				builtin_target.updateMatrixWorld()
				light.target = light.userData.builtin_target
				light.userData.target_uuid = light.userData.builtin_target.uuid
			}

			if (light.target.parent) {
				light.target.parent.remove(light.target)
			}
		} else {
			console.error(`SVELTHREE > ${c_name} > reset_light_target : Invalid 'light' value!`, {
				light
			})
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
	$: if (animation && animationEnabled) ani = new SvelthreeAni(scene, light, animation, !!aniauto)

	let currentSceneActive: boolean | undefined = undefined
	$: currentSceneActive = $svelthreeStores[sti]?.scenes[scene?.userData.index_in_scenes]?.isActive
	$: if (ani && currentSceneActive !== undefined) ani.onCurrentSceneActiveChange(currentSceneActive)

	/** The root scene -> `scene.parent = null`. */
	let root_scene: Scene | undefined = undefined
	let root_scene_obj: { value: Scene | undefined } = { value: undefined }

	$: if (root_scene === undefined) {
		root_scene = get_root_scene(getContext("scene"))
		root_scene_obj.value = root_scene
	}

	$: if (light && root_scene) {
		light.userData.root_scene = root_scene
	}

	export const get_helper = (): SpotLightHelper | undefined | null => {
		if (light) {
			return light.userData.helper as SpotLightHelper
		} else {
			console.error(`SVELTHREE > ${c_name} > get_helper : invalid 'light' instance value!`, { light })
			return light
		}
	}

	/** Removes the (three) instance created by / provided to the component from it's parent. */
	export const remove_instance_from_parent = async (): Promise<boolean> => {
		if (light) {
			const removed: boolean = remove_instance(light, "light")
			return removed
		} else {
			console.error(`SVELTHREE > ${c_name} > remove_instance_from_parent : invalid 'light' instance value!`, {
				light
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
	export const get_instance = (): THREE_SpotLight | undefined | null => light

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

		light = null

		// IMPORTANT //
		// has to be set to `null`, `undefined` would set `light_uuid` if a cleared component recevies a light
		// we don't want that, beacuse then the `handle_instance_change` wouldn't be triggered!
		light_uuid = null
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

					if (light) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onMount : light.", {
									matrixAutoUpdate: light.matrixAutoUpdate,
									matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
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

					if (light) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "onDestroy : light.", {
									matrixAutoUpdate: light.matrixAutoUpdate,
									matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
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

						remove_helper()
						if (ani) ani.destroyAnimation()

						destroy_registered_child_components(generated_children)
						destroy_registered_child_components(user_created_children)

						remove_instance_from_parent()

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

					if (light) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "beforeUpdate : light.", {
									matrixAutoUpdate: light.matrixAutoUpdate,
									matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
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

					if (light) {
						if (verbose && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : light.", {
									matrixAutoUpdate: light.matrixAutoUpdate,
									matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
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
						if (light && !light.matrixAutoUpdate) light.updateMatrix()

						if (verbose && !light.matrixAutoUpdate && log_mau) {
							console.debug(
								...c_mau(c_name, "afterUpdate : light.", {
									matrixAutoUpdate: light.matrixAutoUpdate,
									matrixWorldNeedsUpdate: light.matrixWorldNeedsUpdate
								})
							)
						}

						if (helper && light.userData.helper) light.userData.helper.update()

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

	export const state = (): Partial<IStateSpotLight> => {
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
					light,
					name,
					params,
					tabindex,
					aria,
					target,
					mau,
					matrix,
					props,
					pos,
					lookAt,
					angle,
					decay,
					distance,
					penumbra,
					power,
					color,
					intensity,
					shadowMapSize,
					shadowBias,
					castShadow,
					shadowProps,
					shadowCameraProps,
					helperParams,
					helper,
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

<SvelthreeLightWithShadow
	{light}
	{shadowMapSize}
	{shadowBias}
	{castShadow}
	{shadowProps}
	{shadowCameraProps}
	{log_dev}
/>
