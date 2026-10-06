import { act, renderHook } from '@testing-library/react'
import { animate } from 'motion'
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
	// not a per-file `vi.mock('motion/react')` (see setup/module-mocks.ts).
	beforeEach(() => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		// The stub runs no animation, as in `use-hold-button-gesture.test.ts`. The
		// default calls through to Motion, and its tween then runs on into the next
		// files of the worker.
		vi.mocked(animate).mockReturnValue({} as ReturnType<typeof animate>)
	})

	afterEach(() => {
		// Restore the call-through default of animate.
		vi.mocked(animate).mockRestore()
	})

	it('still animates the progress fill over the full duration (essential feedback)', () => {
		const { result } = renderGesture({ duration: 500, disabled: false })

		act(() => result.current.start())

		expect(animate).toHaveBeenLastCalledWith(
			result.current.fill,
			{ transform: 'scaleX(1)' },
			{ duration: 0.5, ease: 'linear' },
		)
	})

	it('collapses the decorative reset to an instant', () => {
		const { result } = renderGesture({ duration: 500, disabled: false })

		act(() => result.current.start())

		act(() => result.current.cancel())

		expect(animate).toHaveBeenLastCalledWith(
			result.current.fill,
			{ transform: 'scaleX(0)' },
			{ duration: 0 },
		)
	})
})
