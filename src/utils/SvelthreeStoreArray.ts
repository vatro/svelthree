class SvelthreeStoreArray_Base extends Array {
    public head_path?: string[] | undefined = undefined
    public index_prop: string | undefined = undefined
 
    constructor(...args: any[]) {
       super(...args)
    }
 
    push(...items: any[]): number {
       super.push(...items)
       this.set_index_prop()
       return this.length
    }
 
    splice(start: number, deleteCount?: number): any[] {
       super.splice(start, deleteCount)
       this.set_index_prop()
       return this
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
 
 class SvelthreeStoreArray extends SvelthreeStoreArray_Base {
    constructor(public index_prop: string, public head_path?: string[]) {
       super()
    }
 }

 export { SvelthreeStoreArray }