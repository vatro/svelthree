type OnlyWritableNonFunctionPropsOverwritten<T, V> = Partial<
	Omit<
		Pick<
			T,
			{
				[P in keyof T]-?: (<U>() => U extends { [Q in P]: T[P] } ? 1 : 2) extends <U>() => U extends {
					-readonly [Q in P]: T[P]
				}
					? 1
					: 2
					? // eslint-disable-next-line @typescript-eslint/ban-types
					  T[P] extends Function
						? never
						: P
					: never
			}[keyof T]
		>,
		PropBlackList | keyof V
	> &
		V & { readonly $T?: T }
>

export type get_props_overwritten<T, V> = OnlyWritableNonFunctionPropsOverwritten<T, V>

type OnlyWritableNonFunctionProps<T> = Partial<
	Omit<
		Pick<
			T,
			{
				[P in keyof T]-?: (<U>() => U extends { [Q in P]: T[P] } ? 1 : 2) extends <U>() => U extends {
					-readonly [Q in P]: T[P]
				}
					? 1
					: 2
					? // eslint-disable-next-line @typescript-eslint/ban-types
					  T[P] extends Function
						? never
						: P
					: never
			}[keyof T]
		>,
		PropBlackList
	> & { readonly $T?: T }
>

export type get_props<T> = OnlyWritableNonFunctionProps<T>

export type RemoveFirst<T extends unknown[]> = T extends [unknown, ...infer R] ? R : T
export type RemoveLast<T extends unknown[]> = T extends [...infer H, unknown] ? H : T

export type MeshMaterialWithColor =
	| THREE.MeshBasicMaterial
	//| THREE.MeshDepthMaterial
	//| THREE.MeshDistanceMaterial
	| THREE.MeshLambertMaterial
	| THREE.MeshMatcapMaterial
	//| THREE.MeshNormalMaterial
	| THREE.MeshPhongMaterial
	| THREE.MeshPhysicalMaterial
	| THREE.MeshStandardMaterial
	| THREE.MeshToonMaterial
	//| THREE.RawShaderMaterial
	//| THREE.ShaderMaterial
	| THREE.ShadowMaterial

export type MeshMaterialWithEnvMap =
	| THREE.MeshBasicMaterial
	//| THREE.MeshDepthMaterial
	//| THREE.MeshDistanceMaterial
	| THREE.MeshLambertMaterial
	//| THREE.MeshMatcapMaterial
	//| THREE.MeshNormalMaterial
	| THREE.MeshPhongMaterial
	| THREE.MeshPhysicalMaterial
	| THREE.MeshStandardMaterial
//| THREE.MeshToonMaterial
//| THREE.RawShaderMaterial
//| THREE.ShaderMaterial
//| THREE.ShadowMaterial

export type MeshAssignableMaterial =
	| THREE.MeshBasicMaterial
	| THREE.MeshDepthMaterial
	| THREE.MeshDistanceMaterial
	| THREE.MeshLambertMaterial
	| THREE.MeshMatcapMaterial
	| THREE.MeshNormalMaterial
	| THREE.MeshPhongMaterial
	| THREE.MeshPhysicalMaterial
	| THREE.MeshStandardMaterial
	| THREE.MeshToonMaterial
	| THREE.RawShaderMaterial
	| THREE.ShaderMaterial
	| THREE.ShadowMaterial

export type PointsAssignableMaterial = THREE.PointsMaterial | MeshAssignableMaterial

// Animation

/** Generated animation-`Object Literal`. */
export interface SvelthreeAnimation {
	/** Usually used to define the intial state of the animation and start the animation (_set inital prop values and call a function which starts the animation_). */
	onStart: () => void
	/** Usually used to destroy (_stop / kill / nullify_) any processes which would otherwise remain in memory. */
	onDestroy: () => void
	/** (optional) What should happen with the animation if the parent scene is not the active (_rendered_) scene during the animation?
	 * _Usually used for pausing the animation in a multiple top-level Scenes scenario._
	 */
	onSceneDeactivated?: () => void
	/** (optional) What should happen with the animation if the parent scene is active (_rendered_) again (_reactivated_) during the animation?
	 * _Usually used for continuing the animation in a multiple top-level Scenes scenario._
	 */
	onSceneReactivated?: () => void
	/** Any other method or property that should be callable / accessible via e.g. `component_ref.get_ani().foo()` or `component_ref.get_ani().foo`. */
	[foo: string | number | symbol]: (() => void) | undefined
}

