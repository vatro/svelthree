import type { RaycastArrayInput, RaycastArrayOutput } from "../types/types-extra.js"

class RaycastArray_Base extends Array {
	public head_path: string[] = ["userData"]
	public index_prop = "index_in_raycast"
	public dirty = false

	/*eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }]*/
	constructor(...args: any[]) {
		super(...args)
	}

	push(...to_check_intersection: RaycastArrayInput): number {
		super.push(...to_check_intersection)
		this.process_to_check_intersection()
		this.set_index_prop()
		this.dirty = true
		return this.length
	}

	splice(start: number, deleteCount?: number): RaycastArrayOutput {
		super.splice(start, deleteCount)
		this.set_index_prop()
		this.dirty = true
		return this
	}

	// replace component references with three.js object instances created by the component
	process_to_check_intersection(): void {
		for (let i = 0; i < this.length; i++) {
			if (this[i]["is_svelthree_component"]) {
				this[i] = this[i].get_instance()
			}
		}
	}

	set_index_prop(): void {
		for (let i = 0; i < this.length; i++) {
			this[i][this.head_path[0]][this.index_prop] = i
		}
	}
}

class RaycastArray extends RaycastArray_Base {
	constructor() {
		super()
	}
}

export { RaycastArray }
