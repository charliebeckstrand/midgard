'use client'

import { useEffect, useRef } from 'react'
import { announce } from '../../core'

export type A11yAnnouncementsOptions = {
	/** Announce assertively (interrupts the user) rather than politely. @default false */
	assertive?: boolean
	/** Gate announcing without unmounting the hook. @default true */
	enabled?: boolean
}

/**
 * Declaratively narrates a changing message to the live-region announcer. Pass
 * the current human-readable status — a result count, the active sort, the
 * current page — and it speaks whenever that string changes, skipping the
 * initial value and consecutive duplicates so a fresh mount stays quiet and
 * only genuine changes reach assistive tech.
 *
 * The imperative `announce` underneath fires a message at a moment of the
 * caller's choosing; this hook owns the watch-and-dedupe wiring, so a widget
 * declares *what* its status is rather than *when* to speak it. Needs no
 * provider — the announcer's live region is created on demand.
 */
export function useA11yAnnouncements(
	message: string | null | undefined,
	{ assertive = false, enabled = true }: A11yAnnouncementsOptions = {},
): void {
	// Baseline at the first message so the initial render stays silent; only
	// later changes announce.
	const previous = useRef(message)

	useEffect(() => {
		if (!enabled) return

		if (!message || message === previous.current) return

		previous.current = message

		announce(message, { assertive })
	}, [message, enabled, assertive])
}
