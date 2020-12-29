/**
 * @author Vatroslav Vrbanic @see https://github.com/vatro
 */

import { Euler, Matrix4 } from "svelthree-three"

export default class PropUtils {
    public static isValidArray3Prop(p: any): boolean {
        return p && p.constructor === Array && p.length === 3
    }

    public static isArray(p: any): boolean {
        return p && p.constructor === Array
    }

    // TODO  implement
    public static isValidMatrix4(p: any): boolean {
        return p && p.constructor === Matrix4
    }

    // TODO  implement
    public static isValidEuler(p: any): boolean {
        return p && p.constructor === Euler
    }
}
