'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

/**
 * Reports a surface's open state once per transition, read from the committed value
 * rather than from the call that asked for it.
 *
 * A flag with one call site does not need this: there the call site is the transition,
 * and the report rides it directly. Reach for this where the flag is derived, or is
 * written from routes the surface never runs itself — each caller names its own.
 *
 * @param open The committed open state.
 * @param onOpenChange The caller's callback, raised once per transition.
 * @remarks The ref seeds from the mount value, so mounting open announces nothing — the
 * contract the panel family's `onOpenChange` already keeps. Suppressing that first run is
 * the ref's whole job.
 * @internal
 */
export function useOpenChange(open: boolean, onOpenChange?: (open: boolean) => void): void {
	const notifyOpenChange = useEffectEvent((next: boolean) => {
		onOpenChange?.(next)
	})

	const prevOpenRef = useRef(open)

	useEffect(() => {
		if (prevOpenRef.current === open) return

		prevOpenRef.current = open

		notifyOpenChange(open)
	}, [open])
}
