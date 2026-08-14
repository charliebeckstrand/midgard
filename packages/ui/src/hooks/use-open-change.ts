'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

/**
 * Reports a surface's open state once per transition, read from the committed value
 * rather than from the call that asked for it.
 *
 * A surface needs this where the flag is derived, or is written from routes the surface
 * never runs itself. `useControllable` fires on every set, including sets a controlled
 * value then overrides, and a setter handed out raw takes calls that leave the flag where
 * it already was — both report transitions the reader never saw. Reading what landed
 * reports what the reader saw, whichever route drove it.
 *
 * A flag with one call site does not need this. There the call site is the transition,
 * and the report rides it directly.
 *
 * @param open The committed open state.
 * @param onOpenChange The caller's callback, raised once per transition.
 * @remarks The ref seeds from the mount value, so mounting open announces nothing — the
 * contract the panel family's `onOpenChange` already keeps. Suppressing that first run is
 * the ref's whole job: the `open` dependency already holds the effect back on a render
 * that leaves the flag alone.
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
