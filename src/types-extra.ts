export type Constructor<T = object> = {
	new(...args: any[]): T
	prototype: T
}

export type Array3 = [number, number, number]
export type Array4 = [number, number, number, string]

/**
 * Shamelessly copied from react-three-fiber three-types.d.ts
 */
//export type Euler = THREE.Euler | Parameters<THREE.Euler["set"]>
/*
export type Matrix4 = THREE.Matrix4 | Parameters<THREE.Matrix4["set"]>
export type Vector2 = THREE.Vector2 | Parameters<THREE.Vector2["set"]>
export type Vector3 = THREE.Vector3 | Parameters<THREE.Vector3["set"]>
export type Color = THREE.Color | number | string
export type Layers = THREE.Layers | Parameters<THREE.Layers["set"]>
export type Quaternion = THREE.Quaternion | Parameters<THREE.Quaternion["set"]>
*/

/**
 * Replaced all type aliases with union type signatures in order to have more
 * informative hint on hover over JSX attributes. Otherwise only the name if the type
 * alias would show up, with no further information on which types are included.
 *
 * TODO  would like to avoid using long union types, but I couldn't yet figure out
 * how to use the aliases and still have meaningfull hint on hover over JSX attributes.
 */
// export type PropColor = THREE.Vector3 | THREE.Color | number | Array3
// export type PropPos = THREE.Vector3 | Array3
// export type PropRot = THREE.Euler | Array3 | Array4
// export type PropScale = THREE.Vector3 | Array3
// export type PropLookAt = THREE.Vector3 | Array3
// export type PropMatrix4 = THREE.Matrix4

//import { Face3, Vector2, Vector3 } from "svelthree-three"
/*
/**
 * @see https://threejs.org/docs/#api/en/core/Raycaster.intersectObject
 * distance – distance between the origin of the ray and the intersection
 * point – point of intersection, in world coordinates
 * face – intersected face
 * faceIndex – index of the intersected face
 * object – the intersected object
 * uv - U,V coordinates at point of intersection
 * uv2 - Second set of U,V coordinates at point of intersection
 * instanceId – The index number of the instance where the ray intersects the InstancedMesh
 *
 */

export type RaycasterIntersectObject = {
	distance: number
	point: THREE.Vector3
	face: THREE.Face3
	faceIndex: number
	object: THREE.Object3D
	uv: THREE.Vector2
	uv2: THREE.Vector2
	instanceId: number
}

export type Object3DProps = {
	position?: THREE.Vector3 | Parameters<THREE.Vector3["set"]> | number[]
	up?: THREE.Vector3
	scale?: THREE.Vector3
	rotation?: THREE.Euler | Parameters<THREE.Euler["set"]> | [number, number, number]
	matrix?: THREE.Matrix4
	quaternion?: THREE.Quaternion
	layers?: THREE.Layers
	//dispose?: (() => void) | null;
}


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

// BVH

// deprecated

// WHY?  '-readonly' seems to be obsolete, [K in keyof T]: T[K] already returns only mutable (not readonly) props
//export type OnlyMutableProps<T> = { -readonly[K in keyof T]: T[K] }
//export type ExposedProps<T, E extends keyof T> = Pick<OnlyMutableProps<T>, E>

//export type OnlyExposedAndOverwrittenProps<T, U extends keyof T, V> = Partial<ExposedPropsOverwritten<T, U, V>>

// Animation

/*
export type SvelthreeAnimationFunction = (
	obj: any,
	...args: any[]
) => {
	onStart: () => void
	onDestroy: () => void
	onSceneDeactivated?: () => void
	onSceneReactivated?: () => void
	[anything: string]: any
}
*/

export interface SvelthreeAnimationFunctionReturn {
	onStart: () => void
	onDestroy: () => void
	onSceneDeactivated?: () => void
	onSceneReactivated?: () => void
	[anything: string]: any
}

/**
 * Animation function (closure) which is being processed internally by the component.
 * ```
 * (dummyParam: any, ...args: any[]) => {
 *      onStart: () => void
 *      onDestroy: () => void
 *      onSceneDeactivated?: () => void
 *      onSceneReactivated?: () => void
 *      [anything: string]: any
 * }
 * ```
 * - ☝️ `dummyParam` is basically just a named / declared argument (no initial value).
 * - ☝️ `dummyParam` will be internally replaced by the **real** THREE.Object3D reference (the reference to the object the animation has been applied to).
 *
 * Simple example:
 * ```
 * const ani = (dummyParam) => {
 *      return {
 *          onStart: () => {
 *              dummyParam.position.y = 1
 *          }
 *      }
 * }
 * ```
 *
 */
export interface SvelthreeAnimationFunction {
	(dummyParam: any, ...args: any[]): SvelthreeAnimationFunctionReturn
}

export type LightWithShadow = THREE.DirectionalLight | THREE.SpotLight | THREE.PointLight
export type LightShadowProps<T> = OnlyWritableNonFunctionProps<T>
export type LightShadowCamProps<T> = OnlyWritableNonFunctionProps<T>

/*
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
	*/

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
