'use client'

import { useSyncExternalStore } from 'react'

/**
 * Whether the server runs a new build, which `LiveRefresh` finds after a
 * deploy. The flag is for this document: a reload loads the new build, and
 * the flag starts again off.
 */
let newBuild = false

/** The readers of the flag in this document. */
const listeners = new Set<() => void>()

/** Sets the flag, and tells each reader. `LiveRefresh` calls it. */
export function markNewBuild(): void {
	if (newBuild) return

	newBuild = true

	for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}

/** The server and the hydration render have no new build. */
const serverSnapshot = () => false

/**
 * Whether the server runs a new build. The page then cannot take new data, and
 * a reload loads the new build. A page can show a link that reloads it.
 */
export function useNewBuild(): boolean {
	return useSyncExternalStore(subscribe, () => newBuild, serverSnapshot)
}
