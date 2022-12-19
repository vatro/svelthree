import type {
	MeshAssignableMaterial,
	PointsAssignableMaterial,
	get_props_overwritten,
	get_props,
	lookAt_value,
	color_value,
	background_value,
	pos_value,
	scale_value,
	rot_value,
	quat_value,
	matrix_value,
	up_value,
	mapsize_value
} from "./types-extra.js"

import type {
	Object3D,
	Mesh,
	Points,
	WebGLRenderer,
	Scene,
	AmbientLight,
	DirectionalLight,
	HemisphereLight,
	PointLight,
	RectAreaLight,
	SpotLight,
	OrthographicCamera,
	PerspectiveCamera,
	CubeCamera,
	WebGLCubeRenderTarget,
	WebGLRenderTargetOptions
} from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// TODO  At some point we sould type the `userData` interface! -> see https://github.com/vatro/svelthree/issues/95

type MeshLikeOnlyKeys = "customDepthMaterial" | "customDistanceMaterial"

// --- Object3D ---

type WritableObject3DProperties = get_props_overwritten<
	Object3D,
	{
		position: pos_value
		scale: scale_value
		rotation: rot_value
		quaternion: quat_value
		matrix: matrix_value
		up: up_value
	}
>

export type PropsObject3D = { [P in keyof WritableObject3DProperties]: WritableObject3DProperties[P] }

// intellisense test
//const obj3d_props: PropsObject3D = {}

export type PropsGroup = PropsObject3D
export type PropsLoadedGLTF = PropsObject3D

// -- SCENE --

type WritableSceneProperties = get_props_overwritten<
	Scene,
	{
		background?: background_value
	} & { [P in keyof PropsObject3D]: PropsObject3D[P] }
>
export type PropsScene = { [P in keyof WritableSceneProperties]: WritableSceneProperties[P] }

// intellisense test
//const scene_props: PropsScene = {}

// TODO  check / polish
type WritableWebGLRendererProperties = get_props<WebGLRenderer>
export type PropsWebGLRenderer = { [P in keyof WritableWebGLRendererProperties]: WritableWebGLRendererProperties[P] }

// intellisense test
//const weggl_renderer_props: PropsWebGLRenderer = {}

// --- MESH ---

type WritableMeshProperties = get_props_overwritten<Mesh, { [P in keyof PropsObject3D]: PropsObject3D[P] }>
export type PropsMesh = { [P in keyof WritableMeshProperties]: WritableMeshProperties[P] }

// intellisense test
//const mesh_props: PropsMesh = {}

// --- POINTS ---

type WritablePointsProperties = get_props_overwritten<Points, { [P in keyof PropsObject3D]: PropsObject3D[P] }>
export type PropsPoints = { [P in keyof WritablePointsProperties]: WritablePointsProperties[P] }

// intellisense test
//const points_props: PropsPoints = {}

// --- CAMERAS ---

type WritableCubeCameraProperties = get_props_overwritten<CubeCamera, { [P in keyof PropsObject3D]: PropsObject3D[P] }>
export type PropsCubeCamera = { [P in keyof WritableCubeCameraProperties]: WritableCubeCameraProperties[P] }

// intellisense test
//const cubecam_props: PropsCubeCamera = {}

type WritableWebGLCubeRenderTargetProperties = get_props<WebGLCubeRenderTarget>
export type PropsWebGLCubeRenderTarget = {
	[P in keyof WritableWebGLCubeRenderTargetProperties]: WritableWebGLCubeRenderTargetProperties[P]
}

// intellisense test
//const cubecam_rendertarget_props: PropsWebGLCubeRenderTarget = {}

type WritableOrthographicCameraProperties = get_props_overwritten<OrthographicCamera, { [P in keyof PropsObject3D]: PropsObject3D[P] }>
export type PropsOrthographicCamera = {
	[P in keyof WritableOrthographicCameraProperties]: WritableOrthographicCameraProperties[P]
}

// intellisense test
//const orthocam_props: PropsOrthographicCamera = {}