/**
 * Function (_Closure_) containing some animation logic. `SvelthreeAnimationFunction` is being processed internally by the component, the resulting `SvelthreeAnimation` (_`Object Literal`_) can be obtained via `component_ref.get_ani()`.
 * ```
 * (foo: THREE.Object3D, ...args: any[]) => {
 *      onStart: () => void
 *      onDestroy: () => void
 *      onSceneDeactivated?: () => void
 *      onSceneReactivated?: () => void
 *      [anything: string]: any
 * }
 * ```
 * ☝️ `foo` is basically just a named / declared argument, it will be internally replaced by the
 * `THREE.Object3D`-based instance-reference created by the component the animation function
 * has been applied to via the `animation` attribute, e.g. `animation={my_animation_function}`.
 *
 */
/*eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }]*/
export type SvelthreeAnimationFunction = (foo: THREE.Object3D, ...args: any[]) => SvelthreeAnimation

export type LightWithShadow = THREE.DirectionalLight | THREE.SpotLight | THREE.PointLight
export type LightWithTarget = THREE.DirectionalLight | THREE.SpotLight
export type LightShadowProps<T> = OnlyWritableNonFunctionProps<Omit<T, PropBlackList>>
export type LightShadowCamProps<T> = OnlyWritableNonFunctionProps<Omit<T, PropBlackList>>

export type PropBlackList =
	| "id"
	| "uuid"
	| "type"
	| "children"
	| "parent"
	| "matrix"
	| "matrixWorld"
	| "matrixWorldNeedsUpdate"
	| "modelViewMatrix"
	| "normalMatrix"
	| "version"
	| "isMaterial"

export type ComplexValueType =
	| "Vector2"
	| "Array2Nums"
	| "Vector3"
	| "Array3Nums"
	| "Euler"
	| "EulerParamsArray"
	| "Quaternion"
	| "QuaternionParamsArray"
	| "Matrix4"
	| "Matrix4ParamsArray"
	| "Color"

import type { default as AmbientLight } from "../components/AmbientLight.svelte"
import type { default as Canvas } from "../components/Canvas.svelte"
import type { default as CubeCamera } from "../components/CubeCamera.svelte"
import type { default as DirectionalLight } from "../components/DirectionalLight.svelte"
import type { default as Group } from "../components/Group.svelte"
import type { default as HemisphereLight } from "../components/HemisphereLight.svelte"
import type { default as LoadedGLTF } from "../components/LoadedGLTF.svelte"
import type { default as Mesh } from "../components/Mesh.svelte"
import type { default as Object3D } from "../components/Object3D.svelte"
import type { default as OrbitControls } from "../components/OrbitControls.svelte"
import type { default as OrthographicCamera } from "../components/OrthographicCamera.svelte"
import type { default as PerspectiveCamera } from "../components/PerspectiveCamera.svelte"
import type { default as PointLight } from "../components/PointLight.svelte"
import type { default as Points } from "../components/Points.svelte"
import type { default as RectAreaLight } from "../components/RectAreaLight.svelte"
import type { default as Scene } from "../components/Scene.svelte"
import type { default as SpotLight } from "../components/SpotLight.svelte"
import type { default as WebGLRenderer } from "../components/WebGLRenderer.svelte"

import type { PropMat } from "./types-comp-props.js"

export type AnySvelthreeComponent =
	| AmbientLight
	| Canvas
	| CubeCamera
	| DirectionalLight
	| Group
	| HemisphereLight
	| LoadedGLTF
	| Mesh<MeshAssignableMaterial>
	| Object3D
	| OrbitControls
	| OrthographicCamera
	| PerspectiveCamera
	| PointLight
	| Points<PointsAssignableMaterial>
	| RectAreaLight
	| Scene
	| SpotLight
	| WebGLRenderer

