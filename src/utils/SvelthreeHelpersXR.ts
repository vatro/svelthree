import {
    LineBasicMaterial,
    LineDashedMaterial,
    XRHandModel,
    BufferGeometry,
    Vector3,
    Line,
    Group
} from "svelthree-three"

import { XRHandRayConfigs } from "./XRHandRayConfigs"
import XRHandJointIndices from "./XRHandJointIndices"

export class SvelthreeHelpersXR {
    controllerRay: Line
    tipRayL: Line
    tipRayR: Line
    stdRay: Line
    stdRayL: Line
    stdRayR: Line
    dirRayLfwd: Line
    dirRayRfwd: Line
    dirRayLdwn: Line
    dirRayRdwn: Line

    dirRayLpunch: Line
    dirRayRpunch: Line

    constructor() {
        this.createControllerHelper()
        this.createTipHelpers()
        this.createStandardHelpers()
        this.createHandDirectionHelpers()
    }

    getCoordsHelper(): Group {
        //coordinates

        let cXp_mat = new LineBasicMaterial({
            color: 0xc53030,
            linewidth: 2
        })
        let cXn_mat = new LineBasicMaterial({
            color: 0xfed7d7,
            linewidth: 2
        })
        let cYp_mat = new LineBasicMaterial({
            color: 0x2f855a,
            linewidth: 2
        })
        let cYn_mat = new LineBasicMaterial({
            color: 0xc6f6d5,
            linewidth: 2
        })
        let cZp_mat = new LineBasicMaterial({
            color: 0x2b6cb0,
            linewidth: 2
        })
        let cZn_mat = new LineBasicMaterial({
            color: 0xbee3f8,
            linewidth: 2
        })

        let cXp_geom: BufferGeometry = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(1, 0, 0)])

        let cXp: Line = new Line(cXp_geom)
        cXp.material = cXp_mat

        let cXn_geom: BufferGeometry = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(-1, 0, 0)])

        let cXn: Line = new Line(cXn_geom)
        cXn.material = cXn_mat

        let cYp_geom = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 1, 0)])

        let cYp: Line = new Line(cYp_geom)
        cYp.material = cYp_mat

        let cYn_geom: BufferGeometry = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, -1, 0)])

        let cYn: Line = new Line(cYn_geom)
        cYn.material = cYn_mat

        let cZp_geom: BufferGeometry = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, 1)])

        let cZp: Line = new Line(cZp_geom)
        cZp.material = cZp_mat

        let cZn_geom: BufferGeometry = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -1)])

        let cZn: Line = new Line(cZn_geom)
        cZn.material = cZn_mat

        let coord = new Group()
        coord.add(cXp, cXn, cYp, cYn, cZp, cZn)

        return coord
    }

    createControllerHelper(): void {
        let lineGeom: BufferGeometry = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -1)])
        this.controllerRay = new Line(lineGeom)
        this.controllerRay.name = "Controller Ray"
        this.controllerRay.scale.z = 5
    }

    /**
     * This should be correct, but it isn't.
     * @see https://github.com/vatro/svelthree/issues/30
     */

    /*
    createTipHelpers() {
        let tipRayL_geom:BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(0, 0, -1)
        ])
        this.tipRayL = new Line(tipRayL_geom)
        this.tipRayL.name = "TipRay Left"
        this.tipRayL.scale.x = 0.05

        let tipRayR_geom:BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(0, 0, -1)
        ])
        this.tipRayR = new Line(tipRayR_geom)
        this.tipRayR.name = "TipRay Right"
        this.tipRayR.scale.x = 0.05
    }

    createStandardHelpers() {
        //Normally a ray in three.js would point towards by pointig in negative z axis direction
        let stdRay_geom:BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(0, 0, -1)
        ])
        this.stdRay = new Line(stdRay_geom)
        this.stdRay.name = "StdRay"
        this.stdRay.scale.z = 0.05
    }
    */

    //Workaround
    createTipHelpers() {
        let scale = 0.025
        let tipsTargetYOffset = 0.75
        let tipRayL_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(1 * scale, tipsTargetYOffset * scale, 0)
        ])
        this.tipRayL = new Line(tipRayL_geom)
        this.tipRayL.name = "TipRay Left"

        let tipRayR_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(-1 * scale, -1 * tipsTargetYOffset * scale, 0)
        ])
        this.tipRayR = new Line(tipRayR_geom)
        this.tipRayR.name = "TipRay Right"
    }

    createStandardHelpers() {
        let scale = 0.025
        //Normally a ray in three.js would point towards by pointig in negative z axis direction
        let stdRayL_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(0, 1 * scale, 0)
        ])
        this.stdRayL = new Line(stdRayL_geom)
        this.stdRayL.name = "StdRay L"

        let stdRayR_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(0, -1 * scale, 0)
        ])
        this.stdRayR = new Line(stdRayR_geom)
        this.stdRayR.name = "StdRay R"
    }

    createHandDirectionHelpers() {
        let scale = 5
        let dir_mat = new LineDashedMaterial({
            color: 0xffffff,
            linewidth: 1,
            scale: 1,
            dashSize: 0.01,
            gapSize: 0.01
        })

        let dirRayLfwd_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            XRHandRayConfigs.dirRayLfwdProps.origin.clone(),
            XRHandRayConfigs.dirRayLfwdProps.direction.clone().multiplyScalar(scale)
        ])
        this.dirRayLfwd = new Line(dirRayLfwd_geom, dir_mat)
        this.dirRayLfwd.computeLineDistances()
        this.dirRayLfwd.name = "DirRayFwd L"

        let dirRayRfwd_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            XRHandRayConfigs.dirRayRfwdProps.origin.clone(),
            XRHandRayConfigs.dirRayRfwdProps.direction.clone().multiplyScalar(scale)
        ])
        this.dirRayRfwd = new Line(dirRayRfwd_geom, dir_mat)
        this.dirRayRfwd.computeLineDistances()
        this.dirRayRfwd.name = "DirRayFwd R"

        let dwnOriginXOffset: number = 0.025
        let dwnTargetXOffset: number = 0.25

        let dirRayLdwn_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            XRHandRayConfigs.dirRayLdwnProps.origin.clone(),
            XRHandRayConfigs.dirRayLdwnProps.direction.clone().multiplyScalar(scale)
        ])
        this.dirRayLdwn = new Line(dirRayLdwn_geom, dir_mat)
        this.dirRayLdwn.computeLineDistances()
        this.dirRayLdwn.name = "DirRayDwn L"

        let dirRayRdwn_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            XRHandRayConfigs.dirRayRdwnProps.origin.clone(),
            XRHandRayConfigs.dirRayRdwnProps.direction.clone().multiplyScalar(scale)
        ])
        this.dirRayRdwn = new Line(dirRayRdwn_geom, dir_mat)
        this.dirRayRdwn.computeLineDistances()
        this.dirRayRdwn.name = "DirRayDwn R"

        //punch

        let dirRayLpunch_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(0.5 * scale, -1 * scale, 0)
        ])
        this.dirRayLpunch = new Line(dirRayLpunch_geom, dir_mat)
        this.dirRayLpunch.computeLineDistances()
        this.dirRayLpunch.name = "DirRayPunch L"

        let dirRayRpunch_geom: BufferGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(-0.5 * scale, 1 * scale, 0)
        ])
        this.dirRayRpunch = new Line(dirRayRpunch_geom, dir_mat)
        this.dirRayRpunch.computeLineDistances()
        this.dirRayRpunch.name = "DirRayPunch R"
    }

    joints: number[] = XRHandJointIndices.DISTAL.concat(
        XRHandJointIndices.INTERMEDIATE,
        XRHandJointIndices.PROXIMAL,
        XRHandJointIndices.METACARPAL
    )

    addHandHelpers(xrhand: XRHandModel, i: number) {
        let coordsScale: number = 0.0125
        let tipRay: Line
        let stdRay: Line
        let dirRayFwd: Line
        let dirRayDwn: Line
        let dirRayPunch: Line

        i == 0 ? (tipRay = this.tipRayL) : null
        i == 1 ? (tipRay = this.tipRayR) : null
        i == 0 ? (stdRay = this.stdRayL) : null
        i == 1 ? (stdRay = this.stdRayR) : null
        i == 0 ? (dirRayFwd = this.dirRayLfwd) : null
        i == 1 ? (dirRayFwd = this.dirRayRfwd) : null
        i == 0 ? (dirRayDwn = this.dirRayLdwn) : null
        i == 1 ? (dirRayDwn = this.dirRayRdwn) : null
        i == 0 ? (dirRayPunch = this.dirRayLpunch) : null
        i == 1 ? (dirRayPunch = this.dirRayRpunch) : null

        //wrist
        xrhand.controller.children[0].add(stdRay.clone())

        //direction
        xrhand.controller.children[10].add(dirRayFwd.clone())
        xrhand.controller.children[10].add(dirRayDwn.clone())

        //punch
        xrhand.controller.children[11].add(dirRayPunch.clone())

        //tips
        for (let i = 0; i < XRHandJointIndices.TIP.length; i++) {
            let coords: Group = this.getCoordsHelper()
            coords.scale.set(coordsScale, coordsScale, coordsScale)
            xrhand.controller.children[XRHandJointIndices.TIP[i]].add(tipRay.clone())
            xrhand.controller.children[XRHandJointIndices.TIP[i]].add(coords)
        }

        //joints
        for (let i = 0; i < this.joints.length; i++) {
            let coords: Group = this.getCoordsHelper()
            coords.scale.set(coordsScale, coordsScale, coordsScale)
            xrhand.controller.children[this.joints[i]].add(stdRay.clone())
            xrhand.controller.children[this.joints[i]].add(coords)
        }
    }
}
