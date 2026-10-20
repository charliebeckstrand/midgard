import { noop } from '../../../utilities/noop'
import type { EventStorage } from './types'

// The storage of the events: the guarded reads and writes, and the key of
// the capture, which the store writes and the pre-paint script reads.

/** The `sessionStorage` key of the capture that runs. */
export const CAPTURE_KEY = 'events:capture'

/** A storage that keeps nothing. */
const NONE: EventStorage = { getItem: () => null, setItem: noop, removeItem: noop }

/** The storage that `get` gives, or a storage that keeps nothing where the read of the property throws. */
export function getStorage(get: () => EventStorage): EventStorage {
	try {
		return get()
	} catch {
		return NONE
	}
}

/** Reads a value. Storage access can throw, such as with site data off, and the read then gives `null`. */
export function readStorage(storage: EventStorage, name: string): string | null {
	try {
		return storage.getItem(name)
	} catch {
		return null
	}
}

/** Writes a value, or removes it for `null`, and returns whether the write ends. */
export function writeStorage(storage: EventStorage, name: string, value: string | null): boolean {
	try {
		if (value === null) storage.removeItem(name)
		else storage.setItem(name, value)

		return true
	} catch {
		return false
	}
}
