import {
    AmbientLight,
    Camera,
    CubeCamera,
    DirectionalLight,
    HemisphereLight,
    Light,
    Mesh,
    OrbitControls,
    OrthographicCamera,
    PerspectiveCamera,
    PointLight,
    RectAreaLight,
    Scene,
    SpotLight,
    WebGLRenderer
} from "svelthree-three"

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _Mesh_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const mesh:THREE.Mesh = _Mesh(...)
 */
export function _Mesh(...params: ConstructorParameters<typeof Mesh>): Mesh {
    return new Mesh(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _Light_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const light:THREE.Light = _Light(...)
 */
export function _Light(...params: ConstructorParameters<typeof Light>): Light {
    return new Light(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _DirectionalLight_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const light:THREE.DirectionalLight = _AmbientLight(...)
 */
export function _AmbientLight(...params: ConstructorParameters<typeof DirectionalLight>): AmbientLight {
    return new AmbientLight(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _HemisphereLight_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const light:THREE.HemisphereLight = _HemisphereLight(...)
 */
export function _HemisphereLight(...params: ConstructorParameters<typeof HemisphereLight>): HemisphereLight {
    return new HemisphereLight(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _DirectionalLight_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const light:THREE.DirectionalLight = _DirectionalLight(...)
 */
export function _DirectionalLight(...params: ConstructorParameters<typeof DirectionalLight>): DirectionalLight {
    return new DirectionalLight(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _PointLight_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const light:THREE.PointLight = _PointLight(...)
 */
export function _PointLight(...params: ConstructorParameters<typeof PointLight>): PointLight {
    return new PointLight(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _RectAreaLight_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const light:THREE.RectAreaLight = _RectAreaLight(...)
 */
export function _RectAreaLight(...params: ConstructorParameters<typeof RectAreaLight>): RectAreaLight {
    return new RectAreaLight(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _SpotLight_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const light:THREE.SpotLight = _SpotLight(...)
 */
export function _SpotLight(...params: ConstructorParameters<typeof SpotLight>): SpotLight {
    return new SpotLight(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _Camera_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const cam:THREE.Camera = _Camera(...)
 */
export function _Camera(...params: ConstructorParameters<typeof Camera>): Camera {
    return new Camera(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new **three.js _PerspectiveCamera_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const cam:THREE.PerspectiveCamera = _PerspectiveCamera(...)
 */
export function _PerspectiveCamera(...params: ConstructorParameters<typeof PerspectiveCamera>): PerspectiveCamera {
    return new PerspectiveCamera(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _OrthographicCamera_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const cam:THREE.OrthographicCamera = _OrthographicCamera(...)
 */
export function _OrthographicCamera(...params: ConstructorParameters<typeof OrthographicCamera>): OrthographicCamera {
    return new OrthographicCamera(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _CubeCamera_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const cam:THREE.CubeCamera = _CubeCamera(...)
 */
export function _CubeCamera(...params: ConstructorParameters<typeof CubeCamera>): CubeCamera {
    return new CubeCamera(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _Scene_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const scene:THREE.Scene = _Scene(...)
 */
export function _Scene(...params: ConstructorParameters<typeof Scene>): Scene {
    return new Scene(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _OrbitControls_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const oc:THREE.OrbitControls = _OrbitControls(...)
 */
export function _OrbitControls(...params: ConstructorParameters<typeof OrbitControls>): OrbitControls {
    return new OrbitControls(...params)
}

/**
 * **svelthree** _Utility Function_
 * Creates and returns a new three.js _WebGLRenderer_ instance (**not** a Svelte componetent).
 * Use namespace THREE for type.
 * @example
 * const renderer:THREE.WebGLRenderer = _WebGLRenderer(...)
 */
export function _WebGLRenderer(...params: ConstructorParameters<typeof WebGLRenderer>): WebGLRenderer {
    return new WebGLRenderer(...params)
}
