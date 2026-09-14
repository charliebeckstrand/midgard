'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

/**
 * Reports a committed value once per change, read from the value the surface settled on
 * rather than from the call that asked for it.
 *
 * A value with one call site does not need this: there the call site is the transition,
 * and the report rides it directly. Reach for this where the value is derived, or is
 * written from routes the surface never runs itself — each caller names its own.
 *
 * @param value The committed value.
 * @param onChange The caller's callback, raised once per change.
 * @param isSame Compares the reported value with the next one. Defaults to `Object.is`.
 * Pass one where the value is rebuilt each render, so identity moves and the content does
 * not.
 * @remarks The ref seeds from the mount value, so a surface that mounts in a reported
 * state announces nothing — the contract the panel family's `onOpenChange` already keeps.
 * Suppressing that first run is the ref's whole job.
 *
 * The comparison sits inside the effect event rather than beside the effect, so the
 * dependency array stays `[value]` whatever `isSame` closes over.
 * @internal
 */
export function useReportedChange<T>(
	value: T,
	onChange?: (value: T) => void,
	isSame: (a: T, b: T) => boolean = Object.is,
): void {
	const reportedRef = useRef(value)

	const report = useEffectEvent((next: T) => {
		if (isSame(reportedRef.current, next)) return

		reportedRef.current = next

		onChange?.(next)
	})

	useEffect(() => {
		report(value)
	}, [value])
}
