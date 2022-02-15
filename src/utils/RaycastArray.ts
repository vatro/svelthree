import type { Object3D } from "three"
import type { RaycastableSvelthreeComponents } from "../types-extra"

class RaycastArray_Base extends Array {

   constructor(...args: any[]) {
      super(...args)
   }

   push(...to_check_intersection: (Object3D | RaycastableSvelthreeComponents)[]): number {
      super.push(...to_check_intersection)
      this.process_to_check_intersection()
      return this.length
   }

   // replace component references with three.js object instances created by the component 
   process_to_check_intersection() {
      for (let i = 0; i < this.length; i++) {
         if (this[i]["is_svelthree_component"]) {
            this[i] = this[i].get_instance()
         }
      }
   }
}


class RaycastArray extends RaycastArray_Base {
   public to_check_intersection: (Object3D | RaycastableSvelthreeComponents)[]
   constructor(...to_check_intersection: (Object3D | RaycastableSvelthreeComponents)[]) {
      super()
      this.to_check_intersection = to_check_intersection
   }
}

export { RaycastArray }