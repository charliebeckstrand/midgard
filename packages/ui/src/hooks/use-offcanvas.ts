'use client'

import { useCallback, useEffect, useState } from 'react'
import { useOpenChange } from './use-open-change'

type OffcanvasOptions = {
	/**
	 * Fires when the panel opens or closes, whatever drove it: a trigger, a dismissal,
	 * `close`, or the viewport crossing `--breakpoint-lg`.
	 */
	onOpenChange?: (open: boolean) => void
}

/**
 * Manages offcanvas sidebar state: open/close plus auto-close
 * when the viewport crosses the `--breakpoint-lg` threshold.
 *
 * @param options `onOpenChange`, reported on every transition of the open flag.
 * @remarks Reads `--breakpoint-lg` off the document element; if the token is
 * undefined the auto-close listener is skipped.
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

	useEffect(() => {
		const breakpoint = getComputedStyle(document.documentElement)
			.getPropertyValue('--breakpoint-lg')
			.trim()

		// Bail when the design token is undefined; `matchMedia('(min-width: )')`
		// is an invalid query that never fires.
		if (!breakpoint) return

		const mql = window.matchMedia(`(min-width: ${breakpoint})`)

		const handler = () => {
			if (mql.matches) setOpen(false)
		}

		mql.addEventListener('change', handler)

		return () => mql.removeEventListener('change', handler)
	}, [])

	return { open, setOpen, close }
}
