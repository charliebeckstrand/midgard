import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import type { StepperOrientation } from './context'

/**
 * Roving focus handler for Stepper. Navigates between enabled step buttons
 * with arrow keys (matched to `orientation`), Home, and End. Disabled steps
 * — e.g. upcoming steps in linear mode — are skipped automatically because
 * `:disabled` buttons can't receive focus.
 *
 * Manual activation: arrows only move focus. Enter/Space activate the focused
 * button through native `<button>` semantics.
 */
export function useKeyboard(
	containerRef: RefObject<HTMLElement | null>,
	orientation: StepperOrientation,
) {
	return useCallback(
		(e: KeyboardEvent) => {
			const container = containerRef.current

			if (!container) return

			const items = Array.from(
				container.querySelectorAll<HTMLButtonElement>(
					'button[data-slot="stepper-step"]:not(:disabled)',
				),
			)

			const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)

			if (currentIndex === -1) return

			const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
			const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'

			let nextIndex: number | undefined

			switch (e.key) {
				case nextKey:
					nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
					break
				case prevKey:
					nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
					break
				case 'Home':
					nextIndex = 0
					break
				case 'End':
					nextIndex = items.length - 1
					break
				default:
					return
			}

			e.preventDefault()

			items[nextIndex]?.focus()
		},
		[containerRef, orientation],
	)
}
