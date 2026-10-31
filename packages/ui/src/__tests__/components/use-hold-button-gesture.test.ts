import { act, renderHook } from '@testing-library/react'
import { animate } from 'motion'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import {
	type HoldGestureOptions,
	useHoldButtonGesture,
} from '../../components/hold-button/use-hold-button-gesture'
import { it, onFakeClock } from '../helpers/fake-clock'

function renderGesture(initial: HoldGestureOptions) {
	return renderHook(
		(props: HoldGestureOptions) => {
			const gesture = useHoldButtonGesture(props)

			const fill = document.createElement('span')

			// Attach the ref to a real element, which setFill animates.
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

describe('useHoldButtonGesture', () => {
	// `animate` is the shared module spy (setup/module-mocks.ts). The stub runs no
	// animation. A real Motion animation under fake timers waits on a fake frame,
	// and the frame loop of Motion then stays stuck for the next files of the
	// worker, because the suites run with `isolate: false`.
	onFakeClock()

	beforeEach(() => {
		vi.mocked(animate).mockReturnValue({} as ReturnType<typeof animate>)
	})

	afterEach(() => {
		// Restore the call-through default of animate.
		vi.mocked(animate).mockRestore()
	})

	it('fires onHoldComplete after the configured duration', async ({ clock }) => {
		const onHoldComplete = vi.fn()

		const { result } = renderGesture({ duration: 500, disabled: false, onHoldComplete })

		act(() => result.current.start())

		expect(onHoldComplete).not.toHaveBeenCalled()

		await clock.advance(500)

		expect(onHoldComplete).toHaveBeenCalledTimes(1)
	})

	it('does not fire onHoldComplete when cancel runs before duration elapses', async ({ clock }) => {
		const onHoldComplete = vi.fn()

		const onHoldCancel = vi.fn()

		const { result } = renderGesture({
			duration: 500,
			disabled: false,
			onHoldComplete,
			onHoldCancel,
		})

		act(() => result.current.start())

		await clock.advance(200)

		act(() => result.current.cancel())

		await clock.advance(1000)

		expect(onHoldComplete).not.toHaveBeenCalled()

		expect(onHoldCancel).toHaveBeenCalledTimes(1)
	})

	it('ignores start when disabled is true', async ({ clock }) => {
		const onHoldStart = vi.fn()

		const onHoldComplete = vi.fn()

		const { result } = renderGesture({
			duration: 500,
			disabled: true,
			onHoldStart,
			onHoldComplete,
		})

		act(() => result.current.start())

		await clock.advance(500)

		expect(onHoldStart).not.toHaveBeenCalled()

		expect(onHoldComplete).not.toHaveBeenCalled()
	})

	it('ignores a second start while a hold is already in progress', () => {
		const onHoldStart = vi.fn()

		const { result } = renderGesture({ duration: 500, disabled: false, onHoldStart })

		act(() => result.current.start())

		act(() => result.current.start())

		expect(onHoldStart).toHaveBeenCalledTimes(1)
	})

	it('ignores cancel when no hold is in progress', () => {
		const onHoldCancel = vi.fn()

		const { result } = renderGesture({ duration: 500, disabled: false, onHoldCancel })

		act(() => result.current.cancel())

		expect(onHoldCancel).not.toHaveBeenCalled()
	})

	it('auto-cancels a pending hold when disabled flips to true', async ({ clock }) => {
		const onHoldCancel = vi.fn()

		const onHoldComplete = vi.fn()

		const { result, rerender } = renderGesture({
			duration: 500,
			disabled: false,
			onHoldCancel,
			onHoldComplete,
		})

		act(() => result.current.start())

		act(() => {
			rerender({ duration: 500, disabled: true, onHoldCancel, onHoldComplete })
		})

		expect(onHoldCancel).toHaveBeenCalledTimes(1)

		await clock.advance(500)

		expect(onHoldComplete).not.toHaveBeenCalled()
	})

	it('clears the pending timer on unmount so onHoldComplete never fires', async ({ clock }) => {
		const onHoldComplete = vi.fn()

		const { result, unmount } = renderGesture({
			duration: 500,
			disabled: false,
			onHoldComplete,
		})

		act(() => result.current.start())

		unmount()

		await clock.advance(500)

		expect(onHoldComplete).not.toHaveBeenCalled()
	})

	it('animates the fill to scaleX(1) at a constant rate over the duration when starting', () => {
		const { result } = renderGesture({ duration: 500, disabled: false })

		act(() => result.current.start())

		expect(animate).toHaveBeenLastCalledWith(
			result.current.fill,
			{ scaleX: 1 },
			{ duration: 0.5, ease: 'linear' },
		)
	})

	it('animates the fill back to scaleX(0) in 150 ms when canceling mid-hold', () => {
		const { result } = renderGesture({ duration: 500, disabled: false })

		act(() => result.current.start())

		act(() => result.current.cancel())

		expect(animate).toHaveBeenLastCalledWith(
			result.current.fill,
			{ scaleX: 0 },
			{ duration: 0.15, ease: 'linear' },
		)
	})

	it('allows a new hold to start after the previous one completed', async ({ clock }) => {
		const onHoldStart = vi.fn()

		const onHoldComplete = vi.fn()

		const { result } = renderGesture({
			duration: 500,
			disabled: false,
			onHoldStart,
			onHoldComplete,
		})

		act(() => result.current.start())

		await clock.advance(500)

		act(() => result.current.start())

		expect(onHoldStart).toHaveBeenCalledTimes(2)

		expect(onHoldComplete).toHaveBeenCalledTimes(1)
	})
})
