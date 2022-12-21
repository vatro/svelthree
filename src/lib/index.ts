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

// generic type utilities
export type { prop } from "./types/types-extra.js"
export type { PropMat } from "./types/types-comp-props.js"

// Material related
export type {
	MeshAssignableMaterial,
	PointsAssignableMaterial,
	MeshMaterialWithColor,
	MeshMaterialWithEnvMap
} from "./types/types-extra.js"

// Interaction related
export type {
	SvelthreeInteractableComponent,
	SvelthreePointerEvent,
	SvelthreePointerEventDetail,
	SvelthreePointerEventHandler,
	SvelthreePointerEventModifier,
	SvelthreeFocusEvent,
	SvelthreeFocusEventDetail,
	SvelthreeFocusEventHandler,
	SvelthreeFocusEventModifier,
	SvelthreeKeyboardEvent,
	SvelthreeKeyboardEventDetail,
	SvelthreeKeyboardEventHandler,
	SvelthreeKeyboardEventModifier,
	SvelthreeWheelEvent,
	SvelthreeWheelEventDetail,
	SvelthreeWheelEventHandler,
	SvelthreeWheelEventModifier,
	SvelthreeModifiersProp,
	SvelthreePropActionHandler
} from "./types/types-extra.js"

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
} from "./types/types-comp-props.js"

// `foo` Object Literal types
export type { PropLink, PropButton, PropWebGLRenderTargetOptions } from "./types/types-comp-props.js"

// TODO  params

// TODO  config

// misc
export type {
	AnySvelthreeComponent,
	Targetable,
	TargetableSvelthreeComponent,
	SvelthreeLifecycleCallback,
	SvelthreeLifecycleCallbackAsync,
	SvelthreeLifecycleCallbackSync
} from "./types/types-extra.js"

// Animation related
export type { SvelthreeAnimationFunction, SvelthreeAnimation } from "./types/types-extra.js"

// GLTF related
export type {
	SvelthreeGLTFTreeMap,
	ISvelthreeGLTFTreeMapMember,
	GLTFSupportedSvelthreeComponents
} from "./types/types-extra.js"
