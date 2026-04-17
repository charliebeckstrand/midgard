'use client'

import { useCallback, useEffect, useRef } from 'react'

/** Overlay dismiss behavior — Escape to close, click-outside to close, optional scroll lock. */
export function useOverlay(
	open: boolean,
	onOpenChange: (open: boolean) => void,
	options: { scrollLock?: boolean } = {},
) {
	const containerRef = useRef<HTMLDivElement>(null)

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	useEffect(() => {
		if (!open) return

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') close()
		}

		function onPointerDown(e: PointerEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				close()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('pointerdown', onPointerDown)

		if (options.scrollLock) {
			document.body.style.overflow = 'hidden'
		}

		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('pointerdown', onPointerDown)

			if (options.scrollLock) {
				document.body.style.overflow = ''
			}
		}
	}, [open, close, options.scrollLock])

	return containerRef
}