type WritablePerspectiveCameraProperties = get_props_overwritten<
	PerspectiveCamera,
	{
		lookAt: lookAt_value
	} & { [P in keyof PropsObject3D]: PropsObject3D[P] }
>
export type PropsPerspectiveCamera = {
	[P in keyof WritablePerspectiveCameraProperties]: WritablePerspectiveCameraProperties[P]
}

// intellisense test
//const perspcam_props: PropsPerspectiveCamera = {}

// --- LIGHTS ---

type ObsoleteLightHasNoShadowKeys = MeshLikeOnlyKeys | "castShadow" | "receiveShadow" | "shadow"
type ObsoleteLightHasShadowKeys = MeshLikeOnlyKeys | "receiveShadow"
// EXCLUDED  THREE :Lights with `target` property use the target for rotation calculation!
type ObsoleteLightHasShadowAndTargetKeys = ObsoleteLightHasShadowKeys | "rotation" | "quaternion"

type WritableHemisphereLightProperties = get_props_overwritten<
	HemisphereLight,
	{
		color: color_value
		groundColor: color_value
	} & { [P in keyof PropsObject3D]: PropsObject3D[P] }
>
type PropsHemisphereLightClean = Omit<WritableHemisphereLightProperties, ObsoleteLightHasNoShadowKeys>
export type PropsHemisphereLight = { [P in keyof PropsHemisphereLightClean]: PropsHemisphereLightClean[P] }

// intellisense test
//const hemisphere_light_props: PropsHemisphereLight = {}

type WritableAmbientLightProperties = get_props_overwritten<
	AmbientLight,
	{
		color: color_value
	} & { [P in keyof PropsObject3D]: PropsObject3D[P] }
>
type PropsAmbientLightClean = Omit<WritableAmbientLightProperties, ObsoleteLightHasNoShadowKeys>
export type PropsAmbientLight = { [P in keyof PropsAmbientLightClean]: PropsAmbientLightClean[P] }

// intellisense test
//const ambient_light_props: PropsAmbientLight = {}

// TODO  Nail down manipulating matrix.
type WritableDirectionalLightProperties = get_props_overwritten<
	DirectionalLight,
	{
		color: color_value
		/** CUSTOM  there's actually no `lookAt` property on THREE.DirectionalLight, `svelthree` is using a custom solution! */
		lookAt: lookAt_value
	} & { [P in keyof PropsObject3D]: PropsObject3D[P] }
>
type PropsDirectionalLightClean = Omit<WritableDirectionalLightProperties, ObsoleteLightHasShadowAndTargetKeys>
export type PropsDirectionalLight = { [P in keyof PropsDirectionalLightClean]: PropsDirectionalLightClean[P] }

// intellisense test
//const directional_light_props: PropsDirectionalLight = {}

type WritablePointLightProperties = get_props_overwritten<
	PointLight,
	{
		color: color_value
	} & { [P in keyof PropsObject3D]: PropsObject3D[P] }
>
type PropsPointLightClean = Omit<WritablePointLightProperties, ObsoleteLightHasShadowKeys>
export type PropsPointLight = { [P in keyof PropsPointLightClean]: PropsPointLightClean[P] }

// intellisense test
//const point_light_props: PropsPointLight = {}

// TODO  Nail down manipulating matrix.
// TODO  Nail down lookAt usage!
type WritableRectAreaLightProperties = get_props_overwritten<
	RectAreaLight,
	{
		color: color_value
		/** CUSTOM  there's actually no `lookAt` property on THREE.RectAreaLight, `svelthree` isexport let props using a custom solution! */
		lookAt: lookAt_value
	} & { [P in keyof PropsObject3D]: PropsObject3D[P] }
>
/**
 * Important Notes:
 * - There is no shadow support.
 * - Only `MeshStandardMaterial` and `MeshPhysicalMaterial` are supported.
 */
type PropsRectAreaLightClean = Omit<WritableRectAreaLightProperties, ObsoleteLightHasNoShadowKeys>
export type PropsRectAreaLight = { [P in keyof PropsRectAreaLightClean]: PropsRectAreaLightClean[P] }

// intellisense test
//const rectarea_light_props: PropsRectAreaLight = {}

