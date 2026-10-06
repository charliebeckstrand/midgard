'use client'

import { useCallback, useEffect, useState } from 'react'
import { announce } from '../../core'
import { useStableEvent } from '../../hooks/use-stable-event'

type CopyStateOptions = {
	/** Text written to the clipboard by `copy`. */
	text: string
	/**
	 * Milliseconds before the "copied" flag resets.
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

	const copy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(text)

			setCopied(true)

			// Screen readers skip label changes on an already-focused control; announce success explicitly.
			announce('Copied')

			notifyCopiedChange(true)
		} catch (error) {
			// Clipboard write failed (denied permission, insecure context, or missing API);
			// `copied` stays false and the rejection goes to the caller instead of nowhere.
			notifyCopyError(error)
		}
	}, [text, notifyCopiedChange, notifyCopyError])

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
