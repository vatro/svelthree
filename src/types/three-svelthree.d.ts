//import { Face3, Vector2, Vector3 } from "svelthree-three"
/*
/**
 * @see https://threejs.org/docs/#api/en/core/Raycaster.intersectObject
 * distance – distance between the origin of the ray and the intersection
 * point – point of intersection, in world coordinates
 * face – intersected face
 * faceIndex – index of the intersected face
 * object – the intersected object
 * uv - U,V coordinates at point of intersection
 * uv2 - Second set of U,V coordinates at point of intersection
 * instanceId – The index number of the instance where the ray intersects the InstancedMesh
 *
 */

declare type RaycasterIntersectObject = {
    distance: number
    point: THREE.Vector3
    face: THREE.Face3
    faceIndex: number
    object: THREE.Object3D
    uv: THREE.Vector2
    uv2: THREE.Vector2
    instanceId: number
}

type Object3DProps = {
    position?: THREE.Vector3 | Parameters<THREE.Vector3["set"]> | number[]
    up?: THREE.Vector3
    scale?: THREE.Vector3
    rotation?: THREE.Euler | Parameters<THREE.Euler["set"]> | [number, number, number]
    matrix?: THREE.Matrix4
    quaternion?: THREE.Quaternion
    layers?: THREE.Layers
    //dispose?: (() => void) | null;
}
