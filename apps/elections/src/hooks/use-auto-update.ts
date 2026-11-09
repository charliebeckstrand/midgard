'use client'

import { useSyncExternalStore } from 'react'

/**
 * The Auto update setting of the reader. While it is on, a page of an election
 * reads the results again each minute while votes are counted. It is on by
 * default. The setting is in `localStorage`, so it stays for the next visit. It
 * changes no part of the first paint, so the server does not read it, and it
 * has no copy in a cookie.
 */

/** The `localStorage` key of the setting. The key holds `0` while the setting is off. */
const STORAGE_KEY = 'elections:auto-update'

/** The listeners of this tab. */
const listeners = new Set<() => void>()

/** Whether the setting is on. The setting is on where the storage throws, such as with site data off. */
function readAutoUpdate(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) !== '0'
	} catch {
		return true
	}
}

/** Turns the setting on or off, and tells each reader in this tab. */
export function setAutoUpdate(on: boolean): void {
	try {
		if (on) localStorage.removeItem(STORAGE_KEY)
		else localStorage.setItem(STORAGE_KEY, '0')
	} catch {
		// The storage throws, such as with site data off. The setting then stays on.
	}

	for (const listener of listeners) listener()
}

/** Calls `listener` on each change of the setting, in this tab or in another tab. */
function subscribe(listener: () => void): () => void {
	listeners.add(listener)

	// A `storage` event tells of a write in another tab. A `null` key is a clear of the storage.
	const onStorage = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY || event.key === null) listener()
	}

	window.addEventListener('storage', onStorage)

	return () => {
		listeners.delete(listener)

		window.removeEventListener('storage', onStorage)
	}
}

/** The server and the hydration render take the default, which is on. */
const serverSnapshot = () => true

/** Whether the Auto update setting is on. A change of the setting renders the caller again. */
export function useAutoUpdate(): boolean {
	return useSyncExternalStore(subscribe, readAutoUpdate, serverSnapshot)
}
