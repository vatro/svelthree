import type { OnlyWritableNonFunctionPropsPlus, PropBlackList } from "./types-extra"
import type { Quaternion, Vector3, Euler, Matrix4, Mesh } from "three"
/** For typed objects being set as `props` 'shorthand' attribute values, e.g.:
 * ```
 * const my_init_props: MeshProps = {...}
 * component_ref.props = my_init_props
 * ```
 * */
export type MeshProps = OnlyWritableNonFunctionPropsPlus<
	Omit<Mesh, PropBlackList>,
	{
		position?: Vector3 | Parameters<Vector3["set"]>
		scale?: Vector3 | Parameters<Vector3["set"]>
		rotation?:
			| Euler
			| Parameters<Euler["set"]>
			| Quaternion
			| Parameters<Quaternion["set"]>
			| Vector3
			| Parameters<Vector3["set"]>
		quaternion?: Quaternion | Parameters<Quaternion["set"]>
		matrix?: Matrix4 | Parameters<Matrix4["set"]>
	}
>

export type MeshInteractionHandler = (e?: CustomEvent) => void
