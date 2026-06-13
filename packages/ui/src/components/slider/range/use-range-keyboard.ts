'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { clamp } from '../../../utilities'
import { snapToStep } from './range-utilities'
import type { OverlapMode, ThumbIndex } from './types'
import { useRangeUpdate } from './use-range-update'

type ThumbButtonRefs = [RefObject<HTMLButtonElement | null>, RefObject<HTMLButtonElement | null>]

/**
 * Raw value for an arrow / page / home / end key, or null when the key is not a
 * range key.
 *
 * @internal
 */
function rangeKeyValue(
	key: string,
	index: ThumbIndex,
	current: [number, number],
	step: number,
	min: number,
	max: number,
): number | null {
	switch (key) {
		case 'ArrowRight':
		case 'ArrowUp':
			return current[index] + step
		case 'ArrowLeft':
		case 'ArrowDown':
			return current[index] - step
		// APG slider pattern: Page keys take a large step.
		case 'PageUp':
			return current[index] + step * 10
		case 'PageDown':
			return current[index] - step * 10
		case 'Home':
			return min
		case 'End':
			return max
		default:
			return null
	}
}

/**
 * In swap mode a cross-thumb key flips the value's index; moves focus to the
 * button that now holds the moving value.
 *
 * @internal
 */
function focusSwappedThumb(
	index: ThumbIndex,
	snapped: number,
	current: [number, number],
	thumbRefs: ThumbButtonRefs,
): void {
	const willSwap = (index === 0 && snapped > current[1]) || (index === 1 && snapped < current[0])

	if (willSwap) thumbRefs[index === 0 ? 1 : 0].current?.focus()
}

/**
 * Keyboard control for a range slider's two thumbs: arrows / Page / Home / End
 * move the thumb by `step`, clamped and snapped; in `swap` overlap, focus
 * follows a thumb that crosses past its partner.
 *
 * @returns A factory `(index) => onKeyDown` for the thumb at `index`.
 */
export function useRangeKeyboard(opts: {
	min: number
	max: number
	step: number
	current: [number, number]
	setRange: (fn: (prev: [number, number] | undefined) => [number, number]) => void
	overlap: OverlapMode
	thumbRefs: ThumbButtonRefs
}) {
	const { min, max, step, current, setRange, overlap, thumbRefs } = opts

	const update = useRangeUpdate({ min, max, step, setRange, overlap })

	return useCallback(
		(index: ThumbIndex) => (event: KeyboardEvent) => {
			const raw = rangeKeyValue(event.key, index, current, step, min, max)

			if (raw === null) return

			event.preventDefault()

			// In swap mode, a cross-thumb key flips the value's index; focus
			// follows to the button that now holds the moving value.
			if (overlap === 'swap') {
				const snapped = clamp(snapToStep(raw, min, step), min, max)

				focusSwappedThumb(index, snapped, current, thumbRefs)
			}

			update(index, raw)
		},
		[current, step, min, max, update, overlap, thumbRefs],
	)
}
