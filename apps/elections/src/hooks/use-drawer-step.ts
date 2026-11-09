'use client'

import { usePathname, useSearchParams } from 'next/navigation'
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

/**
 * The step of the Drawer of an election, which the address holds, and the way
 * to move it. The address is the one source, so a reload opens the Drawer on
 * the same step.
 *
 * Each move is a history entry, so Back walks the trail of the Drawer and then
 * closes it. A move to the current step writes no entry. A move writes the address in place, with no navigation: the page
 * under the Drawer stays as it is, and the Drawer reads what it needs.
 *
 * A close goes back to the entry from before the Drawer opened, so Back after
 * a close leaves the page and does not open the Drawer again. Where that entry
 * is not known, such as on a page that loaded with the Drawer open, the close
 * writes the closed address over the current entry.
 *
 * @returns The step, or `null` for a closed Drawer, and a function that moves
 * the Drawer to a step, or closes it with `null`.
 */
export function useDrawerStep(election: Election): {
	step: DrawerStep | null
	go: (step: DrawerStep | null) => void
} {
	const pathname = usePathname()

	const params = useSearchParams()

	const step = readDrawerStep(election, params)

	return {
		step,
		go: (next) => {
			const known = entries.addresses[entries.position] === currentAddress()

			if (next === null) {
				if (known && entries.position > 0) window.history.go(-entries.position)
				else window.history.replaceState(null, '', drawerHref(pathname, null))

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
		},
	}
}
