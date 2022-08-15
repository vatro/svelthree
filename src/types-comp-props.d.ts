import type {
	OnlyWritableNonFunctionProps,
	OnlyWritableNonFunctionPropsPlus,
	OnlyWritableNonFunctionPropsOverwritten,
	PropBlackList
} from "./types-extra"

import type { Object3D, Color, Quaternion, Vector3, Euler, Matrix4 } from "three"
import type { WebGLRenderer } from "three"
import type { Scene, Texture } from "three"
import type { Mesh, Points } from "three"
import type { AmbientLight, DirectionalLight, HemisphereLight, PointLight, RectAreaLight, SpotLight } from "three"
import type { CubeCamera, WebGLCubeRenderTarget, WebGLRenderTargetOptions } from "three"
import type { OrthographicCamera, PerspectiveCamera } from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// TODO  GENERAL check / polish / fix usage of `OnlyWritableNonFunctionPropsPlus` vs. `OnlyWritableNonFunctionPropsOverwritten`
// TODO  At some point we sould type the `userData` interface! -> see https://github.com/vatro/svelthree/issues/95

// --- EMPTY ---

//export type Object3DProps = OnlyWritableNonFunctionPropsPlus<
export type Object3DProps = OnlyWritableNonFunctionPropsOverwritten<
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
//const obj3d_props: Object3DProps = {}

export type GroupProps = Object3DProps
export type LoadedGLTFProps = Object3DProps

// -- SCENE --

export type SceneProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<Scene, PropBlackList>,
	{
		background?: Texture | Color | string | number | [r: number, g: number, b: number] | number[] | Vector3
	} & { [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const scene_props: SceneProps = {}

// TODO  check / polish
export type WebGLRendererProps = OnlyWritableNonFunctionProps<Omit<WebGLRenderer, PropBlackList>>

// --- MESH ---

export type MeshProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<Mesh, PropBlackList>,
	{ [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const mesh_props: MeshProps = {}

// --- POINTS ---

export type PointsProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<Points, PropBlackList>,
	{ [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const points_props: PointsProps = {}

// --- CAMERAS ---

export type CubeCameraProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<CubeCamera, PropBlackList>,
	{ [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const cubecam_props: CubeCameraProps = {}

export type WebGLCubeRenderTargetProps = OnlyWritableNonFunctionProps<Omit<WebGLCubeRenderTarget, PropBlackList>>

// intellisense test
//const cubecam_rendertarget_props: WebGLCubeRenderTargetProps = {}

export type OrthographicCameraProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<OrthographicCamera, PropBlackList>,
	{ [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const orthocam_props: OrthographicCameraProps = {}

export type PerspectiveCameraProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<PerspectiveCamera, PropBlackList>,
	{
		lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
	} & { [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const perspcam_props: PerspectiveCameraProps = {}

// --- LIGHTS ---

export type HemisphereLightProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<HemisphereLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
		groundColor: Color | string | number | [r: number, g: number, b: number] | Vector3
	} & { [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const hemisphere_light_props: HemisphereLightProps = {}

export type AmbientLightProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<AmbientLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
	} & { [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const ambient_light_props: AmbientLightProps = {}

// EXCLUDED  THREE :Lights with `target` property use the target for rotation calculation!
type LightWithTargetObject3DProps = Omit<Object3DProps, "rotation" | "quaternion">

// TODO  Nail down manipulating matrix.
export type DirectionalLightProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<DirectionalLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
		// CUSTOM  actually no `lookAt` on DirectionalLight, we're using custom solution!
		lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
	} & { [P in keyof LightWithTargetObject3DProps]: LightWithTargetObject3DProps[P] }
>

// intellisense test
//const directional_light_props: DirectionalLightProps = {}

export type PointLightProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<PointLight, PropBlackList>,
	{ [P in keyof Object3DProps]: Object3DProps[P] }
>

// intellisense test
//const point_light_props: PointLightProps = {}

// TODO  Nail down manipulating matrix.
// TODO  Nail down lookAt usage!
export type RectAreaLightProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<RectAreaLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
		// CUSTOM  actually no `lookAt` on RectAreaLight, we're using custom solution!
		lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
	} & { [P in keyof LightWithTargetObject3DProps]: LightWithTargetObject3DProps[P] }
>

// intellisense test
//const rectarea_light_props: RectAreaLightProps = {}

// TODO  Nail down manipulating matrix.
export type SpotLightProps = OnlyWritableNonFunctionPropsOverwritten<
	Omit<SpotLight, PropBlackList>,
	{
		color: Color | string | number | [r: number, g: number, b: number] | Vector3
		// CUSTOM  actually no `lookAt` on SpotLight, we're using custom solution!
		lookAt: Vector3 | Parameters<Vector3["set"]> | Object3D
	} & { [P in keyof LightWithTargetObject3DProps]: LightWithTargetObject3DProps[P] }
>

// intellisense test
//const spot_light_props: SpotLightProps = {}

// TODO  extensively test `OrbitControls` `props` atrribute usage.
export type OrbitControlsProps = OnlyWritableNonFunctionProps<Omit<OrbitControls, PropBlackList>>

// intellisense test
//const orbitcontrols_props: OrbitControlsProps = {}

export type ButtonProp = {
	[P in keyof OnlyWritableNonFunctionProps<HTMLButtonElement>]: OnlyWritableNonFunctionProps<HTMLButtonElement>[P]
}

// intellisense test
//const button_prop: ButtonProp = {}

export type LinkProp = {
	[P in keyof OnlyWritableNonFunctionProps<HTMLAnchorElement>]: OnlyWritableNonFunctionProps<HTMLAnchorElement>[P]
}

// intellisense test
const link_prop: ButtonProp = {}
