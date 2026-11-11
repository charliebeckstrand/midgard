'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

/*
 * The address of the browser, for the parts of an election that move without
 * a navigation: the Drawer and the office switch. Each writes the address in
 * place (`history.pushState`), and the page follows that address at once.
 *
 * The router takes each change of the address too, but it applies the change
 * in a transition. A transition waits for each router request in flight, such
 * as a refresh or the read of a page, which can take seconds on a phone. Thus
 * the page follows the browser, not the router, while the router is behind.
 */

/** The listeners of the address, which a write and Back or Forward call. */
const listeners = new Set<() => void>()

/** The path of the router that the page last showed. */
let routerPath: string | null = null

/**
 * The last path that a write or Back or Forward gave the browser, and the path
 * of the router at that time. While the router stays at `from`, the browser
 * leads it. It is `null` once the router comes to `path`.
 */
let lead: { from: string; path: string } | null = null

/** The address of the browser: its path and its search. */
export function readAddress(): string {
	return `${window.location.pathname}${window.location.search}`
}

/** The address of the server render and of the hydration: none, so the router gives the path. */
function noAddress(): null {
	return null
}

// Back and Forward move the browser to an entry, and the router follows later.
if (typeof window !== 'undefined') {
	window.addEventListener('popstate', () => {
		if (routerPath !== null) lead = { from: routerPath, path: window.location.pathname }
	})
}

/**
 * Subscribes to the address: a write, and Back or Forward (`popstate`), for
 * `useSyncExternalStore`.
 */
function subscribe(listener: () => void): () => void {
	listeners.add(listener)

	window.addEventListener('popstate', listener)

	return () => {
		listeners.delete(listener)

		window.removeEventListener('popstate', listener)
	}
}

/** Tells each listener that the address changed. */
function emit(): void {
	for (const listener of listeners) listener()
}

/**
 * Writes an address in place, with no navigation, and tells each reader.
 *
 * @param address - The path and the search to write.
 * @param mode - `push` adds a history entry; `replace` writes over the current entry.
 */
export function writeAddress(address: string, mode: 'push' | 'replace'): void {
	const path = address.split('?')[0] ?? address

	if (routerPath !== null && path !== window.location.pathname) lead = { from: routerPath, path }

	if (mode === 'push') window.history.pushState(null, '', address)
	else window.history.replaceState(null, '', address)

	emit()
}

/**
 * Whether the browser leads the router: the browser is at the path of the
 * router, or the router stays at the path that it had when the browser moved.
 * Else, the router moved after the browser, as a navigation to another page
 * does, and the router gives the page.
 *
 * @param path - The path of the browser.
 * @param pathname - The path of the router.
 */
export function addressLeads(path: string, pathname: string): boolean {
	return path === pathname || (lead !== null && lead.from === pathname && lead.path === path)
}

/**
 * The address of the browser, or `null` on the server and at the hydration,
 * and the path of the router. Each write and each Back or Forward renders the
 * reader again at once.
 */
export function useAddress(): { address: string | null; pathname: string } {
	const pathname = usePathname()

	const address = useSyncExternalStore(subscribe, readAddress, noAddress)

	useEffect(() => {
		routerPath = pathname

		if (lead?.path === pathname) lead = null
	}, [pathname])

	return { address, pathname }
}

/**
 * The path that the page shows, and the path of the router. The page shows
 * the path of the browser while it leads the router (see {@link addressLeads}),
 * else the path of the router.
 */
export function useAddressPath(): { path: string; pathname: string } {
	const { address, pathname } = useAddress()

	const path = address === null ? pathname : (address.split('?')[0] ?? address)

	return { path: addressLeads(path, pathname) ? path : pathname, pathname }
}
