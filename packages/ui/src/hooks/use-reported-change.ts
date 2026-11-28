'use client'

import { useEffect, useRef } from 'react'
import { useStableEvent } from './use-stable-event'

/**
 * Reports a committed value once per change, read from the value the surface settled on
 * rather than from the call that asked for it.
 *
 * A value with one call site does not need this: there the call site is the transition,
 * and the report rides it directly. Reach for this where the value is derived, or is
 * written from routes the surface never runs itself. Each caller names its own.
 *
 * @param value - The committed value.
 * @param onChange - The caller's callback, raised once per change.
 * @param isSame - Compares the reported value with the next one. Defaults to `Object.is`.
 * Pass one where the value is rebuilt each render, so identity moves and the content does
 * not.
 * @remarks The ref seeds from the mount value, so a surface that mounts in a reported
 * state announces nothing. That is the contract the panel family's `onOpenChange` already keeps.
 * Suppressing that first run is the ref's whole job.
 *
 * The comparison sits inside the stable event of {@link useReportedChangeEvent}, so the
 * effect lists only `value` and the stable report, whatever `isSame` closes over.
 * @internal
 */
export function useReportedChange<T>(
	value: T,
	onChange?: (value: T) => void,
	isSame: (a: T, b: T) => boolean = Object.is,
): void {
	const report = useReportedChangeEvent(value, onChange, isSame)

	useEffect(() => {
		report(value)
	}, [value, report])
}

/**
 * Gives a report that raises `onChange` only for a value that differs from the
 * last one it raised. The first value it compares with is `initial`, the value
 * that the consumer knows at mount.
 *
 * @remarks Use it where the surface reports from the call that changes the
 * value, not from a committed value ({@link useReportedChange}). Call the report
 * in an event or an effect, never during render.
 *
 * @param initial - The value that the consumer knows at mount.
 * @param onChange - The caller's callback.
 * @param isSame - Compares the last reported value with the next one. Defaults to
 * `Object.is`.
 * @returns A stable function that reports `next` when it is new.
 * @internal
 */
export function useReportedChangeEvent<T>(
	initial: T,
	onChange?: (value: T) => void,
	isSame: (a: T, b: T) => boolean = Object.is,
): (next: T) => void {
	const reportedRef = useRef(initial)

	return useStableEvent((next: T) => {
		if (isSame(reportedRef.current, next)) return

		reportedRef.current = next

		onChange?.(next)
	})
}
