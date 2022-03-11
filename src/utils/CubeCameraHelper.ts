import type { CubeCamera, Object3D, PerspectiveCamera, Scene } from "three"
import { CameraHelper } from "three"

export default class CubeCameraHelper {
	private allHelpers: CameraHelper[] = []

	constructor(camera: CubeCamera) {
		this.allHelpers = this.createHelpers(camera)
	}

	private createHelpers(camera: CubeCamera): CameraHelper[] {
		let all: CameraHelper[] = []
		for (let i = 0; i < camera.children.length; i++) {
			let pc: PerspectiveCamera = (camera.children as PerspectiveCamera[])[i]
			let helper = new CameraHelper(pc)
			all.push(helper)
		}
		return all
	}

	public add(scene: Scene): void {
		for (let i = 0; i < this.allHelpers.length; i++) {
			const helper = this.allHelpers[i]
			if (helper.parent !== scene) scene.add(helper)
		}
	}

	public remove(): void {
		for (let i = 0; i < this.allHelpers.length; i++) {
			const helper = this.allHelpers[i]
			if (helper.parent as Object3D) helper.parent.remove(helper)
		}
	}
}
