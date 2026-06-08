'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { announce } from '../../core'

type CopyStateOptions = {
	value: string
	/** Milliseconds before the "copied" flag resets. @default 2000 */
	timeout?: number
	onCopiedChange?: (copied: boolean) => void
}

type CopyStateResult = {
	copied: boolean
	copy: () => Promise<void>
}

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

			// A label change on an already-focused control isn't announced; surface success explicitly.
			announce('Copied')

			onCopiedChangeRef.current?.(true)
		} catch {
			// Clipboard write failed (denied permission, insecure context, or missing API);
			// the copied state is not set.
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
