
    import {
        Group,
        Vector3,
        Object3D,
        Scene,
        Raycaster,
        Line,
        LineBasicMaterial,
        BufferGeometry,
        BufferAttribute,
        MeshStandardMaterial,
        MeshBasicMaterial,
        Mesh,
        Matrix3,
        Matrix4,
        Color,
        Plane,
        Sphere,
        OctahedronBufferGeometry,
        SphereBufferGeometry,
        Triangle
    } from "svelthree-three"

    //BVH
    import { sphereIntersectTriangle } from '../../node_modules/three-mesh-bvh/src/Utils/MathUtilities.js';
    //import { MeshBVHVisualizer}  from '../../node_modules/three-mesh-bvh/src/MeshBVHVisualizer.js';

    export class XRHandTouchSphere {
        tentacleMat: LineBasicMaterial
        tentacleTouchMat: LineBasicMaterial
        tentacleNormalRayMat: LineBasicMaterial
        tentacleTouchingRayMat: LineBasicMaterial
        tentacleTestRayMat: LineBasicMaterial
        //tentacleScale = 0.025
        tentacleDirScale = 0.02
        tentacleTouchingRayScale = this.tentacleDirScale*3
        jointMat: MeshStandardMaterial

        drawTentacles:boolean = true
        drawTouchDebuggers:boolean = true
        highlightJoint:boolean = false

        tip: number[]
        distal: number[]
        intermediate: number[]
        proximal: number[]
        metacarpal: number[]
        joints: number[]
        allJoints: number[]

        enabledJoints: number[]

        //debugPoint:Mesh
        //debugPointCurrent:Mesh

        currentScene:Scene

        leftHand: Group = undefined
        rightHand: Group = undefined

        toTest:Object3D[]
        useBVH:boolean = false

        //debugPointGeom:OctahedronBufferGeometry
        //debugPointsMesh:Mesh
        //debugPointMeshGeom:BufferGeometry
        //debugPointsMeshMat:MeshBasicMaterial
        //debugPointsCounter:number = 0
        //debugMeshesAdded:boolean = false

        touchDistance:number = 0.008

        // Sphere( center : Vector3, radius : Float )
        touchSphere:Sphere
        touchSphereDebug:Mesh
        

        constructor() {
            this.tentacleMat = new LineBasicMaterial({
                color: 0x4299e1,
                linewidth: 2
            })

            this.tentacleTouchMat = new LineBasicMaterial({
                color: 0xff0000,
                linewidth: 2
            })

            this.tentacleNormalRayMat = new LineBasicMaterial({
                color: 0xffff00,
                linewidth: 2
            })

            this.tentacleTouchingRayMat = new LineBasicMaterial({
                color: 0xffff00, // yellow thick
                linewidth: 2
            })

            this.tentacleTestRayMat = new LineBasicMaterial({
                color: 0xff00bf, // fuchsia thin
                linewidth: 1
            })

            this.jointMat = new MeshStandardMaterial({
                color: 0x4299e1,
                roughness: 0.5,
                metalness: 0.5
            })

            //this.debugPointsMeshMat = new MeshBasicMaterial({color: 0xff0000})

            this.tip = [4, 9, 14, 19, 24]
            this.distal = [3, 8, 13, 18, 23]
            this.intermediate = [7, 12, 17, 22]
            this.proximal = [2, 6, 11, 16, 21]
            this.metacarpal = [1, 5, 10, 15, 20]

            this.joints = this.distal.concat(this.intermediate, this.proximal, this.metacarpal)
            this.allJoints = this.tip.concat(this.distal, this.intermediate, this.proximal, this.metacarpal)

            this.touchSphere = new Sphere(new Vector3(0,0,0), this.touchSphereRadius)
            this.touchSphereDebug = new Mesh(new SphereBufferGeometry(this.touchSphereRadius, 16, 16), new MeshBasicMaterial({color: 0xffff00, transparent: true, opacity: 0.5}))
            this.touchSphereDebug.name = "touchSphereDebug"
            //this.debugPointGeom = new OctahedronBufferGeometry(0.002, 0)
            //this.debugPoint.name = "debugPoint"
            //this.debugPointCurrent.name = "debugPointCurrent"

            //this.debugLinesMesh = new Mesh()
            
        }

        // which world objects to test, have to updated on at least every frame...)
        updateToTest(currentScene:Scene) {

            this.currentScene = currentScene

            /*
            if(this.debugMeshesAdded === false && this.drawTouchDebuggers) {
                let MAX_POINTS = 100000;

                this.debugPointMeshGeom = new BufferGeometry()
                let positions = new Float32Array( MAX_POINTS * 3 ); // 3 vertices per point
                this.debugPointMeshGeom.setAttribute( 'position', new BufferAttribute( positions, 3 ) );

                this.debugPointsMesh = new Mesh( this.debugPointMeshGeom, this.debugPointsMeshMat)
                //this.debugPointsMesh.name = "debugMesh"
                this.currentScene.add(this.debugPointsMesh)
                
                //this.debugPointsCounter = 0
                this.debugMeshesAdded = true
            }
            */

            this.toTest = currentScene.children.filter(
                (child: Object3D) =>
                //all Meshes except the hand joints themselves
                child.type === "Mesh" &&
                child.parent !== this.leftHand &&
                child.parent !== this.rightHand &&
                child.name !== "touchSphereDebug"
                //child.name !== "debugMesh" 
                //child.name !== "debugPointCurrent"
            )
        }

        updateBVH(useBVH:boolean) {
            this.useBVH = useBVH
        }

        updateTouchDistance(touchDistance:number) {
            this.touchDistance = touchDistance
        }

        doDebug:boolean

        updateDebug(debug:boolean) {
            if(debug) {
                this.doDebug = true
                this.drawTentacles = true
                this.drawTouchDebuggers = true
            }
            else {
                this.drawTentacles = false
                this.drawTouchDebuggers = false
            }
        }

        /**
         * Limit direction change by lerping the direction.
         * Results is smooth direction change (no zappeln) at cost of accuracy.
         */
        update(
            hand: Group,
            params: XRTouchRayUpdateParams
        ) {
            this.enabledJoints = params.enabledJoints  

            // run for all enabled hand-joints...
            for(let i = 0; i < this.enabledJoints.length; i++) {

                let jointIndex:number = this.enabledJoints[i]
                let joint: Group = hand.children[jointIndex] as Group

                if(this.doDebug && !joint.userData.debugSphere) {
                    joint.userData.debugSphere = this.touchSphereDebug.clone()
                    this.currentScene.add(joint.userData.debugSphere)
                }

                let jointMesh: Mesh
                if( this.highlightJoint ) { jointMesh = this.getJointMesh(hand, joint, i) }

                if(joint.userData.origin !== undefined) {
                    joint.userData.lastOrigin = joint.userData.origin
                    if(this.doDebug && joint.userData.debugSphere) {
                        joint.userData.debugSphere.position.copy(joint.userData.origin)
                    }
                }
              
                let currentOrigin: Vector3 = this.getJointOrigin(joint, jointIndex, params.handProfile, hand.userData.handedness)
                
                if (joint.userData.origin && joint.userData.direction) {
                    joint.userData.direction = this.getJointDirection(joint, currentOrigin, params.lerpFactor)
                    joint.userData.speedFac = this.calculateSpeedFac(joint, currentOrigin, params.xrFrameDelta)
                    joint.userData.origin = currentOrigin
                } else {
                    joint.userData.origin = currentOrigin
                    joint.userData.direction = new Vector3(0, 0, 0)
                    joint.userData.speedFac = 0
                }

                if(joint.userData.touch === undefined) { joint.userData.touch = false }
                if(joint.userData.touchInside === undefined) { joint.userData.touchInside = false }

                if(this.drawTentacles === true) {
                    this.tentacleDirScale = this.touchDistance*joint.userData.speedFac
                    this.tentacleTouchingRayScale = this.touchDistance*3    
                }
              
                // intersections of the joint-direction-ray 
                let intersectionsPhase1

                // raycast Phase 1
                switch (joint.userData.touch) {
                    case false:

                        this.drawTentacles ? this.showDirectionTentacle(joint, joint.userData.origin) : null
                        this.highlightJoint && jointMesh ? jointMesh.material["emissive"].setHex(0x000000) : null

                        /**
                         * intersectionsPhase1
                         * Cast a ray from joint's origin in its'direction (lerped).
                         * The raycaster ray's ray is limited to touchDistance*joint.userData.speedFac
                         */
                        //intersectionsPhase1 = this.doRaycast(params.raycaster, joint.userData.origin, joint.userData.direction, 0, this.touchDistance*joint.userData.speedFac )
                        intersectionsPhase1 = this.doRaycast(params.raycaster, joint.userData.origin, joint.userData.direction, 0, this.touchSphereRadius + this.touchDistance*joint.userData.speedFac )


                        /**
                         * If the intersectionsPhase1 intersects an object...
                         */
                        if (intersectionsPhase1.length > 0) {

                            /**
                             * TOUCH
                             * ... if the distiance to the intersection point is <= touchDistance
                             * Color the intersected face and DISPATCH a TOUCH EVENT
                             * else
                             * save the intersected object inside joint.userData.lastIntersect
                            */

                            let indices = this.checkSphereIntersection(joint, intersectionsPhase1[0].object)

                            //if (intersectionsPhase1[0].distance <= this.touchDistance) {
                            if (indices.length > 0) {    
                               
                                // atm this has an effect on the next frame, 
                                joint.userData.touch = true
                                joint.userData.touchObj = intersectionsPhase1[0].object
                                joint.userData.touchFaceNormal = intersectionsPhase1[0].face.normal
                                joint.userData.touchFaceIndex = intersectionsPhase1[0].faceIndex
                                joint.userData.lastTouchPoint = intersectionsPhase1[0].point
                                joint.userData.lastIntersect = undefined

                                //this.colorFace(intersectionsPhase1[0], this.hlColTouch, null)
                                this.colorIndices(intersectionsPhase1[0].object, indices, this.hlColTouch)

                                this.addJointToTouchingArray(hand, i)
                                this.dispatchTouch(hand, joint, i, intersectionsPhase1[0])

                                this.touchingOutsideCheck(joint, i, params.raycaster, hand, jointMesh)
                            }
                            else {
                                //  save target
                                console.log("INTERSECTION OUTSIDE OF TOUCH DISTANCE --> SAVING TARGET!")
                                joint.userData.lastIntersect = intersectionsPhase1[0]
                            }
                        }
                        else {
                            
                            if(joint.userData.lastIntersect !== undefined) {

                                // increase speedFac limit to prevent fast touch detection at slow motion 
                                if(joint.userData.speedFac > 2) {

                                    //... and unintentional superfast touches (probably resulting from tracking glitches)
                                    //if(joint.userData.speedFac < 10) {

                                        console.time("FAST TOUCH - TEST")

                                        // TODO  Try to make FAST TOUCH check more perfomant, old version up to 5ms, that's too expensive
                                        // TASK:
                                        // directional ray didn't touch anything but a frame before that it did, where are we?:
                                        // ray --> shoot a ray (slightly shorter) from joints origin to last intersection point
                                        
                                        // no intersection:
                                        // a) INSIDE the object (behind the face) --> no intersection (with lastTouchPoint object) + the ray and the touched face normal should be pointing into same direction (dotProd > 0 --> same direction)
                                        // b) we're OUTSIDE the object (in front of the face) --> no intersection (with lastTouchPoint object) + the ray and the touched face normal should be pointing into different directions (dotProd < 0 --> facing)

                                        // intersection:
                                        // c) we're OUTSIDE the object (on the other side) --> intersection (with lastTouchPoint object)

                                        // RESOLVE:
                                        // 1. shoot the ray origin --> lastIntersect.point
                                        let untouchTestRaycasterDir:Vector3 = new Vector3().subVectors(joint.userData.lastIntersect.point, joint.userData.origin).normalize()
                                        let untouchTestRaycasterLength:number = joint.userData.origin.distanceTo(joint.userData.lastIntersect.point)
                                        let untouchTestRaycast = this.doRaycastObject(params.raycaster, joint.userData.origin, untouchTestRaycasterDir, joint.userData.lastIntersect.object, 0, untouchTestRaycasterLength*0.99)

                                        // visual debugging
                                        if(this.drawTouchDebuggers) {
                                            let lineGeom = new BufferGeometry().setFromPoints([ joint.userData.origin, joint.userData.lastIntersect.point])
                                            let line  = new Line(lineGeom, this.tentacleTouchingRayMat)
                                            this.currentScene.add(line)
                                        }

                                        // 2. intersection / no intersection

                                        // intersection
                                        if(untouchTestRaycast.length > 0) {

                                            // c) we're OUTSIDE the object (on the other side) 

                                            console.time("TOUCHTHROUGH - CONDITIONAL BLOCK")
                    
                                            this.colorFace(joint.userData.lastIntersect, this.hlColTouch2, "TOUCHTHROUGH ENTER!") // yellow
                                            this.colorFace(untouchTestRaycast[0], this.hlColUnTouch2, "TOUCHTHROUGH EXIT!") // fuchsia

                                            this.drawTentacles ? this.removeAllTentacles(joint) : null

                                            joint.userData.touch = false
                                            joint.userData.touchInside = false
                                            joint.userData.lastIntersect = undefined

                                            this.dispatchTouch(hand, joint, i, joint.userData.lastIntersect)
                                            this.dispatchUntouch(hand, joint, i, untouchTestRaycast[0])
                                            this.dispatchTouchThrough(hand, joint, i, {enter: joint.userData.lastIntersect, exit: untouchTestRaycast[0]})

                                            this.resetJointTouchData(joint)

                                            console.timeEnd("TOUCHTHROUGH - CONDITIONAL BLOCK")

                                        }
                                        // no intersection
                                        else {
                                            // get the face normal (transformed). We don't need the face normal if we're intersecting, so calculate only if not intersecting.
                                            let intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix( joint.userData.lastIntersect.object.matrixWorld)
                                            let fNormal:Vector3 = joint.userData.lastIntersect.face.normal.clone().applyMatrix3(intersectedObjectNormalMatrixWorld).normalize()

                                            let dotProd:number = untouchTestRaycasterDir.dot(fNormal)

                                            // a) INSIDE the object (behind the face, dotProd > 0 --> same direction)
                                            if(dotProd > 0) {

                                                console.time("FAST TOUCH ENTER (no exit & immediate inside check) - CONDITIONAL BLOCK")
                                                 // dispatch "touch" (entered but not exited)
                                                 this.colorFace(joint.userData.lastIntersect, this.hlColTouch2, "FAST TOUCH ENTER!") // yellow

                                                 joint.userData.touch = true
                                                 joint.userData.touchInside = true
                                                 joint.userData.touchObj = joint.userData.lastIntersect.object
                                                 joint.userData.lastTouchPoint =  joint.userData.lastIntersect.point

                                                 this.addJointToTouchingArray(hand, i)
                                                 this.dispatchTouch(hand, joint, i, joint.userData.lastIntersect)
                                                 joint.userData.lastIntersect = undefined

                                                 // continue immediately with touching inside check ...
                                                 this.touchingInsideCheck(joint, i, params.raycaster, hand, jointMesh)

                                                 console.timeEnd("FAST TOUCH ENTER (no exit & immediate inside check) - CONDITIONAL BLOCK")

                                            }
                                            else if (dotProd < 0) {
                                            // b) we're OUTSIDE the object (in front of the face, dotProd < 0 --> facing)
                                            {
                                                // TODO  Scratch happens too often even at low speed (shadow gentle touch)
                                                console.time("SCRATCH - CONDITIONAL BLOCK")
                    
                                                this.colorFace(joint.userData.lastIntersect, this.hlColScratch, "SCRATCH!") // yellow
                                            
                                                this.drawTentacles ? this.removeAllTentacles(joint) : null

                                                joint.userData.touch = false
                                                joint.userData.touchInside = false
                                                joint.userData.lastIntersect = undefined

                                                this.dispatchTouch(hand, joint, i, joint.userData.lastIntersect)
                                                this.dispatchUntouch(hand, joint, i, joint.userData.lastIntersect)
                                                this.dispatchScratch(hand, joint, i, joint.userData.lastIntersect)

                                                this.resetJointTouchData(joint)

                                                console.timeEnd("SCRATCH - CONDITIONAL BLOCK")

                                            }

                                        }
                                    
                                        }
                                   //  TODO limit too high speeds in order to filter out glitch-speeds    
                                    /*}
                                    else {
                                        console.warn("SPEED TOO HIGH --> NO FAST TOUCH!")
                                    }*/

                                    console.timeEnd("FAST TOUCH - TEST")
                                } else {
                                    console.warn("SPEED TOO LOW --> FAST TOUCH BLOCKED (gentle touch)!")
                                }
                               
                            }
                            
                        }
                    break

                    case true:
                        // TOUCHED!
                        switch(joint.userData.touchInside) {

                            case false:
                                this.touchingOutsideCheck(joint, i, params.raycaster, hand, jointMesh)
                            break

                            case true:
                                this.touchingInsideCheck(joint, i, params.raycaster, hand, jointMesh)
                            break

                        }
                    break  
                }

            }
        
        }

        touchingOutsideCheck(joint:Group, i:number, raycaster:Raycaster, hand:Group, jointMesh:Mesh):void {

            // intersections of normal-direction-ray (when touching)
            let intersectionsPhase2

            // raycasting from OUTSIDE (touching)
            // raycast using negative normal ray of touched face! (in order to get real distance)
            // use joint.userData here
                           
            if(!joint.userData.raycasterTouchingDir) {
                // uses joint.userData.touchFaceNormal & joint.userData.touchObj, can either be set during Phase1 or FAST TOUCH
                this.setInitialRaycasterTouchingDir(joint)
            }

            intersectionsPhase2 = this.doRaycast(raycaster, joint.userData.origin, joint.userData.raycasterTouchingDir)
            this.drawTentacles ? this.removeRaycasterTestTentacle(joint) : null
            this.drawTentacles ? this.removeDirectionTentacle(joint) : null
            //this.showDirectionTentacle(joint, origin)
            this.drawTentacles ? this.showRaycasterTouchingTentacle(joint, joint.userData.origin) : null

            if (intersectionsPhase2.length > 0) {
                this.highlightJoint && jointMesh ? jointMesh.material["emissive"].setHex(0x00ff00) : null

                joint.userData.lastTouchPoint = intersectionsPhase2[0].point

                // if we're hitting the same object and same face
                if ( intersectionsPhase2[0].object === joint.userData.touchObj && intersectionsPhase2[0].faceIndex === joint.userData.touchFaceIndex) {
                    this.checkUntouchOutside(hand, joint, i, raycaster, joint.userData.origin, intersectionsPhase2[0], "UNTOUCH - OUT OF RANGE - SAME OBJECT, SAME FACE : ")
                }
                // if we're hitting the same object but another face
                else if ( intersectionsPhase2[0].object === joint.userData.touchObj && intersectionsPhase2[0].faceIndex !== joint.userData.touchFaceIndex) {
                    this.checkUntouchOutside(hand, joint, i, raycaster, joint.userData.origin, intersectionsPhase2[0], "UNTOUCH - OUT OF RANGE - SAME OBJECT, NEW FACE : ")
                }
                // if we're hitting another object    
                else if ( intersectionsPhase2[0].object !== joint.userData.touchObj ) {
                    // current bug: if we're hitting another object during the touch phase and the object is too far away we should NOT trigger untouch!
                    // if the object IS inside touch range we just switch the userData!
                    // there is NO untouch in this case
                    // WAIT!!! we could prevent this by setting the far of raycaster to lower value!
                    // HEUREKA! IT WORKS!
                    // this.checkUntouchOutside(hand, joint, i, raycaster, origin, toTest, touchDistance, intersectionsPhase2[0], "UNTOUCH - OUT OF RANGE - NEW OBJECT, NEW FACE : ")
                 }
            }
            else {
                // we're inside
                this.touchingInsideCheck(joint, i, raycaster, hand, jointMesh)
            }
        }

        touchingInsideCheck(joint:Group, i:number, raycaster:Raycaster, hand:Group, jointMesh:Mesh):void {

            this.highlightJoint && jointMesh ? jointMesh.material["emissive"].setHex(0xff0000) : null
           
            this.drawTentacles ? this.removeAllTentacles(joint) : null

            let testRaycasterDir:Vector3
            let testRaycasterLength:number

            if(joint.userData.lastTouchPoint) {
                testRaycasterDir = new Vector3().subVectors(joint.userData.lastTouchPoint, joint.userData.origin)
                testRaycasterLength = joint.userData.origin.distanceTo(joint.userData.lastTouchPoint)
            } 
            else
            {
                testRaycasterDir = new Vector3().subVectors(joint.userData.lastOrigin, joint.userData.origin)
                testRaycasterLength = joint.userData.origin.distanceTo(joint.userData.lastOrigin)
            }

            let testRaycast = this.doRaycastObject(raycaster, joint.userData.origin, testRaycasterDir, joint.userData.touchObj, 0, testRaycasterLength)

            if(this.drawTouchDebuggers) {

                //let p1Geom:OctahedronBufferGeometry = this.debugPointGeom.clone()
                //let p2Geom:OctahedronBufferGeometry = this.debugPointGeom.clone()

                let lineGeom:BufferGeometry
                //let p3:Mesh = this.debugPointCurrent.clone()
                //joint.userData.lastTouchPoint ?  p1.position.copy(joint.userData.lastTouchPoint) : p1.position.copy(joint.userData.lastOrigin)

                if(joint.userData.lastTouchPoint) {
                    //p1Geom.translate(joint.userData.lastTouchPoint.x, joint.userData.lastTouchPoint.y, joint.userData.lastTouchPoint.z)
                    lineGeom = new BufferGeometry().setFromPoints([ joint.userData.lastTouchPoint, joint.userData.origin ])
                }
                else {
                    //p1Geom.translate(joint.userData.lastOrigin.x, joint.userData.lastOrigin.y, joint.userData.lastOrigin.z)
                    lineGeom = new BufferGeometry().setFromPoints([ joint.userData.lastOrigin, joint.userData.origin ])
                }

                //p2Geom.translate(joint.userData.origin.x, joint.userData.origin.y, joint.userData.origin.z)

                //p2.position.copy(joint.userData.origin)
                //p3.position.copy(currentOrigin)
                
                let line  = new Line(lineGeom, this.tentacleTouchingRayMat)
                
                /*
                //somehow doesn't work --> ???
                this.debugPointMeshGeom.merge(p1Geom, 0)
                this.debugPointMeshGeom.merge(p1Geom, this.debugPointGeom.attributes.position.count*3*this.debugPointsCounter)
                console.warn("merge at: " + this.debugPointGeom.attributes.position.count*3*this.debugPointsCounter)
                this.debugPointMeshGeom.merge(p2Geom, this.debugPointGeom.attributes.position.count*3*(this.debugPointsCounter + 1))
                console.warn("merge at: " + this.debugPointGeom.attributes.position.count*3*(this.debugPointsCounter + 1))
                */
                this.currentScene.add(line)
                //this.debugPointsCounter +=2
               
                //debugger
            }

            joint.userData.lastTouchPoint = undefined

            if(testRaycast.length > 0) {

                if(testRaycast[0].point.distanceTo(joint.userData.origin) > this.touchDistance || joint.userData.speedFac > 1.1) {
                    //dispatch untouch!
                    console.log("TOUCH AND TOUCH INSIDE TRUE --> OBJECT EXITED (ray between origins intersected a face!)")
                    this.colorFace(testRaycast[0], this.hlColUnTouch, "TOUCH AND TOUCH INSIDE TRUE --> OBJECT EXITED!")

                    this.drawTentacles ? this.removeAllTentacles(joint) : null
                    
                    this.removeJointFromTouchingArray(hand, i)
                    this.dispatchUntouch(hand, joint, i, testRaycast[0])
                    this.resetJointTouchData(joint)
                }
                else {
                    joint.userData.touchInside = false
                }
               
            }
        }

        showDirectionTentacle(joint: Group, origin: Vector3) {
            if (joint.userData.tentacleDir) {
                this.currentScene.remove(joint.userData.tentacleDir)
                joint.userData.tentacleDir.geometry.dispose()
                joint.userData.tentacleDir = undefined
            }

            let target = origin.clone().add(joint.userData.direction.clone().multiplyScalar(this.tentacleDirScale))
            let lineGeom = new BufferGeometry().setFromPoints([origin, target])
            joint.userData.tentacleDir = new Line(lineGeom, this.tentacleMat)

            this.currentScene.add(joint.userData.tentacleDir)
        }

        showRaycasterTouchingTentacle(joint: Group, origin: Vector3) {
            if (joint.userData.tentacleTouchingRay) {
                this.currentScene.remove(joint.userData.tentacleTouchingRay)
                joint.userData.tentacleTouchingRay.geometry.dispose()
                joint.userData.tentacleTouchingRay = undefined
            }

            let target = origin.clone().add(joint.userData.raycasterTouchingDir.clone().multiplyScalar(this.tentacleTouchingRayScale))
            let lineGeom = new BufferGeometry().setFromPoints([origin, target])
            joint.userData.tentacleTouchingRay = new Line(lineGeom, this.tentacleTouchingRayMat)

            this.currentScene.add(joint.userData.tentacleTouchingRay)
        }

        showRaycasterTestTentacle(joint: Group, origin: Vector3, direction:Vector3) {
            if (joint.userData.tentacleTestRay) {
                this.currentScene.remove(joint.userData.tentacleTestRay)
                joint.userData.tentacleTestRay.geometry.dispose()
                joint.userData.tentacleTestRay = undefined
            }

            let target = origin.clone().add(direction.clone().multiplyScalar(this.tentacleTouchingRayScale))
            let lineGeom = new BufferGeometry().setFromPoints([origin, target])
            joint.userData.tentacleTestRay = new Line(lineGeom, this.tentacleTestRayMat)

            this.currentScene.add(joint.userData.tentacleTestRay)
        }

        removeDirectionTentacle(joint:Group) {
            if (joint.userData.tentacleDir) {
                this.currentScene.remove(joint.userData.tentacleDir)
                joint.userData.tentacleDir.geometry.dispose()
                joint.userData.tentacleDir = undefined
            }
        }

        removeRaycasterTouchingTentacle(joint:Group) {
            if (joint.userData.tentacleTouchingRay) {
                this.currentScene.remove(joint.userData.tentacleTouchingRay)
                joint.userData.tentacleTouchingRay.geometry.dispose()
                joint.userData.tentacleTouchingRay = undefined
            }
        }

        removeRaycasterTestTentacle(joint:Group) {
            if (joint.userData.tentacleTestRay) {
                this.currentScene.remove(joint.userData.tentacleTestRay)
                joint.userData.tentacleTestRay.geometry.dispose()
                joint.userData.tentacleTestRay = undefined
            }
        }

        setInitialRaycasterTouchingDir(joint:Group) {
            // TODO  check one more time why we're doing this like this (normals) and write it down!
            let touchedFaceNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(joint.userData.touchObj.matrixWorld)
            let raycasterDir:Vector3 = joint.userData.touchFaceNormal.clone().applyMatrix3(touchedFaceNormalMatrixWorld).normalize().negate()
            joint.userData.raycasterTouchingDir = raycasterDir
        }

        /**
         *  Checks distance to intersected face / objects and dispatches the untouch event if needed.
         *  Changes 'joint.userData.raycasterTouchingDir' accordingly
         */
        checkUntouchOutside(hand:Group, joint:Group, i:number, raycaster:Raycaster, origin:Vector3, intersectObj:{[key:string]:any}, logMessage:String) {

            
            let indices = this.checkSphereIntersection(joint, intersectObj.object)
            //if (intersectObj.distance < this.touchDistance) {
            if (indices.length > 0) {    
                // don't dispatch untouch!
                // we're in touch range with the newly intersected object / face
                // so we update the joint.userData, but NOT yet joint.userData.raycasterTouchingDir
                joint.userData.touchObj = intersectObj.object
                joint.userData.touchFaceNormal = intersectObj.face.normal
                joint.userData.touchFaceIndex = intersectObj.faceIndex

                // - check if can switch to negative normal ray of the new face (means we're above new object/face) otherwise keep the old direction!
                // re-raycast using negative normal ray! (in order to get real distance)
                /*
                let nnRayHitDirection:Vector3 = this.nnRayIntersectsFace(joint, raycaster, origin, intersectObj)
                if (nnRayHitDirection) {
                        // negative normal raycast hits the same face means we can safely update raycasterTouchingDir
                        joint.userData.raycasterTouchingDir = nnRayHitDirection
                    }
                    //this.colorFace(intersectObj, this.hlColTouch, null)
                */    
                    this.colorIndices(intersectObj.object, indices, this.hlColTouch)

                    //intersectObj.face.color.setHex(0x00ff00)
                    //intersectObj.object.geometry.colorsNeedUpdate = true   
            } else {
                /*
                // we're outside of touch range, but before dispatching untouch check if maybe the negative normal ray ist inside touch range
                let nnRayIsInsideTouchDir:Vector3 = this.nnRayIntersectsFaceAndIsInTouchRange(joint, raycaster, origin, intersectObj)
                if (nnRayIsInsideTouchDir) {
                    // we're in touch range with the newly intersected object / face after negative normal raycast check
                    // so we update the joint.userData ...
                    joint.userData.touchObj = intersectObj.object
                    joint.userData.touchFaceNormal = intersectObj.face.normal
                    joint.userData.touchFaceIndex = intersectObj.faceIndex

                    // ... we can also safely update raycasterTouchingDir
                    joint.userData.raycasterTouchingDir = nnRayIsInsideTouchDir
                    this.colorFace(intersectObj, this.hlColTouch, null)
                    //intersectObj.face.color.setHex(0x00ff00)
                    //intersectObj.object.geometry.colorsNeedUpdate = true
                }
                else {
                    */

                    //dispatch untouch!
                    console.log(logMessage, intersectObj.distance)
                    this.colorFace(intersectObj, this.hlColUnTouch, null)
                    //intersectObj.face.color.setHex(0x0000ff)
                    //intersectObj.object.geometry.colorsNeedUpdate = true
                    this.drawTentacles ? this.removeAllTentacles(joint) : null
                    this.resetJointTouchData(joint)
                    this.removeJointFromTouchingArray(hand, i)
                    this.dispatchUntouch(hand, joint, i, intersectObj)

                //}
            }
        }

        hlColTouch:Color = new Color(0x00ff00)
        hlColTouch2:Color = new Color(0xffff00)
        hlColUnTouch:Color = new Color(0x0000ff)
        hlColUnTouch2:Color = new Color(0xff00ff)
        hlColScratch:Color = new Color(0xc7c7c7)

        colorFace(intersected:{[key:string]:any}, color:Color, message:string) {
            console.log("XRHandTouch : colorFace! " + message)
            try {
            intersected.object.geometry.attributes.color.setXYZ( intersected.face.a, color.r, color.g, color.b )
            intersected.object.geometry.attributes.color.setXYZ( intersected.face.b, color.r, color.g, color.b )
            intersected.object.geometry.attributes.color.setXYZ( intersected.face.c, color.r, color.g, color.b )
            intersected.object.geometry.attributes.color.needsUpdate = true;
            } catch {
                debugger
            }
        }

        removeAllTentacles(joint:Group) {
            this.removeRaycasterTestTentacle(joint)
            this.removeRaycasterTouchingTentacle(joint)
            this.removeDirectionTentacle(joint)
        }

        /**
         * Checks if the the detected (intersected) face is also being intersected by the negative normal direction ray (from joint origin)
         * If so, a new direction is being returned 'testRaycasterDir' which will replace 'joint.userData.raycasterTouchingDir'
         */
        nnRayIntersectsFace(joint:Group, raycaster:Raycaster, origin:Vector3, intersectObj:{[key:string]: any}):Vector3 {

            // TODO  check one more time why we're doing this like this (normals) and write it down!
            let intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(intersectObj.object.matrixWorld)
            let testRaycasterDir:Vector3 = intersectObj.face.normal.clone().applyMatrix3(intersectedObjectNormalMatrixWorld).normalize().negate()

            let testRaycast = this.doRaycast(raycaster, origin, testRaycasterDir)
            this.drawTentacles ? this.showRaycasterTestTentacle(joint, origin, testRaycasterDir) : null

            if( testRaycast.length > 0 &&
                testRaycast[0].object === intersectObj.object &&
                testRaycast[0].faceIndex === intersectObj.faceIndex)
                {
                    return testRaycasterDir
                }
                                                    
            return undefined
        }

        nnRayIntersectsFaceAndIsInTouchRange(joint:Group, raycaster:Raycaster, origin:Vector3, intersectObj:{[key:string]: any}):Vector3 {

            // TODO  check one more time why we're doing this like this (normals) and write it down!
            let intersectedObjectNormalMatrixWorld: Matrix3 = new Matrix3().getNormalMatrix(intersectObj.object.matrixWorld)
            let testRaycasterDir:Vector3 = intersectObj.face.normal.clone().applyMatrix3(intersectedObjectNormalMatrixWorld).normalize().negate()

            let testRaycast = this.doRaycast(raycaster, origin, testRaycasterDir)
            this.drawTentacles ? this.showRaycasterTestTentacle(joint, origin, testRaycasterDir) : null
             
            let indices = this.checkSphereIntersection(joint, intersectObj.object)   

            if( testRaycast.length > 0 &&
                testRaycast[0].object === intersectObj.object &&
                testRaycast[0].faceIndex === intersectObj.faceIndex &&
                indices.length > 0)
                {
                    return testRaycasterDir
                }
                                                    
            return undefined
        }

        /**
         * Casts a ray into a given direction and returns the intersections object limted by 'far' parameter
         */ 
        doRaycast(raycaster:Raycaster, origin:Vector3, direction:Vector3, near:number = 0, far:number = 0.04 ): any[] {

            if(this.useBVH) {
                raycaster["firstHitOnly"] = true
            }
            
            raycaster.set(origin, direction)
            
            raycaster.near = near
            raycaster.far = far

            return raycaster.intersectObjects(this.toTest, true)
        }

        touchSphereRadius:number = 0.008

        // replaces distance to face check
        checkSphereIntersection(joint:Group, mesh:Mesh):number[] {
            console.log("checkSphereIntersection!")

            // this doesn't work!
            //this.touchSphere.set(joint.userData.origin, this.touchSphereRadius)
            this.touchSphere = new Sphere (joint.userData.origin, this.touchSphereRadius)

            /*
            if(this.doDebug && joint.userData.debugSphere) {
                joint.userData.debugSphere.position.copy(joint.userData.origin)
            }
            */

            //console.log("joint.userData.origin: ", joint.userData.origin)
            //console.log("this.touchSphere center", this.touchSphere.center)

            let bvh

            if(mesh.geometry['boundsTree']) {
                bvh = mesh.geometry['boundsTree']
                //console.log("has 'boundsTree', bvh: ", bvh)
            }

            //console.log("bvh: ", bvh)

            const indices: number[] = [];

            console.time("bvh.shapecast")
            if(bvh) {
                bvh.shapecast(
                    mesh,
                    box => this.touchSphere.intersectsBox( box.applyMatrix4(mesh.matrixWorld) ),
                    ( tri, a, b, c ) => {

                        tri.a.applyMatrix4(mesh.matrixWorld)
                        tri.b.applyMatrix4(mesh.matrixWorld)
                        tri.c.applyMatrix4(mesh.matrixWorld)
    
                        if ( sphereIntersectTriangle( this.touchSphere, tri ) ) {
                            indices.push( a, b, c );
                        }

                        return false
                    }
                )
            }
            console.timeEnd("bvh.shapecast")

            //console.log("indices: ", indices)
            
            return indices
        }

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

        /**
         * Casts a ray into a given direction and returns the intersections object limted by 'far' parameter
         */ 
        doRaycastObject(raycaster:Raycaster, origin:Vector3, direction:Vector3, obj:Object3D, near:number = 0, far:number = 0.04 ): any[] {

            if(this.useBVH) {
                raycaster["firstHitOnly"] = true
            }
            
            raycaster.set(origin, direction)
            
            raycaster.near = near
            raycaster.far = far

            return raycaster.intersectObject(obj, true)
        }

        resetJointTouchData(joint:Group) {
            joint.userData.touch = false
            joint.userData.touchInside = false
            joint.userData.touchObj = undefined
            joint.userData.touchFaceIndex = undefined
            joint.userData.touchFaceNormal = undefined
            joint.userData.raycasterTouchingDir = undefined
            joint.userData.lastTouchPoint = undefined
        }

        addJointToTouchingArray(hand:Group, i:number) {

            if(hand.userData.jointsTouching === undefined) {
                hand.userData.jointsTouching = []
            }

            if(hand.userData.jointsTouching.indexOf(i) < 0 ) {
                hand.userData.jointsTouching.push[i]
            }
        }

        removeJointFromTouchingArray(hand:Group, i:number) {
            if(hand.userData.jointsTouching.indexOf(i) > 0 ) {
                hand.userData.jointsTouching.splice(hand.userData.jointsTouching.indexOf(i), 1)
            }
        }

        dispatchUntouch(hand:Group, joint:Group, i:number, intersect:{[key:string]: any}) {
            hand.dispatchEvent({type: "untouch", detail: { joint: joint, jointIndex: i, intersect: intersect }})
            console.warn("HAND EVENT: untouch!")
        }

        dispatchTouch(hand:Group, joint:Group, i:number, intersect:{[key:string]: any}) {
            hand.dispatchEvent({type: "touch", detail: { joint: joint, jointIndex: i, intersect: intersect }})
            console.warn("HAND EVENT: touch!")
        }

        dispatchTouchThrough(hand:Group, joint:Group, i:number, intersects: {enter: {[key:string]: any}, exit: {[key:string]: any}}) {
            hand.dispatchEvent({type: "touchthrough", detail: { joint: joint, jointIndex: i, intersects: intersects }})
            console.warn("HAND EVENT: touchthrough!")
        }

        dispatchScratch(hand:Group, joint:Group, i:number, intersect:{[key:string]: any}) {
            hand.dispatchEvent({type: "scratch", detail: { joint: joint, jointIndex: i, intersect: intersect }})
            console.warn("HAND EVENT: scratch!")
        }

        removeTentacle(joint: Group, currentScene: Scene) {
            if (joint.userData.tentacle) {
                currentScene.remove(joint.userData.tentacle)
                joint.userData.tentacle.geometry.dispose()
                joint.userData.tentacle = undefined
            }
        }

        removeHandRayTentacle(hand: Group, currentScene: Scene) {
            if (hand.userData.tentacle) {
                currentScene.remove(hand.userData.tentacle)
                hand.userData.tentacle.geometry.dispose()
                hand.userData.tentacle = undefined
            }
        }

        addTentacle(
            joint: Group,
            origin: Vector3,
            target: Vector3,
            currentScene: Scene,
            touching: boolean,
            isNormalRay: boolean = false
        ) {
            let lineGeom = new BufferGeometry().setFromPoints([origin, target])

            if (!touching) {
                joint.userData.tentacle = new Line(lineGeom, this.tentacleMat)
            } else {
                if (!isNormalRay) {
                    joint.userData.tentacle = new Line(
                        lineGeom,
                        this.tentacleTouchMat
                    )
                } else {
                    joint.userData.tentacle = new Line(
                        lineGeom,
                        this.tentacleNormalRayMat
                    )
                }
            }

            if (joint.userData.tentacle.parent !== currentScene) {
                currentScene.add(joint.userData.tentacle)
            }
        }

        addHandRayTentacle(
            hand: Group,
            origin: Vector3,
            target: Vector3,
            currentScene: Scene
        ) {
            let lineGeom = new BufferGeometry().setFromPoints([origin, target])
            hand.userData.tentacle = new Line(lineGeom, this.tentacleMat)

            if (hand.userData.tentacle.parent !== currentScene) {
                currentScene.add(hand.userData.tentacle)
            }
        }

        getJointMesh(hand:Group, joint:Group, i:number): Mesh {
            let jointMesh:Mesh

            if( hand.children[25].children.length > 0) {
                        
                if(hand.children[25].children[0].children.length > 2) {   

                    jointMesh = hand.children[25].children[0].children[ this.tip[i] ] as Mesh
                
                    /*
                    if (!joint.userData.hasDebugMaterial) {
                        joint.userData.hasDebugMaterial = true
                        jointMesh.material = this.jointMat.clone()
                    }
                    */

                    return jointMesh
                }
            }

            return undefined
        }

        getTipOriginOffset(handedness:string): number {
            let tipOriginOffset:number = 0

            // set tips offset for oculus hands to feel more natural
            handedness === "left" ? tipOriginOffset = 0.005*-1 : null
            handedness === "right" ? tipOriginOffset = 0.005 : null

            return tipOriginOffset
        }

        getJointOrigin(joint:Group, jointIndex:number, handProfile:string, handedness:string): Vector3 {
            let origin: Vector3 = new Vector3().setFromMatrixPosition(joint.matrixWorld)

            if(handProfile === "oculus" && this.tip.indexOf(jointIndex) > -1) {
                let tipOriginOffset:number = this.getTipOriginOffset(handedness)
                origin = new Vector3(tipOriginOffset, 0, 0).applyMatrix4(joint.matrixWorld)
            }

            return origin
        }

        getJointDirection(joint:Group, currentOrigin:Vector3, lerpFactor:number = 0): Vector3 {

            let realDir = new Vector3().subVectors(currentOrigin, joint.userData.origin).normalize()

            if(lerpFactor > 0) {
                let lerpedDir = new Vector3().lerpVectors(
                    joint.userData.direction,
                    realDir,
                    lerpFactor
                ).normalize()

                return lerpedDir
            }
            
            return realDir
        }

        /**
        * calculate joint speedFactor
        * How to calculate speed? Distance from last to new position / time delta
        * Speed near to zero would have to return speedFac near 1. the greater the speed, the greater the speedFac.
        */
        calculateSpeedFac(joint:Group, currentOrigin:Vector3, xrFrameDelta:number): number {
            let speedFac:number = 0

            if(joint.userData.origin) {
                let jointDistance: number = joint.userData.origin.distanceTo(currentOrigin)
                let jointSpeed: number = jointDistance / xrFrameDelta
                //speedFac = 1 + jointSpeed*2000 // no "untouch" intersection at very fast exits
                speedFac = 1 + jointSpeed*2500 // no "untouch" intersection at very fast exits
                //speedFac = 1 + jointSpeed*3000 // 
            }
            
            return speedFac
        }

        // deprectated

        /*
        getHandDirection(hand:Group) {
            let handDirOrigin1: Vector3 = new Vector3().setFromMatrixPosition(
                hand.children[10].matrixWorld
            )

            let handDirOrigin2: Vector3 = new Vector3().setFromMatrixPosition(
                hand.children[11].matrixWorld
            )

            return new Vector3().lerpVectors(
                handDirOrigin1,
                handDirOrigin2,
                0.5
            )
        }
        */
       
    }
