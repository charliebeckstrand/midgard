'use client'

import { useCallback, useEffect, useState } from 'react'
import { BREAKPOINT_WIDTHS } from '../types/responsive'
import { matchesMediaQuery, subscribeMediaQuery } from '../utilities/media-query'
import { useOpenChange } from './use-open-change'

/** Options for {@link useOffcanvas}: the open-state binding the offcanvas panel reads. */
export type OffcanvasOptions = {
	/**
	 * Fires when the panel opens or closes, whatever drove it: a trigger, a dismissal,
	 * `close`, or the viewport widening to the `lg` breakpoint.
	 */
	onOpenChange?: (open: boolean) => void
}

/** The query that matches from the `lg` breakpoint up, where the panel is always in view. */
const DESKTOP_QUERY = `(min-width: ${BREAKPOINT_WIDTHS.lg})`

/**
 * Manages offcanvas sidebar state: open/close plus auto-close
 * when the viewport widens to the `lg` breakpoint.
 *
 * @param options `onOpenChange`, reported on every transition of the open flag.
 * @remarks The breakpoint comes from {@link BREAKPOINT_WIDTHS}, the same scale as
 * the `lg:` prefix and `useMinBreakpoint`.
 * @returns `{ open, setOpen, close }` — the open flag, its setter, and a
 * memoized `close` convenience.
 */
export function useOffcanvas({ onOpenChange }: OffcanvasOptions = {}) {
	const [open, setOpen] = useState(false)

	const close = useCallback(() => setOpen(false), [])

	// Watched rather than wrapped around the setter: the auto-close below fires on every
	// crossing into desktop width, whether or not the panel was open, and `setOpen` is
	// handed out raw for callers to drive.
	useOpenChange(open, onOpenChange)

	useEffect(
		() =>
			subscribeMediaQuery(DESKTOP_QUERY, () => {
				if (matchesMediaQuery(DESKTOP_QUERY)) setOpen(false)
			}),
		[],
	)

	return { open, setOpen, close }
}
