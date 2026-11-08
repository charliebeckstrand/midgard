'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import type { Election } from '../elections/registry'
import { type DrawerStep, drawerHref, readDrawerStep } from '../utilities/elections-url'

/**
 * The step of the Drawer of an election, which the address holds, and the way
 * to move it. The address is the one source, so a reload opens the Drawer on
 * the same step.
 *
 * Each move is a history entry, so Back walks the trail of the Drawer and then
 * closes it. A move writes the address in place, with no navigation: the page
 * under the Drawer stays as it is, and the Drawer reads what it needs.
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

	return {
		step: readDrawerStep(election, params),
		go: (next) => window.history.pushState(null, '', drawerHref(pathname, next)),
	}
}
