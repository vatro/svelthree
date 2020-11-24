import { sphereIntersectTriangle } from "../../node_modules/three-mesh-bvh/src/Utils/MathUtilities"
import { XRHandTouch } from "./XRHandTouch"
import { Mesh, Sphere, Group, Vector3, BufferGeometry, Color } from "svelthree-three"
import { XRHandTouchSphereDebugger } from "./debuggers/XRHandTouchSphereDebugger"

export class XRHandTouchSphereExt extends XRHandTouch {
    touchSphere: Sphere

    constructor() {
        super()
    }

    // override
    setDebuggerSphere(config: XRHandTouchSphereDebuggerConfig) {
            this.debuggerSphere = new XRHandTouchSphereDebugger(this.touchSphereRadius, config as XRHandTouchSphereDebuggerConfig)
            this.debuggerSphere.initialize(this.currentScene, this.touchDistance)
    }

    spherePaintTouchColor:Color = new Color(0x00ff00)

    // override
    checkUntouchOutside(hand: Group, joint: Group, i: number, intersectObj: { [key: string]: any }, logMessage: String, raycaster?: Raycaster, origin?: Vector3) {
        let indices = this.checkSphereIntersection(joint, intersectObj.object)
        if (indices.length > 0) {
            // don't dispatch untouch!
            // we're in touch range with the newly intersected object / face
            // so we update the joint.userData, but NOT yet joint.userData.raycasterTouchingDir
            joint.userData.touchObj = intersectObj.object
            joint.userData.touchFaceNormal = intersectObj.face.normal
            joint.userData.touchFaceIndex = intersectObj.faceIndex

            // paint sphere touch
            this.colorIndices(intersectObj.object, indices, this.spherePaintTouchColor)

        } else {
            //dispatch untouch!
            console.log(logMessage, intersectObj.distance)
            this.resetJointTouchData(joint)
            this.removeJointFromTouchingArray(hand, i)
            this.dispatchUntouch(hand, joint, i, intersectObj)
        }
    }

    // paint sphere touch
    colorIndices(mesh:Mesh, indices:number[], color:Color) {

        const geom:BufferGeometry = mesh.geometry as BufferGeometry
        const colorAttr = geom.getAttribute( 'color' );
        const indexAttr = geom.index;


        //debugger
        //const indexAttr = geom.getAttribute( 'index' );

        for ( let i = 0, l = indices.length; i < l; i ++ ) {

            const i2 = indexAttr.getX( indices[ i ] );
            colorAttr.setX( i2, color.r );
            colorAttr.setY( i2, color.g );
            colorAttr.setZ( i2, color.b );
          
        }
        colorAttr.needsUpdate = true;
    }

    touchSphereRadius: number = 0.008

    // override
    // replaces distance to face check
    checkSphereIntersection(joint: Group, mesh: Mesh): number[] {
        console.log("checkSphereIntersection!")

        // this doesn't work!
        //this.touchSphere.set(joint.userData.origin, this.touchSphereRadius)
        this.touchSphere = new Sphere(joint.userData.origin, this.touchSphereRadius)

        /*
        if(this.doDebug && joint.userData.debugSphere) {
            joint.userData.debugSphere.position.copy(joint.userData.origin)
        }
        */

        //console.log("joint.userData.origin: ", joint.userData.origin)
        //console.log("this.touchSphere center", this.touchSphere.center)

        let bvh

        if (mesh.geometry['boundsTree']) {
            bvh = mesh.geometry['boundsTree']
            //console.log("has 'boundsTree', bvh: ", bvh)
        }

        //console.log("bvh: ", bvh)

        const indices: number[] = [];

        console.time("bvh.shapecast")
        if (bvh) {
            bvh.shapecast(
                mesh,
                box => this.touchSphere.intersectsBox(box.applyMatrix4(mesh.matrixWorld)),
                (tri, a, b, c) => {

                    tri.a.applyMatrix4(mesh.matrixWorld)
                    tri.b.applyMatrix4(mesh.matrixWorld)
                    tri.c.applyMatrix4(mesh.matrixWorld)

                    if (sphereIntersectTriangle(this.touchSphere, tri)) {
                        indices.push(a, b, c);
                    }

                    return false
                }
            )
        }
        console.timeEnd("bvh.shapecast")

        //console.log("indices: ", indices)

        return indices
    }

    // override
    intersectionsPhase1Raycast(params: XRTouchRayUpdateParams, joint: Group): any {
        return this.doRaycast(params.raycaster, joint.userData.origin, joint.userData.direction, 0, this.touchSphereRadius + this.touchDistance * joint.userData.speedFac)
    }

    // override
    isInTouchDistance(intersections: any[], joint: Group): boolean {
        let indices = this.checkSphereIntersection(joint, intersections[0].object)
        return indices.length > 0
    }
}