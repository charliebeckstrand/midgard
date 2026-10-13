// @vitest-environment node
import type { ClientRect } from '@dnd-kit/core'
import { describe, expect, it } from 'vitest'
import { horizontalRtlSortingStrategy } from '../../hooks/use-sortable-list'

/**
 * In a right-to-left row the first item is at the right edge. Items of
 * different widths make room for the dragged item by its width, toward the
 * inline start, and the dragged item lands on the far edge of its target.
 */
describe('horizontalRtlSortingStrategy', () => {
	// Widths 100, 50, and 80, from the right edge at 1000.
	const rect = (left: number, width: number): ClientRect => ({
		left,
		right: left + width,
		width,
		top: 0,
		bottom: 20,
		height: 20,
	})

	const rects = [rect(900, 100), rect(850, 50), rect(770, 80)]

	const shift = (index: number) =>
		horizontalRtlSortingStrategy({
			rects,
			activeNodeRect: rects[0] ?? null,
			activeIndex: 0,
			overIndex: 2,
			index,
		})?.x

	it('moves each item between by the width of the dragged item, toward the right', () => {
		expect(shift(1)).toBe(100)

		expect(shift(2)).toBe(100)
	})

	it('moves the dragged item to the left edge of its target', () => {
		expect(shift(0)).toBe(770 - 900)
	})
})
