'use client'

import type React from 'react'
import { type RefObject, useCallback } from 'react'

/**
 * Keyboard navigation for menu items (ArrowDown, ArrowUp, Home, End).
 */
export function useMenuKeyboard(containerRef: RefObject<HTMLElement | null>, selector: string) {
	return useCallback(
		(e: React.KeyboardEvent) => {
			const container = containerRef.current
			if (!container) return

			const items = Array.from(container.querySelectorAll<HTMLElement>(selector))
			const currentIndex = items.indexOf(document.activeElement as HTMLElement)

			switch (e.key) {
				case 'ArrowDown': {
					e.preventDefault()
					const next =
						currentIndex === -1 ? 0 : currentIndex < items.length - 1 ? currentIndex + 1 : 0
					items[next]?.focus()
					break
				}
				case 'ArrowUp': {
					e.preventDefault()
					const prev =
						currentIndex === -1
							? items.length - 1
							: currentIndex > 0
								? currentIndex - 1
								: items.length - 1
					items[prev]?.focus()
					break
				}
				case 'Home': {
					e.preventDefault()
					items[0]?.focus()
					break
				}
				case 'End': {
					e.preventDefault()
					items[items.length - 1]?.focus()
					break
				}
			}
		},
		[containerRef, selector],
	)
}
