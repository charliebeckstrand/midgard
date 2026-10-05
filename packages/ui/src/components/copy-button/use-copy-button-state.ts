'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { announce } from '../../core'
import { useMountedRef } from '../../hooks/use-mounted-ref'
import { useStableEvent } from '../../hooks/use-stable-event'

type CopyStateOptions = {
	text: string
	/**
	 * Milliseconds before the "copied" flag resets.
	 * @defaultValue 2000
	 */
	timeout?: number
	onCopiedChange?: (copied: boolean) => void
	onCopyError?: (error: unknown) => void
}

type CopyStateResult = {
	copied: boolean
	copy: () => Promise<void>
}

/**
 * Drives the transient copied state behind {@link CopyButton}: writes `text` to
 * the clipboard, flags success for `timeout` ms, then reverts.
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
 * A call to `copy` while a write is in flight does nothing. The transitions end
 * at unmount. A write that resolves after the unmount does not raise the flag,
 * announce, or call `onCopiedChange`. No callback runs at unmount, so a `true`
 * that the consumer saw gets no `false`.
 * @internal
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

	// Whether a write is in flight. The copied state turns true only after the
	// write, so it cannot stop a second call during the write. A ref, because two
	// clicks can come before the next render. The React Compiler does not compile
	// a `finally` clause, so each path clears the flag.
	const writingRef = useRef(false)

	const copy = useCallback(async () => {
		if (writingRef.current) return

		writingRef.current = true

		try {
			await navigator.clipboard.writeText(text)

			writingRef.current = false

			if (!mountedRef.current) return

			setCopied(true)

			// Screen readers skip label changes on an already-focused control; announce success explicitly.
			announce('Copied')

			notifyCopiedChange(true)
		} catch (error) {
			writingRef.current = false

			// Clipboard write failed (denied permission, insecure context, or missing API);
			// `copied` stays false and the rejection goes to the caller instead of nowhere.
			notifyCopyError(error)
		}
	}, [text, notifyCopiedChange, notifyCopyError, mountedRef])

	useEffect(() => {
		if (!copied) return

		const timer = setTimeout(() => {
			setCopied(false)

			notifyCopiedChange(false)
		}, timeout)

		return () => clearTimeout(timer)
	}, [copied, timeout, notifyCopiedChange])

	return { copied, copy }
}
