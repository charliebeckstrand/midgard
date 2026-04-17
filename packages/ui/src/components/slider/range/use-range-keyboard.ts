import { type KeyboardEvent, useCallback } from 'react'
import { type ThumbIndex, useRangeUpdate } from './use-range-update'

export function useRangeKeyboard(opts: {
	min: number
	max: number
	step: number
	current: [number, number]
	setRange: (fn: (prev: [number, number] | undefined) => [number, number]) => void
}) {
	const { min, max, step, current, setRange } = opts

	const update = useRangeUpdate({ min, max, step, setRange })

	return useCallback(
		(index: ThumbIndex) => (event: KeyboardEvent) => {
			const actions: Record<string, (i: ThumbIndex) => number> = {
				ArrowRight: (i) => current[i] + step,
				ArrowUp: (i) => current[i] + step,
				ArrowLeft: (i) => current[i] - step,
				ArrowDown: (i) => current[i] - step,
				Home: () => min,
				End: () => max,
			}

			const action = actions[event.key]

			if (!action) return

			event.preventDefault()

			update(index, action(index))
		},
		[current, step, min, max, update],
	)
}
