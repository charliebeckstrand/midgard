import { useCallback } from 'react'
import { snapValue } from './range-utilities'
import type { OverlapMode, ThumbIndex } from './types'

/**
 * Returns the shared range setter used by the keyboard and pointer hooks. It
 * snaps a raw thumb value to `step`, clamps it into `[min, max]`, writes it to
 * thumb `index`, and resolves a crossing. `swap` re-sorts the pair, and `clamp`
 * (default) pins the moved thumb to its neighbor.
 *
 * @remarks `snapValue` gives the value, so the pointer hook predicts the same
 * value that this setter writes.
 * @internal
 */
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
			const rounded = snapValue(raw, min, max, step)

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
