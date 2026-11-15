'use client'

import { useSyncExternalStore } from 'react'

/*
 * The Auto-draw setting. It is in `localStorage`, so it stays for the next
 * visit on this device. The server cannot read it, so the server render and
 * the hydration have the setting off, and the page reads it after the
 * hydration. The setting changes no layout, so the first paint is the final
 * layout (CONVENTIONS §3.13).
 */

/** The `localStorage` key of the setting. */
const KEY = 'numbers:auto-draw'

/** The listeners of the setting in this tab. */
const listeners = new Set<() => void>()

/** Reads the setting. A storage that refuses the read gives the setting off. */
function readAutoDraw(): boolean {
	try {
		return window.localStorage.getItem(KEY) === 'on'
	} catch {
		return false
	}
}

/** The setting of the server render and of the hydration: off. */
function readServer(): boolean {
	return false
}

/** Subscribes to the setting: a write in this tab, and a write in another tab (`storage`). */
function subscribe(listener: () => void): () => void {
	listeners.add(listener)

	window.addEventListener('storage', listener)

	return () => {
		listeners.delete(listener)

		window.removeEventListener('storage', listener)
	}
}

/** Writes the setting and tells each reader. A storage that refuses the write keeps the old setting. */
function writeAutoDraw(on: boolean): void {
	try {
		window.localStorage.setItem(KEY, on ? 'on' : 'off')
	} catch {
		return
	}

	for (const listener of listeners) listener()
}

/** The Auto-draw setting, and its setter. The setting is off on the server and at the hydration. */
export function useAutoDraw(): [boolean, (on: boolean) => void] {
	return [useSyncExternalStore(subscribe, readAutoDraw, readServer), writeAutoDraw]
}
