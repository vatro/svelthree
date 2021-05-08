import type { Writable } from "svelte/store"
import {writable} from 'svelte/store'

export const svelthreeStores: Writable<any[]> = writable([])