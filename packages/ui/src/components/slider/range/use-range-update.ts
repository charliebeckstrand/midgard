import { useCallback } from 'react'
import { clamp, snapToStep } from './utilities'

export type ThumbIndex = 0 | 1

export type OverlapMode = 'clamp' | 'swap'

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
			const snapped = snapToStep(clamp(raw, min, max), min, step)

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
