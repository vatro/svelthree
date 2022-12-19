<!--
@component
**svelthree** _OrbitControls_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	type CurrentComponentType = import("./OrbitControls.svelte").default

	export interface IStateOrbitControls {
		readonly log_all: boolean
		readonly log_rs: boolean
		readonly log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined
		readonly orbitcontrols: THREE_OrbitControls | undefined | null
		readonly warn: boolean
		readonly cam:
			| PerspectiveCamera
			| OrthographicCamera
			| THREE_PerspectiveCamera
			| THREE_OrthographicCamera
			| undefined
		readonly dom_el: HTMLElement | Canvas | undefined
		readonly props: PropsOrbitControls | undefined
		readonly enabled: boolean
		readonly target: Vector3 | undefined
		readonly rotate: boolean
		readonly auto: boolean
		readonly auto_speed: number | undefined
		readonly damping: boolean
		readonly pan: boolean
		readonly zoom: boolean
		readonly onMountReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyStart: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyEnd: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly onDestroyReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly beforeUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
		readonly afterUpdateReplace: SvelthreeLifecycleCallback<CurrentComponentType> | undefined
	}
</script>

<script lang="ts">
	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { c_rs, c_lc, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger.js"
	import type { LogLC } from "../utils/SvelthreeLogger.js"
	import type { SvelthreeLifecycleCallback } from "../types/types-extra.js"

	import { svelthreeStores } from "../stores/index.js"
	import { SvelthreeProps } from "../utils/index.js"

	import type { Writable } from "svelte/store"

	import { OrbitControls as THREE_OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
	import type { PropsOrbitControls } from "../types/types-comp-props.js"
	// TODO  implement correctly
	//import { CameraHelper } from "three"
	import type {
		Vector3,
		PerspectiveCamera as THREE_PerspectiveCamera,
		OrthographicCamera as THREE_OrthographicCamera
	} from "three"
	import type { default as PerspectiveCamera } from "./PerspectiveCamera.svelte"
	import type { default as OrthographicCamera } from "./OrthographicCamera.svelte"
	import type { default as Canvas } from "../components/Canvas.svelte"

	const self = get_current_component()
	const c_name = get_comp_name(self)
	/** svelthree component's type (e.g. `type` prop value of component `Foo` will be `'Foo'`) */
	export const type: string = c_name

	const verbose: boolean = verbose_mode()

	export let log_all = false
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } | undefined = log_all ? { all: true } : undefined

	const sti: number = getContext("store_index")
	const store = $svelthreeStores[sti]

	const canvas_dom: Writable<{ element: HTMLCanvasElement }> = getContext("canvas_dom")
	/** Returns the `orbitcontrols` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.OrbitControls` instances. */
	export let orbitcontrols: THREE_OrbitControls | undefined | null = undefined

	export const is_svelthree_component = true
	export const is_svelthree_orbitcontrols = true

	/** Display a console warning if the `OrbitControls` component's `cam` attribute was assigned a currently _inactive_ camera (also adss a `CameraHelper` to the assigned Camera). Default is `true`. Set `warn={false}` to hide the warning (_also: no `CameraHelper` be added_). */
	export let warn = true

	// TODO  clarify why / when we would need this.
	let index_in_orbitcontrols: number | undefined = undefined

	/** Get `OrbitControls` three.js instance's index in the `orbitcontrols`-array (svelthreeStore).
	 * Can also be obtained via created `orbitcontrols` instance directly: `orbitcontrols_comp_ref.orbitcontrols.userData.index_in_orbitcontrols`
	 */
	export const get_index_in_orbitcontrols = (): number | undefined => index_in_orbitcontrols

	export let cam:
		| PerspectiveCamera
		| OrthographicCamera
		| THREE_PerspectiveCamera
		| THREE_OrthographicCamera
		| undefined = undefined
	export let dom_el: HTMLElement | Canvas | undefined = undefined

	/** mode `"auto"`: schedule render loop rAF id */
	let rAF = { id: 0 }

	// renderer (needed) updates orbitcontrols in case of damping and autorotate,
	// canvas_dom.element and activeCamera are needed for default values if no 'cam' or 'dom_el' were provided.
	$: if (
		!orbitcontrols &&
		$canvas_dom?.element &&
		$svelthreeStores[sti]?.activeCamera &&
		$svelthreeStores[sti]?.rendererComponent
	) {
		create_orbitcontrols()
	}

	/** `OrbitControls` are bound to a `Camera` and a `<canvas>` DOM Element,
	 * so the `OrbitControls` component can be placed anywhere in the components scene graph. */
	function create_orbitcontrols(): void {
		//console.log("create_orbitcontrols!")
		const oc_cam: THREE_PerspectiveCamera | THREE_OrthographicCamera | undefined | null = get_oc_cam()
		const oc_dom: HTMLElement | undefined = get_oc_dom()

		if (store && oc_cam && oc_dom) {
			orbitcontrols = new THREE_OrbitControls(oc_cam, oc_dom)
			let oc_userData: { [key: string]: unknown } | undefined = orbitcontrols[
				"userData" as keyof typeof orbitcontrols
			] as { [key: string]: unknown }

			if (!oc_userData) {
				Object.defineProperty(orbitcontrols, "userData", { value: {}, writable: true })
				oc_userData = orbitcontrols["userData" as keyof typeof orbitcontrols] as { [key: string]: unknown }
			}

			store.orbitcontrols.push(orbitcontrols)
			index_in_orbitcontrols = oc_userData.index_in_orbitcontrols as number
			oc_userData.svelthreeComponent = self

			if (oc_cam !== store.activeCamera && warn) {
				/* TODO  Why are we adding a helper here?! (probably for hard-testing) -> it seems the helper functionality is unfinshed.
				if (oc_cam.parent) {
					const camhelper = new CameraHelper(oc_cam)
					oc_cam.parent.add(camhelper)
				} else {
					console.warn(`SVELTHREE > ${c_name} > ${c_name} > create_orbitcontrols: Cannot add camera helper to 'parent', 'oc_cam' has no 'parent'!.`,{ oc_cam }
				}
				*/
				console.warn(
					`SVELTHREE > ${c_name} > OrbitControls 'cam' is not the currently active camera, is this intended? Set 'warn={false}' to hide this warning (CameraHelper will also not be added anymore).`,
					{ orbitcontrols }
				)
			}

			// mode 'auto'
			if (store.rendererComponent?.get_mode() === "auto") {
				if (auto === true) {
					// schedule render every animation frame
					rAF.id = requestAnimationFrame(() => on_orbitcontrols_change(null))
				} else {
					// schedule render on `"change"` event
					orbitcontrols.addEventListener("change", on_orbitcontrols_change)
				}
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > create_orbitcontrols : Cannot create 'orbitcontrols', invalid 'store' and/or 'oc_cam' and/or 'oc_dom' value!`,
				{ store, oc_cam, oc_dom }
			)
		}
	}

	// schedule render
	function on_orbitcontrols_change(e: Parameters<Parameters<THREE_OrbitControls["addEventListener"]>[1]>[0]): void {
		if (orbitcontrols) {
			orbitcontrols.object.userData.root_scene.userData.dirty = true
			if (store?.rendererComponent) {
				store.rendererComponent.schedule_render_auto(orbitcontrols.object.userData.root_scene)
			} else {
				console.error(
					`SVELTHREE > ${c_name} > on_orbitcontrols_change : Cannot schedule render (auto), invalid 'store.rendererComponent' value!`,
					{ rendererComponent: store?.rendererComponent }
				)
			}

			// schedule next render (loop) if function was not called by an event
			if (e === null) rAF.id = requestAnimationFrame(() => on_orbitcontrols_change(null))
		} else {
			console.error(`SVELTHREE > ${c_name} > on_orbitcontrols_change : invalid 'orbitcontrols' instance value!`, {
				orbitcontrols
			})
		}
	}

	function get_oc_cam(): THREE_PerspectiveCamera | THREE_OrthographicCamera | undefined | null {
		if (cam !== undefined && cam["is_svelthree_camera" as keyof typeof cam]) {
			return (cam as PerspectiveCamera | OrthographicCamera).get_instance()
		}
		if (cam !== undefined && (cam as THREE_PerspectiveCamera)["isPerspectiveCamera"]) {
			return cam as THREE_PerspectiveCamera
		}
		if (cam !== undefined && (cam as THREE_OrthographicCamera)["isOrthographicCamera"]) {
			return cam as THREE_OrthographicCamera
		}
		if (cam === undefined) {
			return store?.activeCamera
		}
	}

	function get_oc_dom(): HTMLElement | undefined {
		if (dom_el !== undefined && (dom_el as Canvas)["is_svelthree_canvas"]) {
			return (dom_el as Canvas).getDomElement()
		}
		if (dom_el !== undefined) {
			return dom_el as HTMLElement
		}
		if (dom_el === undefined) {
			return $canvas_dom.element
		}
	}

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties of the created / injected three.js instance via an `Object Literal`. */
	export let props: PropsOrbitControls | undefined = undefined

	$: if (!sProps && orbitcontrols && props) sProps = new SvelthreeProps(orbitcontrols)
	$: if (props && sProps) update_props()
	function update_props() {
		if (props) {
			if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
			sProps.update(props)
		}
	}

	/** When set to false, the controls will not respond to user input. Default is `true`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enabled) */
	export let enabled = true
	$: if (orbitcontrols && (enabled === true || !enabled)) set_enabled()

	function set_enabled(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "enabled", enabled))
		if (orbitcontrols) {
			orbitcontrols.enabled = !!enabled
		} else {
			console.error(`SVELTHREE > ${c_name} > set_enabled : invalid 'orbitcontrols' instance value!`, {
				orbitcontrols
			})
		}
	}

	/** The focus point of the controls, the `.object` orbits around this. It can be updated manually at any point to change the focus of the controls.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.target) */
	export let target: Vector3 | undefined = undefined
	$: if (orbitcontrols && target !== undefined) set_target()

	function set_target(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "target", target))
		if (orbitcontrols && target !== undefined) {
			orbitcontrols.target = target
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_target : invalid 'orbitcontrols' instance and / or 'target' prop value!`,
				{ orbitcontrols, target }
			)
		}
	}

	/** Enable or disable horizontal and vertical rotation of the camera. Default `true`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enableRotate) */
	export let rotate = true
	$: if (orbitcontrols && (rotate === true || !rotate)) set_rotate()

	function set_rotate(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rotate", rotate))
		if (orbitcontrols) {
			orbitcontrols.enableRotate = !!rotate
		} else {
			console.error(`SVELTHREE > ${c_name} > set_rotate : invalid 'orbitcontrols' instance value!`, {
				orbitcontrols
			})
		}
	}

	/** Set to `true` to automatically rotate around the target. Default is `false`.
	 * - With `WebGLRenderer` component's `mode` set to `"auto"`:
	 *     - `true`: will schedule a render on every AF.
	 *     - `false`: will schedule a render on `OrbitControls`'s event `"change"`.
	 *
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.autoRotate) */
	export let auto = false
	$: if (orbitcontrols && auto !== undefined) set_auto()

	function set_auto(): void {
		if (orbitcontrols && auto !== undefined) {
			if (verbose && log_rs) console.debug(...c_rs(c_name, "auto", auto))
			orbitcontrols.autoRotate = !!auto

			if (!orbitcontrols.autoRotate) {
				if (rAF.id) {
					cancelAnimationFrame(rAF.id)
					rAF.id = 0
					orbitcontrols.addEventListener("change", on_orbitcontrols_change)
				}
			} else {
				if (store?.rendererComponent) {
					if (store.rendererComponent.mode === "auto") {
						orbitcontrols.removeEventListener("change", on_orbitcontrols_change)
						if (rAF.id === 0) rAF.id = requestAnimationFrame(() => on_orbitcontrols_change(null))
					}
				} else {
					console.error(
						`SVELTHREE > ${c_name} > set_auto : Cannot remove 'change' EventListener, invalid 'store' or 'store.rendererComponent' value!`,
						{ store, rendererComponent: store?.rendererComponent }
					)
				}
			}
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_auto : invalid 'orbitcontrols' instance and / or 'auto' prop value!`,
				{ orbitcontrols, auto }
			)
		}
	}

	/** How fast to rotate around the target if `autorot` is `true`. Default is `2.0`, which equates to 30 seconds per orbit at 60fps.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.autoRotateSpeed) */
	export let auto_speed: number | undefined = undefined
	$: if (orbitcontrols && auto_speed !== undefined) set_auto_speed()

	function set_auto_speed(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "auto_speed", auto_speed))
		if (orbitcontrols && auto_speed !== undefined) {
			orbitcontrols.autoRotateSpeed = auto_speed
		} else {
			console.error(
				`SVELTHREE > ${c_name} > set_auto_speed : invalid 'orbitcontrols' instance and / or 'auto_speed' prop value!`,
				{ orbitcontrols, auto_speed }
			)
		}
	}

	/** Set to true to enable damping (inertia), which can be used to give a sense of weight to the controls. Default is `false`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enableDamping) */
	export let damping = false
	$: if (orbitcontrols && (damping === true || !damping)) set_damping()

	function set_damping(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "damping", damping))
		if (orbitcontrols) {
			orbitcontrols.enableDamping = !!damping
		} else {
			console.error(`SVELTHREE > ${c_name} > set_damping : invalid 'orbitcontrols' instance value!`, {
				orbitcontrols
			})
		}
	}

	/** Enable or disable camera panning. Default is `true`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enablePan) */
	export let pan = true
	$: if (orbitcontrols && (pan === true || !pan)) set_pan()

	function set_pan(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pan", pan))
		if (orbitcontrols) {
			orbitcontrols.enablePan = !!pan
		} else {
			console.error(`SVELTHREE > ${c_name} > set_pan : invalid 'orbitcontrols' instance value!`, {
				orbitcontrols
			})
		}
	}

	/** Enable or disable zooming (dollying) of the camera. Default `false`.
	 * [See threejs-docs.](https://threejs.org/docs/#examples/en/controls/OrbitControls.enableZoom) */
	export let zoom = false
	$: if (orbitcontrols && (zoom === true || !zoom)) set_zoom()

	function set_zoom(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "zoom", zoom))
		if (orbitcontrols) {
			orbitcontrols.enableZoom = !!zoom
		} else {
			console.error(`SVELTHREE > ${c_name} > set_zoom : invalid 'orbitcontrols' instance value!`, {
				orbitcontrols
			})
		}
	}

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): THREE_OrbitControls | undefined | null => orbitcontrols

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

					if (orbitcontrols) {
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

					if (orbitcontrols) {
						if (onDestroyStart) {
							if (onDestroyStart.constructor.name === "AsyncFunction") {
								await onDestroyStart(self)
							} else {
								onDestroyStart(self)
							}
						}

						if (rAF.id) cancelAnimationFrame(rAF.id)
						orbitcontrols.removeEventListener("change", on_orbitcontrols_change)

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

					if (orbitcontrols) {
						//no special `svelthree`-logic here
					}
			  }
	)

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

					if (orbitcontrols) {
						//no special `svelthree`-logic here
					}
			  }
	)

	export const state = (): Partial<IStateOrbitControls> => {
		return {}
	}

	if (!Object.hasOwn(self, "state")) {
		Object.defineProperty(self, "state", {
			value: () => {
				return {
					log_all,
					log_rs,
					log_lc,
					orbitcontrols,
					warn,
					cam,
					dom_el,
					props,
					enabled,
					target,
					rotate,
					auto,
					auto_speed,
					damping,
					pan,
					zoom,
					onMountReplace,
					onDestroyStart,
					onDestroyEnd,
					onDestroyReplace,
					beforeUpdateReplace,
					afterUpdateReplace
				}
			},
			writable: false
		})
	}
</script>
