'use client'

import { useCallback, useRef, useState } from 'react'
import { announce } from '../../core'
import { useMountedRef } from '../../hooks/use-mounted-ref'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useTimeout } from '../../hooks/use-timeout'

// The longest delay that the platform timer holds: a 32-bit signed count of
// milliseconds. The timer wraps a longer delay to 32 bits, and `Infinity`
// becomes 0. The timer then fires early, often at once.
const MAX_TIMEOUT = 2 ** 31 - 1

type CopyStateOptions = {
	/** Text written to the clipboard by `copy`. */
	text: string
	/**
	 * Milliseconds before the "copied" flag resets.
	 *
	 * A value above 2^31−1, `Infinity` included, clamps to 2^31−1. Each copy
	 * reads the value. A change while the copied state holds applies to the next copy.
	 * @defaultValue 2000
	 */
	timeout?: number
	/** Fires on each change of the copied state, with the new `copied` value. */
	onCopiedChange?: (copied: boolean) => void
	/** Fires when the clipboard write rejects, with whatever the platform threw. */
	onCopyError?: (error: unknown) => void
}

type CopyStateResult = {
	/** True for `timeout` milliseconds after a copy succeeds. */
	copied: boolean
	/** Writes `text` to the clipboard. On success, it sets `copied`. */
	copy: () => Promise<void>
}

/**
 * Drives the transient copied state behind {@link CopyButton}: writes `text` to
 * the clipboard, flags success for `timeout` ms, then reverts. Use it to give
 * a control other than `CopyButton` the same copied state, such as a `Button`
 * with a text label that shows "Copy" and then "Copied" in green.
 *
 * @returns `{ copied, copy }` — `copied` is the current success flag; `copy`
 * writes to the clipboard and, on success, raises the flag and starts the revert
 * timer.
 * @remarks
 * `copy` rejects nothing: a denied permission, insecure context, or missing
 * Clipboard API leaves `copied` false and reaches `onCopyError` instead. Success
 * is announced via a live region because screen readers skip label changes on an
 * already-focused control. Both callbacks are raised through effect events, so
 * swapping one neither restarts the revert timer nor leaves a copy mid-flight
 * calling the previous one.
 *
 * A call to `copy` while a write is in flight, or while the copied state
 * holds, does nothing. Thus the window announces and reports `true` one time,
 * and a control with a text label acts as `CopyButton` does. The transitions end
 * at unmount. A write that resolves after the unmount does not raise the flag,
 * announce, or call `onCopiedChange`. No callback runs at unmount, so a `true`
 * that the consumer saw gets no `false`.
 * @example
 * ```tsx
 * const { copied, copy } = useCopyButtonState({ text })
 *
 * <Button variant="soft" color={copied ? 'green' : undefined} onClick={() => void copy()}>
 *   {copied ? 'Copied' : 'Copy'}
 * </Button>
 * ```
 */
export function useCopyButtonState({
	text,
	timeout = 2000,
	onCopiedChange,
	onCopyError,
}: CopyStateOptions): CopyStateResult {
	const [copied, setCopied] = useState(false)

	const notifyCopiedChange = useStableEvent((next: boolean) => {
		onCopiedChange?.(next)
	})

	const notifyCopyError = useStableEvent((error: unknown) => {
		onCopyError?.(error)
	})

	// Whether the component is mounted. A write that resolves after the unmount
	// changes nothing and announces nothing.
	const mountedRef = useMountedRef()

	// Whether a write is in flight or the copied state holds. The copied state
	// turns true only after the write, so it cannot stop a second call during the
	// write. A ref, because two clicks can come before the next render. A failed
	// write clears the flag, and the revert of the copied state clears it after a
	// success. The React Compiler does not compile a `finally` clause.
	const busyRef = useRef(false)

	// The revert timer. The unmount clears it.
	const revert = useTimeout()

	const copy = useCallback(async () => {
		if (busyRef.current) return

		busyRef.current = true

		try {
			await navigator.clipboard.writeText(text)

			if (!mountedRef.current) return

			setCopied(true)

			// Screen readers skip label changes on an already-focused control; announce success explicitly.
			announce('Copied')

			notifyCopiedChange(true)

			revert.set(
				() => {
					busyRef.current = false

					setCopied(false)

					notifyCopiedChange(false)
				},
				Math.min(timeout, MAX_TIMEOUT),
			)
		} catch (error) {
			busyRef.current = false

			// Clipboard write failed (denied permission, insecure context, or missing API);
			// `copied` stays false and the rejection goes to the caller instead of nowhere.
			notifyCopyError(error)
		}
	}, [text, timeout, notifyCopiedChange, notifyCopyError, mountedRef, revert])

	return { copied, copy }
}
