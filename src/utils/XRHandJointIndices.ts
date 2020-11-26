export default class XRHandJointIndices {
    static TIP:number[] = [4, 9, 14, 19, 24]
    static DISTAL = [3, 8, 13, 18, 23]
    static INTERMEDIATE = [7, 12, 17, 22]
    static PROXIMAL = [2, 6, 11, 16, 21]
    static METACARPAL = [1, 5, 10, 15, 20]

    static ALL = XRHandJointIndices.METACARPAL.concat(
        XRHandJointIndices.PROXIMAL,
        XRHandJointIndices.INTERMEDIATE,
        XRHandJointIndices.DISTAL,
        XRHandJointIndices.TIP
    )
}