import { useCallback } from 'react'
import { clamp } from '../../../utilities'
import { snapToStep } from './range-utilities'
import type { OverlapMode, ThumbIndex } from './types'

export function useRangeUpdate(opts: {
	min: number
	max: number
	step: number
	setRange: (fn: (prev: [number, number] | undefined) => [number, number]) => void
	overlap?: OverlapMode
}) {
	const { min, max, step, setRange, overlap = 'clamp' } = opts

	return useCallback(
		(index: ThumbIndex, raw: number) => {
			// Snap first, clamp last: rounding a clamped value can land past the
			// bound (min=2 max=10 step=3: End -> 11), pushing aria-valuenow over
			// aria-valuemax and the thumb past the track.
			const snapped = clamp(snapToStep(raw, min, step), min, max)

			const rounded = parseFloat(snapped.toFixed(10))

			setRange((prev) => {
				const next = [...(prev ?? [min, max])] as [number, number]

				next[index] = rounded

				if (next[0] > next[1]) {
					if (overlap === 'swap') return [next[1], next[0]] as [number, number]

					if (index === 0) next[0] = next[1]
					else next[1] = next[0]
				}

				return next
			})
		},
		[min, max, step, setRange, overlap],
	)
}