export type SvelthreeComponentShadowDOMRoot = Canvas

export type SvelthreeComponentShadowDOMChild =
	| AmbientLight
	//| Canvas
	| CubeCamera
	| DirectionalLight
	| Group
	| HemisphereLight
	| LoadedGLTF
	| Mesh<MeshAssignableMaterial>
	| Object3D
	//| OrbitControls
	| OrthographicCamera
	| PerspectiveCamera
	| PointLight
	| Points<PointsAssignableMaterial>
	| RectAreaLight
	| Scene
	| SpotLight
//| WebGLRenderer

export type TargetableSvelthreeComponent =
	| Scene
	| Object3D
	| Group
	| Mesh<MeshAssignableMaterial>
	| Points<PointsAssignableMaterial>
	| PointLight
	| SpotLight
	| DirectionalLight
	| OrthographicCamera
	| PerspectiveCamera
	| LoadedGLTF

export type Targetable = THREE.Object3D | TargetableSvelthreeComponent | undefined

export type AnyTHREEMeshMaterial = THREE.MeshToonMaterial &
	THREE.MeshBasicMaterial &
	THREE.MeshDepthMaterial &
	THREE.Material &
	THREE.MeshPhongMaterial &
	THREE.MeshMatcapMaterial &
	THREE.MeshNormalMaterial &
	THREE.MeshLambertMaterial &
	THREE.MeshStandardMaterial &
	THREE.MeshDistanceMaterial &
	THREE.MeshPhysicalMaterial

type AnyTHREEMeshMaterialProperties = get_props<AnyTHREEMeshMaterial>
export type PropsAnyTHREEMeshMaterial = { [P in keyof AnyTHREEMeshMaterialProperties]: AnyTHREEMeshMaterialProperties[P] }

type AnyTHREELight = THREE.SpotLight & THREE.PointLight & THREE.AmbientLight & THREE.RectAreaLight & THREE.HemisphereLight & THREE.DirectionalLight

type AnyTHREELightProperties = get_props<AnyTHREELight>
export type PropsAnyTHREELight = { [P in keyof AnyTHREELightProperties]: AnyTHREELightProperties[P] }

