'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { clamp } from '../../../utilities'
import { snapToStep } from './range-utilities'
import type { OverlapMode, ThumbIndex } from './types'
import { useRangeUpdate } from './use-range-update'

export function useRangeKeyboard(opts: {
	min: number
	max: number
	step: number
	current: [number, number]
	setRange: (fn: (prev: [number, number] | undefined) => [number, number]) => void
	overlap: OverlapMode
	thumbRefs: [RefObject<HTMLButtonElement | null>, RefObject<HTMLButtonElement | null>]
}) {
	const { min, max, step, current, setRange, overlap, thumbRefs } = opts

	const update = useRangeUpdate({ min, max, step, setRange, overlap })

	return useCallback(
		(index: ThumbIndex) => (event: KeyboardEvent) => {
			const actions: Record<string, (i: ThumbIndex) => number> = {
				ArrowRight: (i) => current[i] + step,
				ArrowUp: (i) => current[i] + step,
				ArrowLeft: (i) => current[i] - step,
				ArrowDown: (i) => current[i] - step,
				// APG slider pattern: Page keys take a large step.
				PageUp: (i) => current[i] + step * 10,
				PageDown: (i) => current[i] - step * 10,
				Home: () => min,
				End: () => max,
			}

			const action = actions[event.key]

			if (!action) return

			event.preventDefault()

			const raw = action(index)

			// In swap mode, a cross-thumb key flips the value's index; focus
			// follows to the button that now holds the moving value.
			if (overlap === 'swap') {
				const snapped = clamp(snapToStep(raw, min, step), min, max)

				const willSwap =
					(index === 0 && snapped > current[1]) || (index === 1 && snapped < current[0])

				if (willSwap) thumbRefs[index === 0 ? 1 : 0].current?.focus()
			}

			update(index, raw)
		},
		[current, step, min, max, update, overlap, thumbRefs],
	)
}
