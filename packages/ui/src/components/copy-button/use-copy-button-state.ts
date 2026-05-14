import { useCallback, useEffect, useRef, useState } from 'react'

export type UseCopyStateOptions = {
	value: string
	/** Milliseconds before the "copied" flag resets. @default 2000 */
	timeout?: number
	onCopiedChange?: (copied: boolean) => void
}

export type UseCopyStateResult = {
	isCopied: boolean
	copy: () => Promise<void>
}

export function useCopyButtonState({
	value,
	timeout = 2000,
	onCopiedChange,
}: UseCopyStateOptions): UseCopyStateResult {
	const [isCopied, setIsCopied] = useState(false)

	const onCopiedChangeRef = useRef(onCopiedChange)

	useEffect(() => {
		onCopiedChangeRef.current = onCopiedChange
	})

	const copy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value)

			setIsCopied(true)

			onCopiedChangeRef.current?.(true)
		} catch {
			// Clipboard write failed (denied permission, insecure context, missing
			// API). Don't flip into the success state — the button must not lie.
		}
	}, [value])

	useEffect(() => {
		if (!isCopied) return

		const timer = setTimeout(() => {
			setIsCopied(false)
			onCopiedChangeRef.current?.(false)
		}, timeout)

		return () => clearTimeout(timer)
	}, [isCopied, timeout])

	return { isCopied, copy }
}
