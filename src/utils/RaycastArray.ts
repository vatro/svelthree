import type { Object3D } from "three"
import type { AnySvelthreeComponent } from "../types-extra"

class RaycastArray_Base extends Array {

   constructor(...args: any[]) {
      super(...args)
   }

   push(...to_check_intersection: (Object3D | AnySvelthreeComponent)[]): number {
      super.push(...arguments)
      this.process_to_check_intersection()
      return this.length
   }

   process_to_check_intersection() {
      for (let i = 0; i < this.length; i++) {
         if (this[i]["is_svelthree_component"]) {
            this[i] = this[i].get_instance()
         }
      }
   }
}


class RaycastArray extends RaycastArray_Base {
   constructor(...to_check_intersection: (Object3D | AnySvelthreeComponent)[]) {
      super()
   }
}

export { RaycastArray }