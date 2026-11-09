'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import type { Election } from '../elections/registry'
import { type DrawerStep, drawerHref, readDrawerStep } from '../utilities/elections-url'

/**
 * The history entries that the Drawer wrote since it last opened: the address
 * of the page from before the open, then the address of each move. `position`
 * is the entry that the reader is on.
 *
 * The record is in memory, not in `history.state`, because a refresh of the
 * Next router writes a new state over the entry. A reload clears the record.
 */
const entries: { addresses: string[]; position: number } = { addresses: [], position: 0 }

/** The address of the current entry, as the record holds it. */
function currentAddress(): string {
	return `${window.location.pathname}${window.location.search}`
}

// Back and Forward move the position by one entry. A move to an entry that the
// record does not hold, such as a page before the open, clears the record.
if (typeof window !== 'undefined') {
	window.addEventListener('popstate', () => {
		const address = currentAddress()

		if (entries.addresses[entries.position - 1] === address) entries.position -= 1
		else if (entries.addresses[entries.position + 1] === address) entries.position += 1
		else entries.addresses = []
	})
}

/** The listeners of the address, which a move of the Drawer calls. */
const listeners = new Set<() => void>()

/**
 * Subscribes to the address: a move of the Drawer, and Back or Forward
 * (`popstate`), for `useSyncExternalStore`.
 */
function subscribe(listener: () => void): () => void {
	listeners.add(listener)

	window.addEventListener('popstate', listener)

	return () => {
		listeners.delete(listener)

		window.removeEventListener('popstate', listener)
	}
}

/** Tells each listener that the Drawer wrote the address. */
function emit(): void {
	for (const listener of listeners) listener()
}

/** The address of the server render and of the hydration: none, so the step comes from the router. */
function noAddress(): null {
	return null
}

/**
 * The query of the step. The address of the browser gives it while its path is
 * the path of the router. Else, the router gives it, as on the server, at the
 * hydration, and while a navigation to another page renders.
 */
function stepQuery(address: string | null, pathname: string, params: URLSearchParams): string {
	if (address === null) return params.toString()

	const mark = address.indexOf('?')

	const path = mark === -1 ? address : address.slice(0, mark)

	if (path !== pathname) return params.toString()

	return mark === -1 ? '' : address.slice(mark + 1)
}

/** Moves the Drawer to a step, or closes it with `null`. */
export type DrawerGo = (step: DrawerStep | null) => void

/**
 * The way to move the Drawer of an election, with no read of its step. A part
 * of the page that only opens the Drawer, such as a card of a race, takes this
 * hook and not {@link useDrawerStep}, so a move of the Drawer does not render it
 * again.
 *
 * A move reads the step from the address of the browser when it runs. The
 * Drawer follows that address at once (see {@link useDrawerStep}), so the step
 * that a move reads is the step that shows.
 *
 * Each move is a history entry, so Back walks the trail of the Drawer and then
 * closes it. A move to the current step writes no entry. A move writes the
 * address in place, with no navigation: the page under the Drawer stays as it
 * is, and the Drawer reads what it needs.
 *
 * A close goes back to the entry from before the Drawer opened, so Back after
 * a close leaves the page and does not open the Drawer again. Where that entry
 * is not known, such as on a page that loaded with the Drawer open, the close
 * writes the closed address over the current entry.
 *
 * @returns A function that moves the Drawer to a step, or closes it with `null`.
 */
export function useDrawerGo(election: Election): DrawerGo {
	const pathname = usePathname()

	return (next) => {
		const step = readDrawerStep(election, new URLSearchParams(window.location.search))

		const known = entries.addresses[entries.position] === currentAddress()

		if (next === null) {
			if (known && entries.position > 0) {
				window.history.go(-entries.position)
			} else {
				window.history.replaceState(null, '', drawerHref(pathname, null))

				emit()
			}

			return
		}

		const address = drawerHref(pathname, next)

		if (step !== null && address === drawerHref(pathname, step)) return

		// An open from a closed Drawer starts the record at the page. A move
		// inside a Drawer that the record does not know keeps no record.
		if (step === null) {
			entries.addresses = [currentAddress()]

			entries.position = 0
		} else if (!known) {
			entries.addresses = []
		}

		if (entries.addresses.length > 0) {
			// A move drops the entries after the position, as the browser does.
			entries.addresses = [...entries.addresses.slice(0, entries.position + 1), address]

			entries.position += 1
		}

		window.history.pushState(null, '', address)

		emit()
	}
}

/**
 * The step of the Drawer of an election, which the address holds, and the way
 * to move it ({@link useDrawerGo}). The address is the one source, so a reload
 * opens the Drawer on the same step.
 *
 * The step follows the address of the browser at once, not the search params
 * of the router. The router applies a change of the address in a transition,
 * and a transition waits for each router request in flight, such as the
 * refresh of a live page, which can take seconds on a phone. A Drawer that
 * followed the router thus stayed open after a close, or closed after an
 * open, until the request completed. The router still takes each change, so a
 * later refresh reads the step of the address on the server.
 *
 * Each move renders each reader of the step again. A part of the page that
 * only moves the Drawer takes {@link useDrawerGo}.
 *
 * @returns The step, or `null` for a closed Drawer, and a function that moves
 * the Drawer to a step, or closes it with `null`.
 */
export function useDrawerStep(election: Election): {
	step: DrawerStep | null
	go: DrawerGo
} {
	const pathname = usePathname()

	const params = useSearchParams()

	const browserAddress = useSyncExternalStore(subscribe, currentAddress, noAddress)

	const query = stepQuery(browserAddress, pathname, params)

	const step = readDrawerStep(election, new URLSearchParams(query))

	const go = useDrawerGo(election)

	return { step, go }
}
