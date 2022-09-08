import type {
	OnlyWritableNonFunctionProps,
	OnlyWritableNonFunctionPropsOverwritten,
	PropBlackList
} from "./types-extra"

import type { Object3D, Color, Quaternion, Vector3, Euler, Matrix4 } from "three"
import type { WebGLRenderer } from "three"
import type { Scene, Texture } from "three"
import type { Mesh, Points } from "three"
import type { AmbientLight, DirectionalLight, HemisphereLight, PointLight, RectAreaLight, SpotLight } from "three"
import type { CubeCamera, WebGLCubeRenderTarget } from "three"
import type { OrthographicCamera, PerspectiveCamera } from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// TODO  GENERAL check / polish / fix usage of `OnlyWritableNonFunctionPropsPlus` vs. `OnlyWritableNonFunctionPropsOverwritten`
// TODO  At some point we sould type the `userData` interface! -> see https://github.com/vatro/svelthree/issues/95

// --- EMPTY ---

//export type Object3DProperties = OnlyWritableNonFunctionPropsPlus<
export type Object3DProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<Object3D, PropBlackList>,
	{
		position: Vector3 | Parameters<Vector3["set"]>
		scale: Vector3 | Parameters<Vector3["set"]>
		rotation:
			| Euler
			| Parameters<Euler["set"]>
			| Quaternion
			| Parameters<Quaternion["set"]>
			| Vector3
			| Parameters<Vector3["set"]>
		quaternion: Quaternion | Parameters<Quaternion["set"]>
		matrix: Matrix4 | Parameters<Matrix4["set"]>
		up: Vector3 | Parameters<Vector3["set"]>
	}
>

// intellisense test
//const obj3d_props: Object3DProperties = {}

export type GroupProperties = Object3DProperties
export type LoadedGLTFProperties = Object3DProperties

// -- SCENE --

export type SceneProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<Scene, PropBlackList>,
	{
		background?: Texture | Color | string | number | [r: number, g: number, b: number] | number[] | Vector3
	} & { [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const scene_props: SceneProperties = {}

// TODO  check / polish
export type WebGLRendererProperties = OnlyWritableNonFunctionProps<Omit<WebGLRenderer, PropBlackList>>

// --- MESH ---

export type MeshProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<Mesh, PropBlackList>,
	{ [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const mesh_props: MeshProperties = {}

// --- POINTS ---

export type PointsProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<Points, PropBlackList>,
	{ [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const points_props: PointsProperties = {}

// --- CAMERAS ---

export type CubeCameraProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<CubeCamera, PropBlackList>,
	{ [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const cubecam_props: CubeCameraProperties = {}

export type WebGLCubeRenderTargetProperties = OnlyWritableNonFunctionProps<Omit<WebGLCubeRenderTarget, PropBlackList>>

// intellisense test
//const cubecam_rendertarget_props: WebGLCubeRenderTargetProperties = {}

export type OrthographicCameraProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<OrthographicCamera, PropBlackList>,
	{ [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const orthocam_props: OrthographicCameraProperties = {}

export type PerspectiveCameraProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<PerspectiveCamera, PropBlackList>,
	{
		lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
	} & { [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const perspcam_props: PerspectiveCameraProperties = {}

// --- LIGHTS ---

export type HemisphereLightProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<HemisphereLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
		groundColor: Color | string | number | [r: number, g: number, b: number] | Vector3
	} & { [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const hemisphere_light_props: HemisphereLightProperties = {}

export type AmbientLightProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<AmbientLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
	} & { [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const ambient_light_props: AmbientLightProperties = {}

// EXCLUDED  THREE :Lights with `target` property use the target for rotation calculation!
type LightWithTargetObject3DProperties = Omit<Object3DProperties, "rotation" | "quaternion">

// TODO  Nail down manipulating matrix.
export type DirectionalLightProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<DirectionalLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
		// CUSTOM  actually no `lookAt` on DirectionalLight, we're using custom solution!
		lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
	} & { [P in keyof LightWithTargetObject3DProperties]: LightWithTargetObject3DProperties[P] }
>

// intellisense test
//const directional_light_props: DirectionalLightProperties = {}

export type PointLightProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<PointLight, PropBlackList>,
	{ [P in keyof Object3DProperties]: Object3DProperties[P] }
>

// intellisense test
//const point_light_props: PointLightProperties = {}

// TODO  Nail down manipulating matrix.
// TODO  Nail down lookAt usage!
export type RectAreaLightProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<RectAreaLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
		// CUSTOM  actually no `lookAt` on RectAreaLight, we're using custom solution!
		lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
	} & { [P in keyof LightWithTargetObject3DProperties]: LightWithTargetObject3DProperties[P] }
>

// intellisense test
//const rectarea_light_props: RectAreaLightProperties = {}

// TODO  Nail down manipulating matrix.
export type SpotLightProperties = OnlyWritableNonFunctionPropsOverwritten<
	Omit<SpotLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
		// CUSTOM  actually no `lookAt` on SpotLight, we're using custom solution!
		lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
	} & { [P in keyof LightWithTargetObject3DProperties]: LightWithTargetObject3DProperties[P] }
>

// intellisense test
//const spot_light_props: SpotLightProperties = {}

// TODO  extensively test `OrbitControls` `props` atrribute usage.
export type OrbitControlsProperties = OnlyWritableNonFunctionProps<Omit<OrbitControls, PropBlackList>>

// intellisense test
//const orbitcontrols_props: OrbitControlsProperties = {}

export type ButtonProperties = {
	[P in keyof OnlyWritableNonFunctionProps<HTMLButtonElement>]: OnlyWritableNonFunctionProps<HTMLButtonElement>[P]
}

// intellisense test
//const button_prop: ButtonProperties = {}

export type LinkProperties = {
	[P in keyof OnlyWritableNonFunctionProps<HTMLAnchorElement>]: OnlyWritableNonFunctionProps<HTMLAnchorElement>[P]
}

// intellisense test
//const link_prop: ButtonProperties = {}
