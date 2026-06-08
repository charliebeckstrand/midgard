import { act, renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	type HoldGestureOptions,
	useHoldButtonGesture,
} from '../../components/hold-button/use-hold-button-gesture'
import { stubMatchMedia } from '../helpers'

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
	// Forces the reduced-motion branch via the shared mock's matchMedia read,
	// not a per-file `vi.mock('motion/react')` (which races the global mock under
	// the shared vmThreads module cache).
	beforeEach(() => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

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
