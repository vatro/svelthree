declare type Array3 = [number, number, number]
declare type Array4 = [number, number, number, string]

/**
 * Shamelessly copied from react-three-fiber three-types.d.ts
 */
//declare type Euler = THREE.Euler | Parameters<THREE.Euler["set"]>
declare type Matrix4 = THREE.Matrix4 | Parameters<THREE.Matrix4["set"]>
declare type Vector2 = THREE.Vector2 | Parameters<THREE.Vector2["set"]>
//declare type Vector3 = THREE.Vector3 | Parameters<THREE.Vector3["set"]>
declare type Color = THREE.Color | number | string
declare type Layers = THREE.Layers | Parameters<THREE.Layers["set"]>
declare type Quaternion = THREE.Quaternion | Parameters<THREE.Quaternion["set"]>

/**
 * Replaced all type aliases with union type signatures in order to have more
 * informative hint on hover over JSX attributes. Otherwise only the name if the type
 * alias would show up, with no further information on which types are included.
 *
 * TODO  would like to avoid using long union types, but I couldn't yet figure out
 * how to use the aliases and still have meaningfull hint on hover over JSX attributes.
 */
// declare type PropColor = THREE.Vector3 | THREE.Color | number | Array3
// declare type PropPos = THREE.Vector3 | Array3
// declare type PropRot = THREE.Euler | Array3 | Array4
// declare type PropScale = THREE.Vector3 | Array3
// declare type PropLookAt = THREE.Vector3 | Array3
// declare type PropMatrix4 = THREE.Matrix4

declare type Params<T> = T extends new (...params: any) => any ? ConstructorParameters<T> : T

declare type NonFunctionKeys<T> = {
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]

declare type MutableOnlyProps<T> = { -readonly [K in keyof T]: T[K] }
declare type ExposedProps<T, E extends keyof T> = Pick<MutableOnlyProps<T>, E>
declare type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U
declare type ExposedPropsOverwritten<T, U extends keyof T, V> = Overwrite<ExposedProps<T, U>, V>
declare type OnlyExposedAndOverwrittenProps<T, U extends keyof T, V> = Partial<ExposedPropsOverwritten<T, U, V>>
declare type OnlyExposedProps<T, E extends keyof T> = Partial<Pick<MutableOnlyProps<T>, E>>
