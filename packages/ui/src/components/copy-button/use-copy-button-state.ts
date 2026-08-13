'use client'

import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { announce } from '../../core'

type CopyStateOptions = {
	value: string
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
 * Drives the transient copied state behind {@link CopyButton}: writes `value` to
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
 * @internal
 */
export function useCopyButtonState({
	value,
	timeout = 2000,
	onCopiedChange,
	onCopyError,
}: CopyStateOptions): CopyStateResult {
	const [copied, setCopied] = useState(false)

	const notifyCopiedChange = useEffectEvent((next: boolean) => {
		onCopiedChange?.(next)
	})

	const notifyCopyError = useEffectEvent((error: unknown) => {
		onCopyError?.(error)
	})

	const copy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value)

			setCopied(true)

			// Screen readers skip label changes on an already-focused control; announce success explicitly.
			announce('Copied')

			notifyCopiedChange(true)
		} catch (error) {
			// Clipboard write failed (denied permission, insecure context, or missing API);
			// `copied` stays false and the rejection goes to the caller instead of nowhere.
			notifyCopyError(error)
		}
	}, [value])

	useEffect(() => {
		if (!copied) return

		const timer = setTimeout(() => {
			setCopied(false)

			notifyCopiedChange(false)
		}, timeout)

		return () => clearTimeout(timer)
	}, [copied, timeout])

	return { copied, copy }
}
