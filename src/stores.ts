import type { Writable } from "svelte/store"
import { writable } from "svelte/store"
import type { StoreBody } from "./types-extra"

export const svelthreeStores: Writable<StoreBody[]> = writable([])
