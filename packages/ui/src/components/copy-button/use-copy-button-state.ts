'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { announce } from '../../core'

type CopyStateOptions = {
	value: string
	/**
	 * Milliseconds before the "copied" flag resets.
	 * @defaultValue 2000
	 */
	timeout?: number
	onCopiedChange?: (copied: boolean) => void
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
 * Clipboard API is swallowed and leaves `copied` false. Success is announced via
 * a live region because screen readers skip label changes on an already-focused
 * control. `onCopiedChange` is read through a ref, so swapping the callback does
 * not restart the revert timer.
 * @internal
 */
export function useCopyButtonState({
	value,
	timeout = 2000,
	onCopiedChange,
}: CopyStateOptions): CopyStateResult {
	const [copied, setCopied] = useState(false)

	const onCopiedChangeRef = useRef(onCopiedChange)

	useEffect(() => {
		onCopiedChangeRef.current = onCopiedChange
	})

	const copy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value)

			setCopied(true)

			// Screen readers skip label changes on an already-focused control; announce success explicitly.
			announce('Copied')

			onCopiedChangeRef.current?.(true)
		} catch {
			// Clipboard write failed (denied permission, insecure context, or missing API);
			// `copied` stays false.
		}
	}, [value])

	useEffect(() => {
		if (!copied) return

		const timer = setTimeout(() => {
			setCopied(false)

			onCopiedChangeRef.current?.(false)
		}, timeout)

		return () => clearTimeout(timer)
	}, [copied, timeout])

	return { copied, copy }
}
