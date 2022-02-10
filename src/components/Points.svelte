<!--
`accessors:true` hast to be set per component because of the svelte-language-server bug, otherwise accessors would be falsely detected as missing and highlighted as errors.
svelthree uses svelte-accmod, where accessors are always `true`, regardless of `svelte:options`.  
-->
<svelte:options accessors />

<!--
@component
**svelthree** _Points_ Component.
[ tbd ]  Link to Docs.
-->
<script context="module" lang="ts">
	/** For typed objects being set as `props` 'shorthand' attribute values, e.g.:
	 * ```
	 * const my_init_props: PointsProps = {...}
	 * component_ref.props = my_init_props
	 * ```
	 * */
	export type PointsProps = OnlyWritableNonFunctionPropsPlus<
		Omit<Points, PropBlackList>,
		{
			position?: Vector3 | Parameters<Vector3["set"]>
			scale?: Vector3 | Parameters<Vector3["set"]>
			rotation?:
				| Euler
				| Parameters<Euler["set"]>
				| Quaternion
				| Parameters<Quaternion["set"]>
				| Vector3
				| Parameters<Vector3["set"]>
			quaternion?: Quaternion | Parameters<Quaternion["set"]>
			matrix?: Matrix4 | Parameters<Matrix4["set"]>
		}
	>

	export type PointsInteractionHandler = (e?: CustomEvent) => void
</script>