import type { GLTF as THREE_GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import type { default as GLTF_afterLoaded } from "../utils/GLTF_afterLoaded.js"

type GLTF_afterLoaded_Method = Exclude<keyof typeof GLTF_afterLoaded, "prototype">
type GLTF_afterLoaded_Task = typeof GLTF_afterLoaded[GLTF_afterLoaded_Method]
/*eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }]*/
export type GLTFAfterLoadedTask = GLTF_afterLoaded_Task | ((content_gltf: THREE_GLTF, ...args: any[]) => unknown)

export type RaycastableSvelthreeComponents = Mesh<MeshAssignableMaterial> | Group | Object3D
export type GLTFSupportedSvelthreeComponents = Mesh<MeshAssignableMaterial> | Group | Object3D | Scene

export interface ISvelthreeGLTFTreeMapMember {
	obj: THREE.Object3D
	parent_uuid?: string | null
	name?: string
	obj_type?: string
	mesh?: {
		geometry: THREE.BufferGeometry
		material: THREE.Material | THREE.Material[]
	} | null
	svelthree_comp?: SvelthreeComponentShadowDOMChild
}

export type SvelthreeGLTFTreeMap = Map<string, ISvelthreeGLTFTreeMapMember>

export interface PointerState {
	pos: THREE.Vector2
	event: PointerEvent | undefined
	unprojected: THREE.Vector3
}

interface StoreCanvas {
	dom: HTMLCanvasElement | undefined
	svelthreeComponent: Canvas
	dim: {
		w: number | undefined
		h: number | undefined
	}
	interactive: boolean
}

// $svelthreeStores body

import type { SvelthreeStoreArray } from "../utils/SvelthreeStoreArray.js"

export type StoreBody = {
	id: number | undefined
	canvas: StoreCanvas
	scenes: SvelthreeStoreArray

	// IMPORTANT !
	/** `currentSceneIndex` will always be `+1` real index, because index `0` means `false`,
	 * so the change from `undefined` to `0` will not be triggered.
	 */
	currentSceneIndex: number | undefined

	cameras: SvelthreeStoreArray
	cubeCameras: SvelthreeStoreArray
	activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera | undefined
	activeScene: THREE.Scene | undefined
	renderer: THREE.WebGLRenderer | undefined
	rendererComponent: WebGLRenderer | undefined
	raycaster: THREE.Raycaster | undefined
	orbitcontrols: SvelthreeStoreArray
	useBVH: boolean
}

export type WebGLRendererMode = "auto" | "always"

export type SvelthreeShadowDOMElement = HTMLDivElement | HTMLButtonElement | HTMLAnchorElement

import type { PropsWebGLCubeRenderTarget, PropsOrbitControls } from "./types-comp-props.js"
export type SvelthreePropsOwner =
	| THREE.Object3D
	| THREE.Material
	| THREE.Material[]
	| THREE.WebGLRenderer
	| THREE.LightShadow
	| PropsOrbitControls
	| PropsWebGLCubeRenderTarget

// shorthand attribute values / also s

/** (_for internal usage_) Types of **shorthand properties**. */
interface SHTypes {
	aria: Partial<ARIAMixin>
	bg: THREE.Texture | THREE.Color | string | number | [r: number, g: number, b: number] | THREE.Vector3 // Scene
	bg_tex: { url: string; mapping?: THREE.Mapping } // Scene -> TODO  different: type PropBgTex = PropEnvTex
	cam: PerspectiveCamera | OrthographicCamera | THREE.PerspectiveCamera | THREE.OrthographicCamera // OrbitControls
	camera: THREE.PerspectiveCamera | THREE.OrthographicCamera | THREE.CubeCamera
	color: THREE.Color | string | number | [r: number, g: number, b: number] | THREE.Vector3
	env: THREE.Texture
	env_tex: { url: string; mapping?: THREE.Mapping } // Scene -> TODO  different: type PropEnvTex = get_props<THREE.FogBase>
	fog: THREE.FogBase // Scene -> TODO  different: type PropFog = get_props<THREE.FogBase>
	geometry: THREE.BufferGeometry
	groundColor: THREE.Texture | THREE.Color | string | number | [r: number, g: number, b: number] | THREE.Vector3 //HemisphereLight
	lookAt: THREE.Vector3 | Parameters<THREE.Vector3["set"]> | Targetable | null
	material: THREE.Material | THREE.Material[]
	matrix: THREE.Matrix4 | Parameters<THREE.Matrix4["set"]>
	pos: THREE.Vector3 | Parameters<THREE.Vector3["set"]>
	quat: THREE.Quaternion | Parameters<THREE.Quaternion["set"]>
	rot:
		| THREE.Euler
		| Parameters<THREE.Euler["set"]>
		| THREE.Quaternion
		| Parameters<THREE.Quaternion["set"]>
		| THREE.Vector3
		| Parameters<THREE.Vector3["set"]>
	scale: THREE.Vector3 | Parameters<THREE.Vector3["set"]> | number
}

/** (_for internal usage_) generally overriden property-types (_**not** used as **shorthand properties**_). */
interface GTypes {
	up: THREE.Vector3 | Parameters<THREE.Vector3["set"]>
	mapSize: THREE.Vector2 | Parameters<THREE.Vector2["set"]>
}

// for internal usage see SvelthreeProps -> ... -> PropUtils pipeline
export type aria_value = SHTypes["aria"]
export type background_value = SHTypes["bg"]
export type color_value = SHTypes["color"]
export type geometry_value = SHTypes["geometry"]
export type lookAt_value = SHTypes["lookAt"]
export type material_value = SHTypes["material"]
export type matrix_value = SHTypes["matrix"]
export type pos_value = SHTypes["pos"]
export type quat_value = SHTypes["quat"]
export type rot_value = SHTypes["rot"]
export type scale_value = SHTypes["scale"]

// general (not used as shorthand prop)
export type up_value = GTypes["up"]
export type mapsize_value = GTypes["mapSize"]

/** for internal usage see SvelthreeProps -> ... -> PropUtils pipeline */
export type any_propeller_value =
	| background_value
	| color_value
	| lookAt_value
	| matrix_value
	| pos_value
	| rot_value
	| scale_value
	| up_value
	| mapsize_value
	| [number, number, number]

/** for internal usage see SvelthreeProps -> ... -> PropUtils pipeline */
export type any_proputils_value = any_propeller_value

/** (_`svelthree` internal generic interface_)
 *
 * Defines types of all shorthand properties (keys) across all components.
 * Type of `props` requires type parameter `S`.
 */
interface SvelthreeShorthandProperties<S> {
	// get types from internal interface (if S is NOT provided) or from components (if S is provided)
	aria: S extends void ? SHTypes["aria"] : S extends AnySvelthreeComponent ? (S extends { aria: unknown } ? S["aria"] : undefined) : never
	bg: S extends void ? SHTypes["bg"] : S extends AnySvelthreeComponent ? (S extends { bg: unknown } ? S["bg"] : undefined) : never
	bg_tex: S extends void ? SHTypes["bg_tex"] : S extends AnySvelthreeComponent ? (S extends { bg_tex: unknown } ? S["bg_tex"] : undefined) : never
	cam: S extends void ? SHTypes["cam"] : S extends AnySvelthreeComponent ? (S extends { cam: unknown } ? S["cam"] : undefined) : never // OrbitControls only
	camera: S extends void ? SHTypes["camera"] : S extends AnySvelthreeComponent ? (S extends { camera: unknown } ? S["camera"] : undefined) : never
	color: S extends void ? SHTypes["color"] : S extends AnySvelthreeComponent ? (S extends { color: unknown } ? S["color"] : undefined) : never
	env: S extends void ? SHTypes["env"] : S extends AnySvelthreeComponent ? (S extends { env: unknown } ? S["env"] : undefined) : never
	env_tex: S extends void ? SHTypes["env_tex"] : S extends AnySvelthreeComponent ? (S extends { env_tex: unknown } ? S["env_tex"] : undefined) : never
	fog: S extends void ? SHTypes["fog"] : S extends AnySvelthreeComponent ? (S extends { fog: unknown } ? S["fog"] : undefined) : never
	geometry: S extends void ? SHTypes["geometry"] : S extends AnySvelthreeComponent ? (S extends { geometry: unknown } ? S["geometry"] : undefined) : never
	groundColor: S extends void
		? SHTypes["groundColor"]
		: S extends AnySvelthreeComponent
		? S extends { groundColor: unknown }
			? S["groundColor"]
			: undefined
		: never
	lookAt: S extends void ? SHTypes["lookAt"] : S extends AnySvelthreeComponent ? (S extends { lookAt: unknown } ? S["lookAt"] : undefined) : never
	material: S extends void ? SHTypes["material"] : S extends AnySvelthreeComponent ? (S extends { material: unknown } ? S["material"] : undefined) : never
	matrix: S extends void ? SHTypes["matrix"] : S extends AnySvelthreeComponent ? (S extends { matrix: unknown } ? S["matrix"] : undefined) : never
	pos: S extends void ? SHTypes["pos"] : S extends AnySvelthreeComponent ? (S extends { pos: unknown } ? S["pos"] : undefined) : never
	quat: S extends void ? SHTypes["quat"] : S extends AnySvelthreeComponent ? (S extends { quat: unknown } ? S["quat"] : undefined) : never
	rot: S extends void ? SHTypes["rot"] : S extends AnySvelthreeComponent ? (S extends { rot: unknown } ? S["rot"] : undefined) : never
	scale: S extends void ? SHTypes["scale"] : S extends AnySvelthreeComponent ? (S extends { scale: unknown } ? S["scale"] : undefined) : never

	// get types from components only (S needs to be provided)
	config: S extends AnySvelthreeComponent ? (S extends { config: unknown } ? S["config"] : undefined) : never
	params: S extends AnySvelthreeComponent ? (S extends { params: unknown } ? S["params"] : undefined) : never
	props: S extends AnySvelthreeComponent ? (S extends { props: unknown } ? S["props"] : undefined) : never

	// mat (special)
	mat: S extends MeshAssignableMaterial | PointsAssignableMaterial ? PropMat<S> : never
}

export type prop<K extends keyof SvelthreeShorthandProperties<void>, S = void> = SvelthreeShorthandProperties<S>[K]

export type SvelthreeInteractableComponent = Mesh<MeshAssignableMaterial> | Points<PointsAssignableMaterial> | Scene | LoadedGLTF

export type WebGLRendererEventDetail = {
	frame: number
} | null

export type WebGLRendererComponentEventDispatcher = {
	[key: string]: WebGLRendererEventDetail
}

type CanvasEventDetail = {
	event: PointerEvent | KeyboardEvent | FocusEvent
}

export type CanvasComponentEventDispatcher = {
	[key: string]: CanvasEventDetail
}

export type CanvasComponentEvent = {
	type: string
	detail: CanvasEventDetail
}

export type AllIntersectionsResult = ReturnType<THREE.Raycaster["intersectObjects"]>

export type AllIntersections = {
	result: AllIntersectionsResult
}

export type RaycasterData = {
	/** `intersections` are of the same form as those returned by [`.intersectObject`](https://threejs.org/docs/#api/en/core/Raycaster.intersectObject). */
	intersection: { [P in keyof THREE.Intersection]: THREE.Intersection[P] }
	/** Current `Raycaster` `.ray`, e.g. useful properties: `ray.origin: Vector3` | `ray.direction: Vector3`. */
	ray: THREE.Ray
	/** The `Camera` used for raycasting. */
	camera: THREE.Camera
	/** Current pointer position ( _'point' / Vector3 position_ ) in 3d world space. */
	unprojected_point: THREE.Vector3
}

interface InteractionEventDetail {
	obj: THREE.Object3D | undefined | null
	comp: SvelthreeInteractableComponent
}

export interface SvelthreePointerEventDetail extends InteractionEventDetail {
	evt: PointerEvent
	/** ☝️ Contains no `raycaster_data` for the `pointermove` Event */
	raycaster_data?: RaycasterData
}

export interface SvelthreeKeyboardEventDetail extends InteractionEventDetail {
	code: KeyboardEvent["code"]
	evt: KeyboardEvent
}

export interface SvelthreeFocusEventDetail extends InteractionEventDetail {
	evt: FocusEvent
}

export interface SvelthreeWheelEventDetail {
	evt: WheelEvent
	obj: THREE.Object3D | undefined | null
	comp: SvelthreeInteractableComponent
}

export type SvelthreeInteractionEventDetail = SvelthreePointerEventDetail | SvelthreeKeyboardEventDetail | SvelthreeFocusEventDetail | SvelthreeWheelEventDetail

export type SvelthreeInteractionEvent<D> = {
	type: string
	detail: D
}

import type { createEventDispatcher } from "svelte/internal"

type EventMapPointEvents = {
	[key in ElementType<typeof POINTER_EVENTS>]: SvelthreePointerEvent
}

type EventMapPointEventDetails = {
	[key in ElementType<typeof POINTER_EVENTS>]: SvelthreePointerEventDetail
}

type EventMapKeyboardEvents = {
	[key in ElementType<typeof KEYBOARD_EVENTS>]: SvelthreeKeyboardEvent
}

type EventMapKeyboardEventDetails = {
	[key in ElementType<typeof KEYBOARD_EVENTS>]: SvelthreeKeyboardEventDetail
}

type EventMapFocusEvents = {
	[key in ElementType<typeof FOCUS_EVENTS>]: SvelthreeFocusEvent
}

type EventMapFocusEventDetails = {
	[key in ElementType<typeof FOCUS_EVENTS>]: SvelthreeFocusEventDetail
}

type EventMapWheelEvents = {
	[key in ElementType<typeof WHEEL_EVENTS>]: SvelthreeWheelEvent
}

type EventMapWheelEventDetails = {
	[key in ElementType<typeof WHEEL_EVENTS>]: SvelthreeWheelEventDetail
}

export type EventMapAllEvents = EventMapPointEvents & EventMapKeyboardEvents & EventMapFocusEvents & EventMapWheelEvents
export type EventMapAllEventDetails = EventMapPointEventDetails & EventMapKeyboardEventDetails & EventMapFocusEventDetails & EventMapWheelEventDetails

export type SvelthreeInteractionEventDispatcher = ReturnType<typeof createEventDispatcher<EventMapAllEventDetails>>

import type { OrbitControls as THREE_OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
export type SvelthreeStoreArrayItem = THREE.Scene | THREE.PerspectiveCamera | THREE.OrthographicCamera | THREE.CubeCamera | THREE_OrbitControls
export type RaycastArrayInput = (THREE.Object3D | RaycastableSvelthreeComponents)[]
export type RaycastArrayOutput = THREE.Object3D[]

import type {
	SUPPORTED_ADD_EVENT_LISTENER_OPTIONS,
	SUPPORTED_MODIFIERS,
	POINTER_EVENTS,
	KEYBOARD_EVENTS,
	KEYBOARD_LISTENER_TARGETS,
	FOCUS_EVENTS,
	WHEEL_EVENTS,
	WHEEL_LISTENER_TARGETS
} from "../constants/Interaction.js"

type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never

export type SupportedAddEventListenerOption = ElementType<typeof SUPPORTED_ADD_EVENT_LISTENER_OPTIONS>

export type SvelthreeSupportedModifier = ElementType<typeof SUPPORTED_MODIFIERS>

export type SvelthreeSupportedPointerEvent = ElementType<typeof POINTER_EVENTS>

export type SvelthreeSupportedKeyboardEvent = ElementType<typeof KEYBOARD_EVENTS>

export type SvelthreeKeyboardListenerTarget = ElementType<typeof KEYBOARD_LISTENER_TARGETS>

export type SvelthreeSupportedFocusEvent = ElementType<typeof FOCUS_EVENTS>

export type SvelthreeSupportedWheelEvent = ElementType<typeof WHEEL_EVENTS>

export type SvelthreeWheelListenerTarget = ElementType<typeof WHEEL_LISTENER_TARGETS>

export type SvelthreeSupportedInteractionEvent =
	| SvelthreeSupportedPointerEvent
	| SvelthreeSupportedFocusEvent
	| SvelthreeSupportedKeyboardEvent
	| SvelthreeSupportedWheelEvent // TODO  -> implement

//"touchstart", ->  RECONSIDER  implement?
//"touchmove",  ->  RECONSIDER  implement?
//"touchend",   ->  RECONSIDER  implement?
//"touchcancel" ->  RECONSIDER  implement?

type GetEventHandler<E, M> = [handler: (e: E) => void, modifiers?: Array<M>] | ((e: E) => void)

export type SvelthreePointerEvent = SvelthreeInteractionEvent<SvelthreePointerEventDetail>
export type SvelthreePointerEventModifier = SvelthreeSupportedModifier

/** Event handler can be a function `(e) => {...}` or an array containing a function + an array of modifiers, e.g. `[(e) => {...}, ["preventDefault"]]`. */
export type SvelthreePointerEventHandler = GetEventHandler<SvelthreePointerEvent, SvelthreePointerEventModifier>

export type SvelthreeFocusEvent = SvelthreeInteractionEvent<SvelthreeFocusEventDetail>
export type SvelthreeFocusEventModifier = SvelthreeSupportedModifier

/** Event handler can be a function `(e) => {...}` or an array containing a function + an array of modifiers, e.g. `[(e) => {...}, ["preventDefault"]]`. */
export type SvelthreeFocusEventHandler = GetEventHandler<SvelthreeFocusEvent, SvelthreeFocusEventModifier>

export type SvelthreeKeyboardEvent = SvelthreeInteractionEvent<SvelthreeKeyboardEventDetail>
export type SvelthreeKeyboardEventModifier = SvelthreeSupportedModifier | SvelthreeKeyboardListenerTarget

/** Event handler can be a function `(e) => {...}` or an array containing a function + an array of modifiers, e.g. `[(e) => {...}, ["preventDefault"]]`. */
export type SvelthreeKeyboardEventHandler = GetEventHandler<SvelthreeKeyboardEvent, SvelthreeKeyboardEventModifier>

export type SvelthreeWheelEvent = SvelthreeInteractionEvent<SvelthreeWheelEventDetail>
export type SvelthreeWheelEventModifier = SvelthreeSupportedModifier | SvelthreeWheelListenerTarget

/** Event handler can be a function `(e) => {...}` or an array containing a function + an array of modifiers, e.g. `[(e) => {...}, ["preventDefault"]]`. */
export type SvelthreeWheelEventHandler = GetEventHandler<SvelthreeWheelEvent, SvelthreeWheelEventModifier>

export type SvelthreeModifiersProp =
	| { all?: SvelthreeSupportedModifier[] }
	| { [event_name in SvelthreeSupportedPointerEvent]?: Array<SvelthreeSupportedModifier> }
	| { [event_name in SvelthreeSupportedFocusEvent]?: Array<SvelthreeSupportedModifier> }
	| { [event_name in SvelthreeSupportedKeyboardEvent]?: Array<SvelthreeKeyboardEventModifier> }
	| { [event_name in SvelthreeSupportedWheelEvent]?: Array<SvelthreeWheelEventModifier> }

export type SvelthreePropActionHandler = SvelthreePointerEventHandler | SvelthreeFocusEventHandler | SvelthreeKeyboardEventHandler | SvelthreeWheelEventHandler
/** An explicitly **asynchoronous** callback-function
 * ```ts
 * (comp: T) => Promise<unknown>
 * ```
 * (_the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_)
 * which can be used as a value for `svelthree`-component's additional lifecycle-callback-attributes:
 * - `onMountReplace`
 * - `onDestroyReplace`
 * - `onDestroyStart` (_if available_)
 * - `onDestroyEnd` (_if available_)
 * - `beforeUpdateReplace`
 * - `afterUpdateReplace`
 * - `afterUpdateStart` (_if available_)
 * - `afterUpdateEnd` (_if available_)
 *
 */
export type SvelthreeLifecycleCallbackAsync<T = AnySvelthreeComponent> = (comp: T) => Promise<unknown>

/** An explicitly **synchronous** callback-function
 * ```ts
 * (comp: T) => unknown
 * ```
 * (_the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_)
 * which can be used as a value for `svelthree`-component's additional lifecycle-callback-attributes:
 * - `onMountReplace`
 * - `onDestroyReplace`
 * - `onDestroyStart` (_if available_)
 * - `onDestroyEnd` (_if available_)
 * - `beforeUpdateReplace`
 * - `afterUpdateReplace`
 * - `afterUpdateStart` (_if available_)
 * - `afterUpdateEnd` (_if available_)
 *
 */
export type SvelthreeLifecycleCallbackSync<T = AnySvelthreeComponent> = (comp: T) => unknown

/** A **synchoronous** or **asynchoronous** callback-function
 * ```ts
 * (comp: T) => unknown | Promise<unknown>
 * ```
 * (_the **callback's argument** (`comp`) will be the actual **`svelthree`-component's instance reference**_)
 * which can be used as a value for `svelthree`-component's additional lifecycle-callback-attributes:
 * - `onMountReplace`
 * - `onDestroyReplace`
 * - `onDestroyStart` (_if available_)
 * - `onDestroyEnd` (_if available_)
 * - `beforeUpdateReplace`
 * - `afterUpdateReplace`
 * - `afterUpdateStart` (_if available_)
 * - `afterUpdateEnd` (_if available_)
 *
 */
export type SvelthreeLifecycleCallback<T = AnySvelthreeComponent> = SvelthreeLifecycleCallbackSync<T> | SvelthreeLifecycleCallbackAsync<T>
