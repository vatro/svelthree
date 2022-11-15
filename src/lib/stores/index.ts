import { writable } from "svelte/store"
import type { Writable } from "svelte/store"
import type { StoreBody } from "../types/types-extra"

//export const svelthreeStores: Writable<(StoreBody | null)[]> = writable([])
export const svelthreeStores: Writable<StoreBody[]> = writable([])
