/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */
import { Vector3, Matrix4, Euler, Color } from "svelthree-three"

export type Array3 = [number, number, number]
export type Array4 = [number, number, number, string]

export type PropColor = Vector3 | number[] | Color
export type PropPos = Vector3 | Array3
export type PropRot = Euler | Array3 | Array4
export type PropScale = Vector3 | Array3
export type PropLookAt = Vector3 | Array3
export type PropMatrix4 = Matrix4
