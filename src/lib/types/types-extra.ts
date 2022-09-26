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

export type MeshAssignableMaterial = THREE.Material | THREE.Material[]
export type PointsAssignableMaterial = THREE.Material | THREE.Material[] | THREE.PointsMaterial

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
export type SvelthreeAnimationFunction = (foo?: THREE.Object3D, ...args: any[]) => SvelthreeAnimation

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

export type ComplexValueType =
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

import type { PropMat } from "./types-comp-props"

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

type AllMeshMaterials = THREE.MeshToonMaterial &
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

export type AnyMeshMaterialProps = OnlyWritableNonFunctionProps<Omit<AllMeshMaterials, PropBlackList>>

type AllLights = THREE.SpotLight & THREE.PointLight & THREE.AmbientLight & THREE.RectAreaLight & THREE.HemisphereLight & THREE.DirectionalLight

export type AnyLightProps = OnlyWritableNonFunctionProps<Omit<AllLights, PropBlackList>>

export type RaycastableSvelthreeComponents = Mesh<MeshAssignableMaterial> | Group | Object3D
export type GLTFSupportedSvelthreeComponents = Mesh<MeshAssignableMaterial> | Group | Object3D | Scene

/*
export type RaycastableSvelthreeComponents = Mesh | Group | Object3D
export type GLTFSupportedSvelthreeComponents = Mesh | Group | Object3D | Scene
*/

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
	event: PointerEvent
	unprojected: THREE.Vector3
}

export interface StoreCanvas {
	dom: HTMLCanvasElement
	svelthreeComponent: Canvas
	dim: {
		w: number
		h: number
	}
	interactive: boolean
}

// $svelthreeStores body

import type { SvelthreeStoreArray } from "../utils/SvelthreeStoreArray"

export type StoreBody = {
	id: number
	canvas: StoreCanvas
	scenes: SvelthreeStoreArray

	// IMPORTANT !
	/** `currentSceneIndex` will always be `+1` real index, because index `0` means `false`,
	 * so the change from `undefined` to `0` will not be triggered.
	 */
	currentSceneIndex: number

	cameras: SvelthreeStoreArray
	cubeCameras: SvelthreeStoreArray
	activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera
	activeScene: THREE.Scene
	renderer: THREE.WebGLRenderer
	rendererComponent: WebGLRenderer
	raycaster: THREE.Raycaster
	orbitcontrols: SvelthreeStoreArray
	useBVH: boolean
}

export type WebGLRendererMode = "auto" | "always"

export type SvelthreeShadowDOMElement = HTMLDivElement | HTMLButtonElement | HTMLAnchorElement

import type { PropsWebGLCubeRenderTarget, PropsOrbitControls } from "./types-comp-props"
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
	background: THREE.Texture | THREE.Color | string | number | [r: number, g: number, b: number] | THREE.Vector3
	cam: PerspectiveCamera | OrthographicCamera | THREE.PerspectiveCamera | THREE.OrthographicCamera // OrbitControls
	camera: THREE.PerspectiveCamera | THREE.OrthographicCamera | THREE.CubeCamera
	color: THREE.Color | string | number | [r: number, g: number, b: number] | THREE.Vector3
	geometry: THREE.BufferGeometry
	lookAt: THREE.Vector3 | Parameters<THREE.Vector3["set"]> | Targetable
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
}

// for internal usage see SvelthreeProps -> ... -> PropUtils pipeline
export type aria_value = SHTypes["aria"]
export type background_value = SHTypes["background"]
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
	cam: S extends void ? SHTypes["cam"] : S extends AnySvelthreeComponent ? (S extends { cam: unknown } ? S["cam"] : undefined) : never // OrbitControls only
	camera: S extends void ? SHTypes["camera"] : S extends AnySvelthreeComponent ? (S extends { camera: unknown } ? S["camera"] : undefined) : never
	color: S extends void ? SHTypes["color"] : S extends AnySvelthreeComponent ? (S extends { color: unknown } ? S["color"] : undefined) : never
	geometry: S extends void ? SHTypes["geometry"] : S extends AnySvelthreeComponent ? (S extends { geometry: unknown } ? S["geometry"] : undefined) : never
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
