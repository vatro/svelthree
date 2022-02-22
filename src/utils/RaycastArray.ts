import type { Object3D } from "three"
import type { RaycastableSvelthreeComponents } from "../types-extra"

class RaycastArray_Base extends Array {
   public head_path?: string[] | undefined = undefined
   public index_prop: string | undefined = undefined
   public dirty: boolean = false

   constructor(...args: any[]) {
      super(...args)
   }

   push(...to_check_intersection: (Object3D | RaycastableSvelthreeComponents)[]): number {
      super.push(...to_check_intersection)
      this.process_to_check_intersection()
      this.set_index_prop()
      this.dirty = true
      return this.length
   }

   splice(start: number, deleteCount?: number): any[] {
      super.splice(start, deleteCount)
      this.set_index_prop()
      this.dirty = true
      return this
   }

   // replace component references with three.js object instances created by the component 
   process_to_check_intersection() {
      for (let i = 0; i < this.length; i++) {
         if (this[i]["is_svelthree_component"]) {
            this[i] = this[i].get_instance()
         }
      }
   }

   set_index_prop() {
      for (let i = 0; i < this.length; i++) {
         let prop_head: any

         if (this.head_path?.length) {
            prop_head = this[i][this.head_path[0]]

            let j = 1
            while (j < this.head_path.length) {
               prop_head = prop_head[this.head_path[j]]
               j++
            }
         }

         if (prop_head && this.index_prop) {
            prop_head[this.index_prop] = i
         }
      }
   }
}


class RaycastArray extends RaycastArray_Base {
   constructor(public index_prop: string = "index_in_raycast", public head_path: string[] = ["userData"]) {
      super()
   }
}

export { RaycastArray }