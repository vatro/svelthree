// export all Svelte components
export { default as PerspectiveCamera } from "./components/PerspectiveCamera.svelte"
export { default as OrthographicCamera } from "./components/OrthographicCamera.svelte"
export { default as Mesh } from "./components/Mesh.svelte"
export { default as Points } from "./components/Points.svelte"
export { default as Object3D } from "./components/Object3D.svelte"
export { default as Group } from "./components/Group.svelte"
export { default as Canvas } from "./components/Canvas.svelte"
export { default as DirectionalLight } from "./components/DirectionalLight.svelte"
export { default as SpotLight } from "./components/SpotLight.svelte"
export { default as RectAreaLight } from "./components/RectAreaLight.svelte"
export { default as AmbientLight } from "./components/AmbientLight.svelte"
export { default as HemisphereLight } from "./components/HemisphereLight.svelte"
export { default as PointLight } from "./components/PointLight.svelte"
export { default as Scene } from "./components/Scene.svelte"
export { default as LoadedGLTF } from "./components/LoadedGLTF.svelte"
export { default as WebGLRenderer } from "./components/WebGLRenderer.svelte"
export { default as OrbitControls } from "./components/OrbitControls.svelte"
export { default as CubeCamera } from "./components/CubeCamera.svelte"

// export all THREE modules
export * from "three"

// TODO  export as `THREE_*`?
/** export all THREE modules 'Foo' overridden by Svelte components as '_Foo'
 * so users can for example import _Mesh from 'svelthree' and create a native THREE Mesh instance
 */
export { Mesh as _Mesh } from "three"
export { Points as _Points } from "three"
export { Object3D as _Object3D } from "three"
export { Group as _Group } from "three"
export { AmbientLight as _AmbientLight } from "three"
export { HemisphereLight as _HemisphereLight } from "three"
export { DirectionalLight as _DirectionalLight } from "three"
export { PointLight as _PointLight } from "three"
export { RectAreaLight as _RectAreaLight } from "three"
export { SpotLight as _SpotLight } from "three"
export { Camera as _Camera } from "three"
export { PerspectiveCamera as _PerspectiveCamera } from "three"
export { OrthographicCamera as _OrthographicCamera } from "three"
export { CubeCamera as _CubeCamera } from "three"
export { Scene as _Scene } from "three"
export { OrbitControls as _OrbitControls } from "three/examples/jsm/controls/OrbitControls"
export { WebGLRenderer as _WebGLRenderer } from "three"

// generic type utilities
export type { prop } from "./types/types-extra"
export type { PropMat } from "./types/types-comp-props"

// `props` Object Literal types
export type {
	PropsObject3D,
	PropsGroup,
	PropsLoadedGLTF,
	PropsScene,
	PropsWebGLRenderer,
	PropsMesh,
	PropsPoints,
	PropsCubeCamera,
	PropsWebGLCubeRenderTarget,
	PropsOrthographicCamera,
	PropsPerspectiveCamera,
	PropsHemisphereLight,
	PropsAmbientLight,
	PropsDirectionalLight,
	PropsPointLight,
	PropsRectAreaLight,
	PropsSpotLight,
	PropsOrbitControls
} from "./types/types-comp-props"

// `foo` Object Literal types
export type { PropLink, PropButton, PropWebGLRenderTargetOptions } from "./types/types-comp-props"

// TODO  params

// TODO  config

// misc
export type { TargetableSvelthreeComponent } from "./types/types-extra"

// GLTF related
export type {
	SvelthreeGLTFTreeMap,
	ISvelthreeGLTFTreeMapMember,
	GLTFSupportedSvelthreeComponents
} from "./types/types-extra"
