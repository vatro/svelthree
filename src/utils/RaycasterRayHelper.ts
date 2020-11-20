
    import {
        Line,
        LineDashedMaterial,
        BufferGeometry,
        Vector3,
        Scene,
        Color
    } from "svelthree-three"

    export class RaycasterRayHelper {
        rayLineRMat: LineDashedMaterial
        rayLineRGeom: BufferGeometry
        rayLineR: Line

        rayLineRMat_pinch: LineDashedMaterial
        rayLineRGeom_pinch: BufferGeometry
        rayLineR_pinch: Line

        rayLineLMat: LineDashedMaterial
        rayLineLGeom: BufferGeometry
        rayLineL: Line

        rayLineLMat_pinch: LineDashedMaterial
        rayLineLGeom_pinch: BufferGeometry
        rayLineL_pinch: Line

        constructor() {
            // R
            this.rayLineRMat = new LineDashedMaterial({
                color: 0x9ae6b4,
                linewidth: 3,
                scale: 1,
                dashSize: 0.01,
                gapSize: 0.01
            })

            this.rayLineRGeom = new BufferGeometry().setFromPoints([
                new Vector3(0, 0, 0),
                new Vector3(0, 0, 0)
            ])

            this.rayLineR = new Line(this.rayLineRGeom, this.rayLineRMat)

            // L
            this.rayLineLMat = new LineDashedMaterial({
                color: 0x9ae6b4,
                linewidth: 3,
                scale: 1,
                dashSize: 0.01,
                gapSize: 0.01
            })

            this.rayLineLGeom = new BufferGeometry().setFromPoints([
                new Vector3(0, 0, 0),
                new Vector3(0, 0, 0)
            ])

            this.rayLineL = new Line(this.rayLineLGeom, this.rayLineLMat)


            this.rayLineRMat_pinch = new LineDashedMaterial({
                color: 0x9ae6b4,
                linewidth: 3,
                scale: 1,
                dashSize: 0.01,
                gapSize: 0.01
            })

            this.rayLineRGeom_pinch = new BufferGeometry().setFromPoints([
                new Vector3(0, 0, 0),
                new Vector3(0, 0, 0)
            ])

            this.rayLineR_pinch = new Line(this.rayLineRGeom_pinch, this.rayLineRMat_pinch)

            this.rayLineLMat_pinch = new LineDashedMaterial({
                color: 0x9ae6b4,
                linewidth: 3,
                scale: 1,
                dashSize: 0.01,
                gapSize: 0.01
            })

            this.rayLineLGeom_pinch = new BufferGeometry().setFromPoints([
                new Vector3(0, 0, 0),
                new Vector3(0, 0, 0)
            ])

            this.rayLineL_pinch = new Line(this.rayLineLGeom_pinch, this.rayLineLMat_pinch)
        }

        showPinchFw(
            origin: Vector3,
            direction: Vector3,
            currentScene: Scene,
            scale: number,
            color:number = 0x9ae6b4,
            handedness:string
        ): void {
            let checkPoint = origin.clone()
            checkPoint.add(direction.multiplyScalar(scale))
            
            if(handedness === "left") {
                if (this.rayLineL_pinch.parent === currentScene) {
                currentScene.remove(this.rayLineL_pinch)
                }
            
                this.rayLineLGeom_pinch.dispose()

                this.rayLineLGeom_pinch = new BufferGeometry().setFromPoints([
                    origin,
                    checkPoint
                ])

                this.rayLineLMat_pinch.color.setHex(color)
                //this.rayLineMat.needsUpdate = true

                this.rayLineL_pinch = new Line(this.rayLineLGeom_pinch, this.rayLineLMat_pinch)
                this.rayLineL_pinch.name = "rayline_pinch"
                this.rayLineL_pinch.computeLineDistances()

                if (this.rayLineL_pinch.parent !== currentScene) {
                    currentScene.add(this.rayLineL_pinch)
                }            
            }

            if(handedness === "right") {
                if (this.rayLineR_pinch.parent === currentScene) {
                currentScene.remove(this.rayLineR_pinch)
                }
            
                this.rayLineRGeom_pinch.dispose()

                this.rayLineRGeom_pinch = new BufferGeometry().setFromPoints([
                    origin,
                    checkPoint
                ])

                this.rayLineRMat_pinch.color.setHex(color)
                //this.rayLineMat.needsUpdate = true

                this.rayLineR_pinch = new Line(this.rayLineRGeom_pinch, this.rayLineRMat_pinch)
                this.rayLineR_pinch.name = "rayline_pinch"
                this.rayLineR_pinch.computeLineDistances()

                if (this.rayLineR_pinch.parent !== currentScene) {
                    currentScene.add(this.rayLineR_pinch)
                }            
            }
            
        }

        showPinchRay(
            rayData: {
                origin: Vector3,
                direction: Vector3,
                currentScene: Scene,
                scale: number
            },
            pinchRayMaterial:XRHandPinchRayMaterial,
            pinchRayColor:number,
            handedness:string
        ): void {
            let linePoint = rayData.origin.clone()
            linePoint.add(rayData.direction.multiplyScalar(rayData.scale))
            
            if(handedness === "left") {
                if (this.rayLineL_pinch.parent === rayData.currentScene) {
                    rayData.currentScene.remove(this.rayLineL_pinch)
                }
            
                this.rayLineLGeom_pinch.dispose()

                this.rayLineLGeom_pinch = new BufferGeometry().setFromPoints([
                    rayData.origin,
                    linePoint
                ])

                pinchRayMaterial.color.setHex(pinchRayColor)
                //this.rayLineMat.needsUpdate = true

                this.rayLineL_pinch = new Line(this.rayLineLGeom_pinch, pinchRayMaterial)
                this.rayLineL_pinch.name = "pinch_ray_left"

                if( pinchRayMaterial instanceof LineDashedMaterial ) {} { this.rayLineL_pinch.computeLineDistances() }

                if (this.rayLineL_pinch.parent !== rayData.currentScene) {
                    rayData.currentScene.add(this.rayLineL_pinch)
                }            
            }

            if(handedness === "right") {
                if (this.rayLineR_pinch.parent === rayData.currentScene) {
                    rayData.currentScene.remove(this.rayLineR_pinch)
                }
            
                this.rayLineRGeom_pinch.dispose()

                this.rayLineRGeom_pinch = new BufferGeometry().setFromPoints([
                    rayData.origin,
                    linePoint
                ])

                pinchRayMaterial.color.setHex(pinchRayColor)
                //this.rayLineMat.needsUpdate = true

                this.rayLineR_pinch = new Line(this.rayLineRGeom_pinch, pinchRayMaterial)
                this.rayLineR_pinch.name = "pinch_ray_right"

                if( pinchRayMaterial instanceof LineDashedMaterial ) {} { this.rayLineR_pinch.computeLineDistances() }

                if (this.rayLineR_pinch.parent !== rayData.currentScene) {
                    rayData.currentScene.add(this.rayLineR_pinch)
                }            
            }
            
        }

        showPinch(
            origin: Vector3,
            direction: Vector3,
            currentScene: Scene,
            scale: number,
            color:number = 0x9ae6b4,
            handedness:string
        ): void {
            let checkPoint = origin.clone()
            checkPoint.add(direction.multiplyScalar(scale))

            
            if(handedness === "left") {
                if (this.rayLineL_pinch.parent === currentScene) {
                currentScene.remove(this.rayLineL_pinch)
                }
            
                this.rayLineLGeom_pinch.dispose()

                this.rayLineLGeom_pinch = new BufferGeometry().setFromPoints([
                    origin,
                    checkPoint
                ])

                this.rayLineLMat.color.setHex(color)
                //this.rayLineMat.needsUpdate = true

                this.rayLineL_pinch = new Line(this.rayLineLGeom_pinch, this.rayLineLMat_pinch)
                this.rayLineL_pinch.name = "rayline_pinch"
                this.rayLineL_pinch.computeLineDistances()

                if (this.rayLineL_pinch.parent !== currentScene) {
                    currentScene.add(this.rayLineL_pinch)
                }            
            }

            if(handedness === "right") {
                if (this.rayLineR_pinch.parent === currentScene) {
                currentScene.remove(this.rayLineR_pinch)
                }
            
                this.rayLineRGeom_pinch.dispose()

                this.rayLineRGeom_pinch = new BufferGeometry().setFromPoints([
                    origin,
                    checkPoint
                ])

                this.rayLineRMat_pinch.color.setHex(color)
                //this.rayLineMat.needsUpdate = true

                this.rayLineR = new Line(this.rayLineRGeom_pinch, this.rayLineRMat_pinch)
                this.rayLineR_pinch.name = "rayline_pinch"
                this.rayLineR_pinch.computeLineDistances()

                if (this.rayLineR_pinch.parent !== currentScene) {
                    currentScene.add(this.rayLineR_pinch)
                }            
            }
        }

        show(
            origin: Vector3,
            direction: Vector3,
            currentScene: Scene,
            scale: number,
            color:number = 0x9ae6b4,
            handedness:string
        ): void {
            let checkPoint = origin.clone()
            checkPoint.add(direction.multiplyScalar(scale))

            
            if(handedness === "left") {
                if (this.rayLineL.parent === currentScene) {
                currentScene.remove(this.rayLineL)
                }
            
                this.rayLineLGeom.dispose()

                this.rayLineLGeom = new BufferGeometry().setFromPoints([
                    origin,
                    checkPoint
                ])

                this.rayLineLMat.color.setHex(color)
                //this.rayLineMat.needsUpdate = true

                this.rayLineL = new Line(this.rayLineLGeom, this.rayLineLMat)
                this.rayLineL.name = "rayline"
                this.rayLineL.computeLineDistances()

                if (this.rayLineL.parent !== currentScene) {
                    currentScene.add(this.rayLineL)
                }            
            }

            if(handedness === "right") {
                if (this.rayLineR.parent === currentScene) {
                currentScene.remove(this.rayLineR)
                }
            
                this.rayLineRGeom.dispose()

                this.rayLineRGeom = new BufferGeometry().setFromPoints([
                    origin,
                    checkPoint
                ])

                this.rayLineRMat.color.setHex(color)
                //this.rayLineMat.needsUpdate = true

                this.rayLineR = new Line(this.rayLineRGeom, this.rayLineRMat)
                this.rayLineR.name = "rayline"
                this.rayLineR.computeLineDistances()

                if (this.rayLineR.parent !== currentScene) {
                    currentScene.add(this.rayLineR)
                }            
            }
            
        }
    }