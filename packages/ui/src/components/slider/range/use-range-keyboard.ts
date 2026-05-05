import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { type OverlapMode, type ThumbIndex, useRangeUpdate } from './use-range-update'
import { clamp, snapToStep } from './utilities'

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
				Home: () => min,
				End: () => max,
			}

			const action = actions[event.key]

			if (!action) return

			event.preventDefault()

			const raw = action(index)

			// In swap mode, if this key would cross the other thumb the value's
			// index flips. Move focus to the button that now holds the moving value
			// so subsequent keys keep acting on the same conceptual thumb.
			if (overlap === 'swap') {
				const snapped = snapToStep(clamp(raw, min, max), min, step)

				const willSwap =
					(index === 0 && snapped > current[1]) || (index === 1 && snapped < current[0])

				if (willSwap) thumbRefs[index === 0 ? 1 : 0].current?.focus()
			}

			update(index, raw)
		},
		[current, step, min, max, update, overlap, thumbRefs],
	)
}
