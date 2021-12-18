export type Constructor<T = object> = {
	new (...args: any[]): T
	prototype: T
}

export type Array3 = [number, number, number]
export type Array4 = [number, number, number, string]

export type Params<T> = T extends new (...params: any) => any ? ConstructorParameters<T> : T

// see https://stackoverflow.com/questions/49579094/typescript-conditional-types-filter-out-readonly-properties-pick-only-requir
export type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B

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

// Animation

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
