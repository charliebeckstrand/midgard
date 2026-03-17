'use client'

import type React from 'react'
import { type RefObject, useCallback } from 'react'

/**
 * Keyboard navigation for menu items.
 *
 * @param orientation - `'vertical'` uses ArrowUp/ArrowDown (default), `'horizontal'` uses ArrowLeft/ArrowRight.
 */
export function useMenuKeyboard(
	containerRef: RefObject<HTMLElement | null>,
	selector: string,
	orientation: 'vertical' | 'horizontal' = 'vertical',
) {
	return useCallback(
		(e: React.KeyboardEvent) => {
			const container = containerRef.current
			if (!container) return

			const items = Array.from(container.querySelectorAll<HTMLElement>(selector))
			const currentIndex = items.indexOf(document.activeElement as HTMLElement)

			const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
			const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'

			switch (e.key) {
				case nextKey: {
					e.preventDefault()
					const next =
						currentIndex === -1 ? 0 : currentIndex < items.length - 1 ? currentIndex + 1 : 0
					items[next]?.focus()
					break
				}
				case prevKey: {
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
		[containerRef, selector, orientation],
	)
}
