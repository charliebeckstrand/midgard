import type { EventStorage } from '../../modules/events/engine/types'

/** A `sessionStorage` in memory. A new store on the same storage is a reload of the tab. */
export function createStorage(): EventStorage {
	const items = new Map<string, string>()

	return {
		getItem: (key) => items.get(key) ?? null,
		setItem: (key, value) => {
			items.set(key, value)
		},
		removeItem: (key) => {
			items.delete(key)
		},
	}
}

/** A storage that keeps nothing. */
export const noStorage: EventStorage = {
	getItem: () => null,
	setItem: () => undefined,
	removeItem: () => undefined,
}
