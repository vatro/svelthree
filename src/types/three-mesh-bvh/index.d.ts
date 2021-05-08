declare module "three-mesh-bvh" {
	export function computeBoundsTree(options: { [key: string]: any }): any // MeshBVH
	export function disposeBoundsTree(): void
	export function acceleratedRaycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void
}
