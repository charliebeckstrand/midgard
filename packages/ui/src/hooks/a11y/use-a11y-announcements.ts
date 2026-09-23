'use client'

import { useEffect, useRef } from 'react'
import { announce } from '../../core'

/** Options for {@link useA11yAnnouncements}. */
export type A11yAnnouncementsOptions = {
	/** Announce assertively (interrupts the user) rather than politely. @defaultValue false */
	assertive?: boolean
	/** Gate announcing without unmounting the hook. @defaultValue true */
	enabled?: boolean
}

/**
 * Declaratively narrates a changing message to the live-region announcer. Pass
 * the current human-readable status: a result count, the active sort, the
 * current page. It speaks whenever that string changes, skipping the initial
 * value and consecutive duplicates. An empty message speaks nothing, but it
 * ends a run of duplicates: a status that clears and comes back is spoken again.
 *
 * The imperative `announce` underneath fires a message at a moment of the
 * caller's choosing. This hook owns the watch-and-dedupe wiring, so a widget
 * declares *what* its status is rather than *when* to speak it. Needs no
 * provider; the announcer creates its live region on demand.
 */
export function useA11yAnnouncements(
	message: string | null | undefined,
	{ assertive = false, enabled = true }: A11yAnnouncementsOptions = {},
): void {
	// Baselined at the first message; only subsequent changes announce.
	const previous = useRef(message)

	useEffect(() => {
		if (!enabled) return

		// The baseline records an empty message too, so a status that clears and comes back is
		// spoken again.
		const last = previous.current

		previous.current = message

		if (!message || message === last) return

		announce(message, { assertive })
	}, [message, enabled, assertive])
}
