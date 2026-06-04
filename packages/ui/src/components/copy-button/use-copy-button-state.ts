'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnnounce } from '../../hooks'

type UseCopyStateOptions = {
	value: string
	/** Milliseconds before the "copied" flag resets. @default 2000 */
	timeout?: number
	onCopiedChange?: (copied: boolean) => void
}

type UseCopyStateResult = {
	copied: boolean
	copy: () => Promise<void>
}

export function useCopyButtonState({
	value,
	timeout = 2000,
	onCopiedChange,
}: UseCopyStateOptions): UseCopyStateResult {
	const [copied, setCopied] = useState(false)

	const announce = useAnnounce()

	const onCopiedChangeRef = useRef(onCopiedChange)

	useEffect(() => {
		onCopiedChangeRef.current = onCopiedChange
	})

	const copy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value)

			setCopied(true)

			// The button's aria-label flips to "Copied", but a label change on an
			// already-focused control isn't announced — surface success explicitly.
			announce('Copied')

			onCopiedChangeRef.current?.(true)
		} catch {
			// Clipboard write failed (denied permission, insecure context, missing
			// API). Don't flip into the success state — the button must not lie.
		}
	}, [value, announce])

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
