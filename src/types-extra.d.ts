export type Constructor<T = object> = {
	new (...args: any[]): T
	prototype: T
}

export type Array3 = [number, number, number]
export type Array4 = [number, number, number, string]

export type Params<T> = T extends new (...params: any) => any ? ConstructorParameters<T> : T

// see https://stackoverflow.com/questions/49579094/typescript-conditional-types-filter-out-readonly-properties-pick-only-requir
export type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
	? A
	: B

export type WritableKeys<T> = {
	[P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P>
}[keyof T]

export type ReadonlyKeys<T> = {
	[P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>
}[keyof T]

// this returns  only NON function keys
export type OnlyNonFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]

// this returns  only function keys
export type OnlyFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T]

// this returns as expected only function props
export type OnlyFunctionProps<T> = Omit<T, OnlyNonFunctionKeys<T>>

// this returns as expected only NON function props
export type OnlyNonFunctionProps<T> = Omit<T, OnlyFunctionKeys<T>>

export type Overwrite<T, U> = Pick<OnlyNonFunctionProps<T>, Exclude<keyof OnlyNonFunctionProps<T>, keyof U>> & U
export type Overwrite2<T, U> = Pick<OnlyNonFunctionProps<T>, Exclude<keyof OnlyNonFunctionProps<T>, keyof U>> & U

export type ExposedProps<T, E extends keyof OnlyNonFunctionProps<T>> = Pick<OnlyNonFunctionProps<T>, E>

export type OnlyExposedPropsOverwritten<T, U extends keyof OnlyNonFunctionProps<T>, V> = Partial<
	Overwrite<ExposedProps<T, U>, V>
>
export type OnlyExposedProps<T, E extends keyof OnlyNonFunctionProps<T>> = Partial<Pick<OnlyNonFunctionProps<T>, E>>

export type OnlyNonFunctionPropsOverwritten<T, U> = Partial<Overwrite<OnlyNonFunctionProps<T>, U>>

export type OnlyWritableNonFunctionKeys<T> = WritableKeys<OnlyNonFunctionProps<T>>
export type OnlyWritableNonFunctionProps<T> = Partial<Pick<T, OnlyWritableNonFunctionKeys<T>>>
export type OnlyWritableNonFunctionPropsPlus<T, U> = Partial<Pick<T, OnlyWritableNonFunctionKeys<T>> & U>
export type OnlyWritableNonFunctionPropsOverwritten<T, U> = Partial<Overwrite<OnlyWritableNonFunctionProps<T>, U>>

export type RemoveFirst<T extends unknown[]> = T extends [infer H, ...infer R] ? R : T
export type RemoveLast<T extends unknown[]> = T extends [...infer H, infer R] ? H : T

// Animation

export interface SvelthreeAnimationFunctionReturn {
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
	[anything: string]: any
}

/**
 * Animation function (closure) which is being processed internally by the component.
 * ```
 * (obj: any, ...args: any[]) => {
 *      onStart: () => void
 *      onDestroy: () => void
 *      onSceneDeactivated?: () => void
 *      onSceneReactivated?: () => void
 *      [anything: string]: any
 * }
 * ```
 * - ☝️ `obj` is basically just a named / declared argument (no initial value).
 * - ☝️ `obj` will be internally replaced by the **real** THREE.Object3D reference (the reference to the object the animation has been applied to).
 *
 * Simple example:
 * ```
 * const ani = (obj) => {
 *      return {
 *          onStart: () => {
 *              obj.position.y = 1
 *          }
 *      }
 * }
 * ```
 *
 */
export interface SvelthreeAnimationFunction {
	(obj: any, ...args: any[]): SvelthreeAnimationFunctionReturn
}

export type LightWithShadow = THREE.DirectionalLight | THREE.SpotLight | THREE.PointLight
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

import type {
	Mesh,
	Object3D,
	Group,
	PointLight,
	SpotLight,
	OrthographicCamera,
	Scene,
	DirectionalLight
} from "./components"

export type TargetableSvelthreeComponent =
	| Mesh<any>
	| Object3D
	| Group
	| PointLight
	| SpotLight
	| OrthographicCamera
	| Scene
	| DirectionalLight

export type Targetable = THREE.Object3D | TargetableSvelthreeComponent
export type CubeCameraBoundable = THREE.Object3D | Mesh<any> | Object3D

import type {
	MeshToonMaterialParameters,
	MeshBasicMaterialParameters,
	MeshDepthMaterialParameters,
	MaterialParameters,
	MeshPhongMaterialParameters,
	MeshMatcapMaterialParameters,
	MeshNormalMaterialParameters,
	MeshLambertMaterialParameters,
	MeshStandardMaterialParameters,
	MeshDistanceMaterialParameters,
	MeshPhysicalMaterialParameters
} from "three"

import type {
	MeshToonMaterial,
	MeshBasicMaterial,
	MeshDepthMaterial,
	Material,
	MeshPhongMaterial,
	MeshMatcapMaterial,
	MeshNormalMaterial,
	MeshLambertMaterial,
	MeshStandardMaterial,
	MeshDistanceMaterial,
	MeshPhysicalMaterial
} from "three"

type AllMeshMaterials = MeshToonMaterial &
	MeshBasicMaterial &
	MeshDepthMaterial &
	Material &
	MeshPhongMaterial &
	MeshMatcapMaterial &
	MeshNormalMaterial &
	MeshLambertMaterial &
	MeshStandardMaterial &
	MeshDistanceMaterial &
	MeshPhysicalMaterial

export type AnyMeshMaterialProps = OnlyWritableNonFunctionProps<Omit<AllMeshMaterials, PropBlackList>>

type AllLights = THREE.SpotLight &
	THREE.PointLight &
	THREE.AmbientLight &
	THREE.RectAreaLight &
	THREE.HemisphereLight &
	THREE.DirectionalLight

export type AnyLightProps = OnlyWritableNonFunctionProps<Omit<AllLights, PropBlackList>>

export type GLTFSupportedSvelthreeComponents = Mesh<any> & Group & Object3D
export type RaycastableSvelthreeComponents = Mesh<any> & Group & Object3D

export interface PointerState {
	pos: THREE.Vector2
	event: PointerEvent
	unprojected: THREE.Vector3
}

export interface StoreCanvas {
	dom: HTMLCanvasElement
	svelthreeComponent: any
	dim: {
		w: number
		h: number
	}
	interactive: boolean
}

// $svelthreeStores body

import type { SvelthreeStoreArray } from "./utils/SvelthreeStoreArray"
import type { WebGLRenderer as WebGLRendererComponent } from "./components"

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
	rendererComponent: WebGLRendererComponent
	raycaster: THREE.Raycaster
	orbitcontrols: SvelthreeStoreArray
	useBVH: boolean
}

export type WebGLRendererMode = "auto" | "always"

export type SvelthreeShadowDOMElement = HTMLDivElement | HTMLButtonElement | HTMLAnchorElement
