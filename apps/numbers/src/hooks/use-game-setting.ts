'use client'

import { useSyncExternalStore } from 'react'
import { readCookie, writeCookie } from 'ui/core'
import { useServerSettings } from '../components/game-settings'
import { type GameSettings, parseSetting, SETTINGS } from '../utilities/settings'

// The cookie holds each setting, and the server and the browser read it. A
// cookie write fires no event, so a write also puts a copy in `localStorage`
// under the name of the cookie. The `storage` event of that copy tells the
// other tabs, as the appearance choices of `ui` do.

/** The listeners of the settings in this tab. */
const listeners = new Set<() => void>()

/** Subscribes to the settings: a write in this tab, and a write in another tab (`storage`). */
function subscribe(listener: () => void): () => void {
	listeners.add(listener)

	window.addEventListener('storage', listener)

	return () => {
		listeners.delete(listener)

		window.removeEventListener('storage', listener)
	}
}

/**
 * The setting of `name`, and its setter. The server render and the hydration
 * have the setting of the cookie of the request ({@link useServerSettings}),
 * and the browser reads the same cookie. A write keeps the setting in the
 * cookie and tells each reader in each tab.
 */
export function useGameSetting(name: keyof GameSettings): [boolean, (on: boolean) => void] {
	const server = useServerSettings()[name]

	const { cookie } = SETTINGS[name]

	const value = useSyncExternalStore(
		subscribe,
		() => parseSetting(name, readCookie(cookie)),
		() => server,
	)

	const write = (on: boolean) => {
		const raw = on ? 'on' : 'off'

		writeCookie(cookie, raw)

		// A storage that refuses the write leaves the other tabs on the old
		// value until their next render. The cookie still holds the setting.
		try {
			window.localStorage.setItem(cookie, raw)
		} catch {}

		for (const listener of listeners) listener()
	}

	return [value, write]
}
