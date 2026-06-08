import { act, renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	type HoldGestureOptions,
	useHoldButtonGesture,
} from '../../components/hold-button/use-hold-button-gesture'

// Forces the reduced-motion branch deterministically by overriding
// `useReducedMotion` on the global jsdom-safe mock.
vi.mock('motion/react', async () => ({
	...(await import('../mocks/motion-react')).default,
	useReducedMotion: () => true,
}))

function renderGesture(initial: HoldGestureOptions) {
	return renderHook(
		(props: HoldGestureOptions) => {
			const gesture = useHoldButtonGesture(props)

			const fill = document.createElement('span')

			useEffect(() => {
				gesture.fillRef.current = fill

				return () => {
					gesture.fillRef.current = null
				}
			}, [gesture.fillRef, fill])

			return { ...gesture, fill }
		},
		{ initialProps: initial },
	)
}

describe('useHoldButtonGesture under prefers-reduced-motion', () => {
	it('still animates the progress fill over the full duration (essential feedback)', () => {
		const { result } = renderGesture({ duration: 500, disabled: false })

		act(() => result.current.start())

		expect(result.current.fill.style.transition).toBe('transform 500ms linear')
	})

	it('collapses the decorative reset to an instant', () => {
		const { result } = renderGesture({ duration: 500, disabled: false })

		act(() => result.current.start())

		act(() => result.current.cancel())

		expect(result.current.fill.style.transition).toBe('transform 0ms linear')
	})
})
