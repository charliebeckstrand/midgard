'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Manages overlay behavior: escape to close, click-outside to close, body scroll lock.
 * Used by Dialog, Alert, Dropdown, Listbox, Combobox, MobileSidebar.
 */
export function useOverlay(
	open: boolean,
	onClose: () => void,
	options: { scrollLock?: boolean } = {},
) {
	const containerRef = useRef<HTMLDivElement>(null)

	const stableClose = useCallback(() => onClose(), [onClose])

	useEffect(() => {
		if (!open) return

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') stableClose()
		}

		function onPointerDown(e: PointerEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				stableClose()
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
	}, [open, stableClose, options.scrollLock])

	return containerRef
}