// TODO  Nail down manipulating matrix.
type WritableSpotLightProperties = get_props_overwritten<
	SpotLight,
	{
		color: color_value
		/** CUSTOM  there's actually no `lookAt` property on THREE.SpotLight, `svelthree` is using a custom solution! */
		lookAt: lookAt_value
	} & { [P in keyof PropsObject3D]: PropsObject3D[P] }
>
type PropsSpotLightClean = Omit<WritableSpotLightProperties, ObsoleteLightHasShadowAndTargetKeys>
export type PropsSpotLight = { [P in keyof PropsSpotLightClean]: PropsSpotLightClean[P] }

// intellisense test
//const spot_light_props: PropsSpotLight = {}

// TODO  extensively test `OrbitControls` `props` atrribute usage.
type WritableOrbitControlsProperties = get_props<OrbitControls>
type OrbitControlsClean = Omit<WritableOrbitControlsProperties, MeshLikeOnlyKeys>
export type PropsOrbitControls = { [P in keyof OrbitControlsClean]: OrbitControlsClean[P] }

// intellisense test
//const orbitcontrols_props: PropsOrbitControls = {}

type WritableMaterialProps<T> = T extends void ? never : get_props_overwritten<T, { color: color_value }>
export type PropMat<T extends MeshAssignableMaterial | PointsAssignableMaterial> = { [P in keyof WritableMaterialProps<T>]: WritableMaterialProps<T>[P] }

type WritableButtonProperties = get_props<HTMLButtonElement>
export type PropButton = { [P in keyof WritableButtonProperties]: WritableButtonProperties[P] }

// intellisense test
//const button_prop: PropButton = {}

type WritableLinkProperties = get_props<HTMLAnchorElement>
export type PropLink = { [P in keyof WritableLinkProperties]: WritableLinkProperties[P] }

// intellisense test
//const link_prop: PropLink = {}

type WritableWebGLRenderTargetOptions = get_props<WebGLRenderTargetOptions>
export type PropWebGLRenderTargetOptions = { [P in keyof WritableWebGLRenderTargetOptions]: WritableWebGLRenderTargetOptions[P] }

// intellisense test
//const webglrendertarget_opt: PropWebGLRenderTargetOptions = {}

type WritableShadowProperties<T> = get_props_overwritten<T, { mapSize: mapsize_value }>
type PropsShadow<T> = { [P in keyof WritableShadowProperties<T>]: WritableShadowProperties<T>[P] }

export type PropsDirectionalLightShadow = PropsShadow<THREE.DirectionalLightShadow>
export type PropsPointLightShadow = PropsShadow<THREE.PointLightShadow>
export type PropsSpotLightShadow = PropsShadow<THREE.SpotLightShadow>

// intellisense test
//const shadow_direct_props: PropsDirectionalLightShadow = {}
//const shadow_point_props: PropsPointLightShadow = {}
//const shadow_spot_props: PropsSpotLightShadow = {}

type PropsSvelthree =
	| PropButton
	| PropLink
	| PropWebGLRenderTargetOptions
	| PropsAmbientLight
	| PropsCubeCamera
	| PropsDirectionalLight
	| PropsDirectionalLightShadow
	| PropsGroup
	| PropsHemisphereLight
	| PropsLoadedGLTF
	| PropsMesh
	| PropsObject3D
	| PropsOrbitControls
	| PropsOrthographicCamera
	| PropsPerspectiveCamera
	| PropsPointLight
	| PropsPointLightShadow
	| PropsPoints
	| PropsRectAreaLight
	| PropsScene
	| PropsSpotLight
	| PropsSpotLightShadow
	| PropsWebGLCubeRenderTarget
	| PropsWebGLRenderer

//export type SvelthreePropsObjectLiteral = PropsSvelthree | PropMat<MeshAssignableMaterial> | PropMat<PointsAssignableMaterial>
export type SvelthreePropsObjectLiteral =
	| Omit<PropsSvelthree, "$T">
	| Omit<PropMat<MeshAssignableMaterial>, "$T">
	| Omit<PropMat<PointsAssignableMaterial>, "$T">