<script lang="ts">
	import type { Scene } from "three"

	import { beforeUpdate, onMount, afterUpdate, onDestroy, getContext, setContext } from "svelte"
	import { get_current_component } from "svelte/internal"
	import { self as _self } from "svelte/internal"
	import { c_rs, c_lc, c_mau, c_dev, verbose_mode, get_comp_name } from "../utils/SvelthreeLogger"
	import type { LogLC, LogDEV } from "../utils/SvelthreeLogger"
	import type { OnlyWritableNonFunctionPropsPlus, PropBlackList } from "../types-extra"
	import type { Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three"

	import { svelthreeStores } from "../stores"
	import { PropUtils, SvelthreeProps } from "../utils"

	import { SvelthreeAnimation } from "../components-internal"
	import type { SvelthreeAnimationFunction, SvelthreeAnimationFunctionReturn } from "../types-extra"

	import { SvelthreeInteraction } from "../components-internal"
	import { createEventDispatcher } from "svelte"
	import type { Writable } from "svelte/store"

	import { BoxHelper } from "three"

	import type { BufferGeometry } from "three"

	import { Points } from "three"
	import type { OnlyWritableNonFunctionPropsOverwritten, RemoveFirst } from "../types-extra"
	import type { Material, PointsMaterial, Color } from "three"

	const self = get_current_component()
	const c_name = get_comp_name(self)

	const verbose: boolean = verbose_mode()

	export let log_all: boolean = false
	export let log_dev: { [P in keyof LogDEV]: LogDEV[P] } = log_all ? { all: true } : undefined
	export let log_rs: boolean = log_all
	export let log_lc: { [P in keyof LogLC]: LogLC[P] } = log_all ? { all: true } : undefined
	export let log_mau: boolean = log_all

	const dispatch = createEventDispatcher()

	let scene: Scene = getContext("scene")
	const sti: number = getContext("store_index")

	/** [ **feature**: allow providing (_injection_) of (_already created_) threejs object instances ].
	 * `create` is an internal indicator for how the component's corresponding threejs object instance has to be / has been created.
	 * It's being set to `false` on initialization if an (_already created_) threejs object instance was provided,
	 * otherwise it's set to `true`, means a new threejs object instance will be created. */
	let create = false

	/** The (three) instance that was shared to this component as it's 'parent'. */
	let our_parent: Object3D = undefined

	/** Returns the `points` instance created by the component & allows providing (_injection_) of (_already created / premade_) `THREE.Points` instances. */
	export let points: Points = undefined
	let points_uuid: string = undefined

	// Generic Material type and props
	// COOL!  This is possible now! see https://github.com/sveltejs/language-tools/issues/442#issuecomment-977803507
	// 'mat' shorthand attribute will give us proper intellisense (props list) for the assigned 'material'!
	// TODO  MULTIPLE MATERIALS: this works only with single Material atm, multiple Materials are not implemented yet.
	type AnyMaterial = $$Generic<Material | Material[] | PointsMaterial>
	type AnyMaterialProps = OnlyWritableNonFunctionPropsOverwritten<
		Omit<AnyMaterial, PropBlackList>,
		{ color: Color | string | number | [r: number, g: number, b: number] | number[] | Vector3 }
	>
	export let material: AnyMaterial = undefined
	export let geometry: BufferGeometry = undefined

	export const is_svelthree_component: boolean = true
	export const is_svelthree_points: boolean = true

	if (points) {
		create = false
		on_instance_provided()
	} else {
		create = true
	}

	/** IMPORTANT  Executed when / if an instance was provided **on initializiation** -> only once if at all! */
	function on_instance_provided(): void {
		// check if type of provided instance is correct and then do something with it...
		if (points.type === "Points") {
			points.userData.initScale = points.scale.x
			points.userData.svelthreeComponent = self
		} else {
			throw new Error(
				`SVELTHREE > Points Error: provided 'points' instance has wrong type '${points.type}', should be 'Points'!`
			)
		}
	}

	// Determining 'parent' on initialization if 'points' instance was provided ('create' is false).
	if (!create) {
		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", points)
	}

	// reactive creating / recreating points

	$: if (geometry && create) on_geometry_provided()
	$: if (material && create) on_material_provided()

	function on_geometry_provided() {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "'geometry' provided!"))
		try_geometry_update()
	}

	function on_material_provided() {
		if (verbose && log_dev) console.debug(...c_dev(c_name, "'material' provided!"))
		try_material_update()
	}

	// change geometry and material on provided points

	// we know points has geometry if geometry is available and !create, it was referenced on_instance_provided()
	$: if (geometry && !create) {
		if (geometry !== points.geometry) try_geometry_update()
	}

	// we know points has material if material is available and !create, it was referenced on_instance_provided()
	$: if (material && !create) {
		if (material !== points.material) try_material_update()
	}

	function try_geometry_update(): void {
		if (points) {
			points.geometry = geometry as BufferGeometry

			// update BoxHelper if any
			if (points.userData.box) points.userData.box.update()

			if (verbose && log_dev) console.debug(...c_dev(c_name, "'geometry' updated!"))
		}
	}

	function try_material_update(): void {
		if (points) {
			points.material = material
			if (verbose && log_dev) console.debug(...c_dev(c_name, "'material' updated!"))
			force_material_update()
		}
	}

	function force_material_update(): void {
		// recreate 'sMat' in case sMat was created with / is bound to 'points.material'
		sMat = new SvelthreeProps(material)
		if (sMat && mat) sMat.update(mat)
	}

	// creation using provided geometry & material or constructor 'params' shorthand

	/** Initializes `Points` with provided constructor parameters.*/
	export let params: ConstructorParameters<typeof Points> = undefined

	$: if (!points && create) {
		if (geometry && material) {
			if (params?.length)
				console.error(
					`SVELTHREE Error > ${c_name} : You've set 'geometry', 'material' & 'params' -> specified 'params' will be ignored! Please use either 'geometry' & 'material' or 'params' for initialization.`
				)

			// letting threejs throw errors if anything's wrong with 'geometry' or 'material'
			points = new Points(geometry, material)

			points_uuid = points.uuid

			points.userData.initScale = points.scale.x
			points.userData.svelthreeComponent = self

			if (verbose && log_dev) console.debug(...c_dev(c_name, `${geometry.type} created!`, { points }))
			if (verbose && log_dev) console.debug(...c_dev(c_name, "saved 'geometry' (created):", geometry))
			if (verbose && log_dev) console.debug(...c_dev(c_name, "saved 'material' (created):", material))
		} else {
			// create 'points' via params (can be an empty []) or if no 'params' set (undefined) via new Points()

			// create with params -> since 'geometry' & 'material' are optional, params can also be empty []!
			if (params) {
				// disallow 'params' with 'geometry' or 'material'
				if (geometry)
					throw new Error(
						`SVELTHREE Error > ${c_name} : You've set 'geometry' & 'params' -> specified 'geometry' will be ignored! Please use either 'geometry' & 'material' or 'params' for initialization.`
					)
				if (material)
					throw new Error(
						`SVELTHREE Error > ${c_name} : You've set 'material' & 'params' -> specified 'material' will be ignored! Please use either 'geometry' & 'material' or 'params' for initialization.`
					)

				if (params.length) {
					// letting threejs throw errors if anything's wrong with provided 'params'
					points = new Points(...params)
				} else {
					// will create a blank 'BufferGeometry' and a blank PointsMaterial
					points = new Points()
				}
			} else {
				// no 'geometry', no 'material' and no 'params'
				// will create a blank 'BufferGeometry' or a blank PointsMaterial or both.
				points = new Points(geometry, material)
			}

			points_uuid = points.uuid

			points.userData.initScale = points.scale.x
			points.userData.svelthreeComponent = self

			if (verbose && log_dev) console.debug(...c_dev(c_name, `${geometry.type} created!`, { points }))
		}
	}

	// Determining 'parent' if 'points' instance has to be created first / was not provided on initialization ('create' is true).
	$: if (points && create && !our_parent) set_parent()

	function set_parent() {
		// get the instance that was shared to us as our 'parent'.
		our_parent = getContext("parent") || scene

		// share created object (three) instance to all children (slots) as 'parent'.
		setContext("parent", points)
	}

	// this statement is being triggered on creation / recreation
	$: if (
		points &&
		((points_uuid && points_uuid !== points.uuid) || (points.parent !== our_parent && points !== our_parent))
	)
		add_instance_to()

	function add_instance_to(): void {
		//let replacing = false

		// if 'points' was already created or set via 'points' attribute before
		if (points_uuid && points.uuid !== points_uuid) {
			// remove old instance and update references where needed

			const old_instance: Object3D = scene.getObjectByProperty("uuid", points_uuid)

			// update 'index_in_x'

			if (old_instance.userData.helper?.parent) {
				old_instance.userData.helper.parent.remove(old_instance.userData.helper)
				old_instance.userData.helper = null
			}

			if (old_instance.userData.box?.parent) {
				old_instance.userData.helper.parent.remove(old_instance.userData.helper)
				old_instance.userData.box = null
			}

			if (old_instance.parent) old_instance.parent.remove(old_instance)

			// recreate 'SvelthreeProps'
			// - all initially set props will be applied to the new instance.
			// - 'props' attribute can be used directly after points reassignment.
			sProps = new SvelthreeProps(points)

			// helpers will be recreated automatically
			// (see corresponding reactive statement -> !points.userData.helper)
		}

		// add `points` to `our_parent`
		if (our_parent) {
			// TODO  UNDERSTAND completely why we need the `points !== our_parent` check (was added as quick-fix)
			// TODO  Update - we changed the approach, still needed?
			if (points.parent !== our_parent && points !== our_parent) {
				our_parent.add(points)
				points_uuid = points.uuid

				if (verbose && log_dev) {
					console.debug(
						...c_dev(c_name, `${points.type} was added to ${our_parent.type}!`, {
							points,
							scene,
							total: scene.children.length
						})
					)
				}
			} else {
				// TODO / TOFIX  why is this happening if `!replacing`?
				//if (!replacing) console.warn(`points was already added to the ${get_comp_name(our_parent)}`, {points, our_parent, scene})
			}
		} else {
			console.error("No 'our_parent' (or 'scene')! Nothing to add 'points' to!", { points, our_parent, scene })
		}
	}

	/** Override object's `.matrixAutoUpdate` set (*on initialzation*) by scene's `.matrixAutoUpdate` (*default is `true`*). Also: `mau` can be changed on-the-fly.*/
	export let mau: boolean = undefined
	$: if (points) points.matrixAutoUpdate = scene.matrixAutoUpdate
	$: if (points && mau !== undefined) points.matrixAutoUpdate = mau

	export let name: string = undefined
	$: if (points && name) points.name = name

	let sMat: SvelthreeProps

	$: if (!sMat) {
		if (points.material) {
			sMat = new SvelthreeProps(points.material)
		}
	}

	// Generic Material props
	// COOL!  This works now! 'mat' shorthand attribute will give us proper intellisense (props list) for the assigned 'material'!
	// TODO  MULTIPLE MATERIALS: this works only with single Material atm, multiple Materials are not implemented yet.
	/** **shorthand** attribute for setting properties of a `Material` using key-value pairs in an `Object`. */
	export let mat: { [P in keyof AnyMaterialProps]: AnyMaterialProps[P] } = undefined
	$: if (mat && sMat) sMat.update(mat)

	/** ☝️ `matrix` **shorthand** attribute overrides ( *are ignored* ) `pos`, `rot`, `quat`, `scale` and `lookAt` 'shorthand' attributes! */
	export let matrix: Matrix4 | Parameters<Matrix4["set"]> = undefined

	const w_sh = PropUtils.getShortHandAttrWarnings(`SVELTHREE > ${c_name} >`)

	let sProps: SvelthreeProps

	// IMPORTANT  `props` will be overridden by 'shorthand' attributes!
	/** **shorthand** attribute for setting properties using key-value pairs in an `Object`. */
	export let props: { [P in keyof PointsProps]: PointsProps[P] } = undefined

	$: if (!sProps && points && props) sProps = new SvelthreeProps(points)
	$: if (props && sProps) update_props()
	function update_props() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "props", props))
		sProps.update(props)
	}

	// IMPORTANT  following 'shorthand' attributes will override `props` attribute!

	/** **shorthand** attribute for setting the `position` property. */
	export let pos: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && points && pos ? set_pos() : pos && points ? console.warn(w_sh.pos) : null
	function set_pos() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "pos", pos))
		PropUtils.setPositionFromValue(points, pos)
	}

	/** **shorthand** attribute for setting the `rotation` property. */
	export let rot:
		| Euler
		| Parameters<Euler["set"]>
		| Quaternion
		| Parameters<Quaternion["set"]>
		| Vector3
		| Parameters<Vector3["set"]> = undefined
	$: !matrix && !quat && points && rot ? set_rot() : rot && points ? console.warn(w_sh.rot) : null
	function set_rot() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "rot", rot))
		PropUtils.setRotationFromValue(points, rot)
	}

	/** **shorthand** attribute for setting the `quaternion` property. */
	export let quat: Quaternion | Parameters<Quaternion["set"]> = undefined
	$: !matrix && points && quat ? set_quat() : quat && points ? console.warn(w_sh.quat) : null
	function set_quat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "quat", quat))
		PropUtils.setQuaternionFromValue(points, quat)
	}

	export let scale: Vector3 | Parameters<Vector3["set"]> = undefined
	$: !matrix && points && scale ? set_scale() : scale && points ? console.warn(w_sh.scale) : null
	function set_scale() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "scale", scale))
		PropUtils.setScaleFromValue(points, scale)
	}

	/** */
	export let lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D = undefined
	$: !matrix && points && lookAt ? set_lookat() : lookAt && points ? console.warn(w_sh.lookAt) : null
	function set_lookat() {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "lookAt", lookAt))
		PropUtils.setLookAtFromValue(points, lookAt)
	}

	// IMPORTANT  `matrix` 'shorthand' attribute will override all other transforms ('shorthand' attributes)!
	$: if (matrix && points) set_matrix()
	function set_matrix(): void {
		if (verbose && log_rs) console.debug(...c_rs(c_name, "matrix", matrix))
		PropUtils.setMatrixFromValue(points, matrix)
	}

	export let castShadow: boolean = undefined
	$: if (castShadow !== undefined && points) points.castShadow = castShadow

	export let receiveShadow: boolean = undefined
	$: if (receiveShadow !== undefined && points) points.receiveShadow = receiveShadow

	type BoxHelperParams = ConstructorParameters<typeof BoxHelper>
	export let boxParams: RemoveFirst<BoxHelperParams> = undefined
	/** Creates and adds a `BoxHelper`. */
	export let box: boolean = undefined

	$: if (box && points && !points.userData.box) add_box_helper()
	$: if (!box && points.userData.box) remove_box_helper()

	function add_box_helper() {
		if (boxParams) {
			points.userData.box = new BoxHelper(points, ...boxParams)
		} else {
			points.userData.box = new BoxHelper(points)
		}

		scene.add(points.userData.box)
	}

	function remove_box_helper() {
		if (points.userData.box?.parent) {
			points.userData.box.parent.remove(points.userData.box)
			points.userData.box = null
		}
	}

	export let interact: boolean = undefined

	let interactive: boolean = undefined
	const canvas_interactivity: Writable<{ enabled: boolean }> = getContext("canvas_interactivity")

	$: interactive = $canvas_interactivity.enabled

	let interactionEnabled: boolean = undefined
	$: interactionEnabled = interactive && interact

	export let onClick: PointsInteractionHandler = undefined
	onClick // prevent 'unused-export-let' warning

	export let onPointerUp: PointsInteractionHandler = undefined
	onPointerUp // prevent 'unused-export-let' warning

	export let onPointerDown: PointsInteractionHandler = undefined
	onPointerDown // prevent 'unused-export-let' warning

	export let onPointerOver: PointsInteractionHandler = undefined
	onPointerOver // prevent 'unused-export-let' warning

	export let onPointerOut: PointsInteractionHandler = undefined
	onPointerOut // prevent 'unused-export-let' warning

	export let onPointerEnter: PointsInteractionHandler = undefined
	onPointerEnter // prevent 'unused-export-let' warning

	export let onPointerLeave: PointsInteractionHandler = undefined
	onPointerLeave // prevent 'unused-export-let' warning

	export let onPointerMove: PointsInteractionHandler = undefined
	onPointerMove // prevent 'unused-export-let' warning

	let ani: any

	let currentSceneActive = false
	$: currentSceneActive = $svelthreeStores[sti].scenes[scene.userData.index_in_scenes]?.isActive

	export let animation: SvelthreeAnimationFunction = undefined

	export let aniauto: boolean = undefined

	let animationEnabled: boolean = false
	$: if (animation) animationEnabled = true

	/** Removes the (three) instance of the object created by the component from it's parent. */
	export const remove_instance_from_parent = (): void => {
		if (points.parent) points.parent.remove(points)
	}
	/**
	 * Same as `remove_instance_from_parent()` just shorter syntax.
	 * Removes the (three) instance of the object created by the component from it's parent.
	 */
	export const remove = remove_instance_from_parent

	/** Returns the (three) instance of the object created by the component. */
	export const get_instance = (): Points => points

	/** Returns the `animation` object. */
	export const get_animation = (): any => ani.getAnimation()
	/** Same as `get_animation()` just shorter syntax. Returns the `animation` object. */
	export const get_ani = get_animation

	/** Starts the `animation` object. */
	export const start_animation = (): void => ani.startAni()
	/** Same as `start_animation()` just shorter syntax. Starts the `animation` object. */
	export const start_ani = start_animation

	/** **Completely replace** `onMount` -> any `onMount_inject_before` & `onMount_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	export let onMount_replace: (args?: any) => any = undefined

	onMount(
		onMount_replace
			? async () => onMount_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.om)) {
						console.info(...c_lc(c_name, "onMount"))
					}

					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "onMount : points.", {
								matrixAutoUpdate: points.matrixAutoUpdate,
								matrixWorldNeedsUpdate: points.matrixWorldNeedsUpdate
							})
						)
					}
			  }
	)

	/** **Inject** functionality **before** component's existing `onDestroy` logic.
	 * _default verbosity not affected._ */
	export let onDestroy_inject_before: (args?: any) => any = undefined

	/** **Inject** functionality **after** component's existing `onDestroy` logic.
	 * _default verbosity not affected._ */
	export let onDestroy_inject_after: (args?: any) => any = undefined

	/** **Completely replace** `onDestroy` -> any `onDestroy_inject_before` & `onDestroy_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	export let onDestroy_replace: (args?: any) => any = undefined

	onDestroy(
		onDestroy_replace
			? async () => onDestroy_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.od)) {
						console.info(...c_lc(c_name, "onDestroy"))
					}

					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "onDestroy : points.", {
								matrixAutoUpdate: points.matrixAutoUpdate,
								matrixWorldNeedsUpdate: points.matrixWorldNeedsUpdate
							})
						)
					}

					if (onDestroy_inject_before) onDestroy_inject_before()

					remove_box_helper()

					if (onDestroy_inject_after) onDestroy_inject_after()
			  }
	)

	/** **Completely replace** `beforeUpdate` -> any `beforeUpdate_inject_before` & `beforeUpdate_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	export let beforeUpdate_replace: (args?: any) => any = undefined

	beforeUpdate(
		beforeUpdate_replace
			? async () => beforeUpdate_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.bu)) {
						console.info(...c_lc(c_name, "beforeUpdate"))
					}

					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "beforeUpdate : points.", {
								matrixAutoUpdate: points.matrixAutoUpdate,
								matrixWorldNeedsUpdate: points.matrixWorldNeedsUpdate
							})
						)
					}
			  }
	)

	/** **Inject** functionality **before** component's existing `afterUpdate` logic.
	 * _default verbosity not affected._ */
	export let afterUpdate_inject_before: (args?: any) => any = undefined

	/** **Inject** functionality **after** component's existing `afterUpdate` logic.
	 * _default verbosity not affected._ */
	export let afterUpdate_inject_after: (args?: any) => any = undefined

	/** **Completely replace** `afterUpdate` -> any `afterUpdate_inject_before` & `afterUpdate_inject_after` will be ignored.
	 * _default verbosity will be gone!_ */
	export let afterUpdate_replace: (args?: any) => any = undefined

	afterUpdate(
		afterUpdate_replace
			? async () => afterUpdate_replace(_self)
			: async () => {
					if (verbose && log_lc && (log_lc.all || log_lc.au)) {
						console.info(...c_lc(c_name, "afterUpdate"))
					}

					if (verbose && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : points.", {
								matrixAutoUpdate: points.matrixAutoUpdate,
								matrixWorldNeedsUpdate: points.matrixWorldNeedsUpdate
							})
						)
					}

					if (afterUpdate_inject_before) afterUpdate_inject_before()

					// Update local matrix after all (props) changes (async microtasks) have been applied.
					if (!points.matrixAutoUpdate) points.updateMatrix()

					if (verbose && !points.matrixAutoUpdate && log_mau) {
						console.debug(
							...c_mau(c_name, "afterUpdate : points.", {
								matrixAutoUpdate: points.matrixAutoUpdate,
								matrixWorldNeedsUpdate: points.matrixWorldNeedsUpdate
							})
						)
					}

					if (box && points.userData.box) points.userData.box.update()

					if (afterUpdate_inject_after) afterUpdate_inject_after()
			  }
	)
</script>

<!-- using context -->
<slot />

<!-- TODO  get rid of the SvelthreeAnimation component / create a ts class -->
{#if animation}
	<SvelthreeAnimation
		bind:this={ani}
		bind:currentSceneActive
		obj={points}
		{animationEnabled}
		{animation}
		{aniauto}
		{log_lc}
	/>
{/if}

{#if $svelthreeStores[sti].renderer && $svelthreeStores[sti].renderer.xr.enabled === false}
	<SvelthreeInteraction {dispatch} obj={points} parent={self} {interactionEnabled} {log_dev} {log_lc} />
{/if}
