import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HoldButton } from '../../components/hold-button'
import { act, bySlot, fireEvent, renderUI } from '../helpers'

describe('HoldButton', () => {
	it('renders a button with data-slot="hold-button"', () => {
		const { container } = renderUI(<HoldButton>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('BUTTON')
	})

	it('fires onHoldStart on pointer down', () => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerDown(el)

		expect(onHoldStart).toHaveBeenCalledOnce()
	})

	it('fires onHoldCancel on pointer up before completion', () => {
		const onHoldCancel = vi.fn()

		const onComplete = vi.fn()

		const { container } = renderUI(
			<HoldButton onHoldCancel={onHoldCancel} onComplete={onComplete}>
				Hold
			</HoldButton>,
		)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerDown(el)
		fireEvent.pointerUp(el)

		expect(onHoldCancel).toHaveBeenCalledOnce()

		expect(onComplete).not.toHaveBeenCalled()
	})

	it('cancels on pointer leave', () => {
		const onHoldCancel = vi.fn()

		const { container } = renderUI(<HoldButton onHoldCancel={onHoldCancel}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerDown(el)
		fireEvent.pointerLeave(el)

		expect(onHoldCancel).toHaveBeenCalledOnce()
	})

	it('cancels a keyboard hold on blur instead of completing after focus loss', () => {
		vi.useFakeTimers()

		try {
			const onComplete = vi.fn()

			const onHoldCancel = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={500} onComplete={onComplete} onHoldCancel={onHoldCancel}>
					Hold
				</HoldButton>,
			)

			const el = bySlot(container, 'hold-button') as HTMLElement

			fireEvent.keyDown(el, { key: ' ' })

			// Tab-away routes the keyup elsewhere; the irreversible action must
			// not fire for an unfocused control.
			fireEvent.blur(el)

			act(() => {
				vi.advanceTimersByTime(600)
			})

			expect(onComplete).not.toHaveBeenCalled()

			expect(onHoldCancel).toHaveBeenCalledOnce()
		} finally {
			vi.useRealTimers()
		}
	})

	it('cancels a keyboard hold when the window loses focus', () => {
		vi.useFakeTimers()

		try {
			const onComplete = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={500} onComplete={onComplete}>
					Hold
				</HoldButton>,
			)

			const el = bySlot(container, 'hold-button') as HTMLElement

			fireEvent.keyDown(el, { key: ' ' })

			fireEvent.blur(window)

			act(() => {
				vi.advanceTimersByTime(600)
			})

			expect(onComplete).not.toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})

	it('ignores releasing the other activation key mid-hold', () => {
		vi.useFakeTimers()

		try {
			const onComplete = vi.fn()

			const onHoldCancel = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={500} onComplete={onComplete} onHoldCancel={onHoldCancel}>
					Hold
				</HoldButton>,
			)

			const el = bySlot(container, 'hold-button') as HTMLElement

			// Space starts the hold; pressing and releasing Enter must not abort it.
			fireEvent.keyDown(el, { key: ' ' })

			fireEvent.keyDown(el, { key: 'Enter' })

			fireEvent.keyUp(el, { key: 'Enter' })

			expect(onHoldCancel).not.toHaveBeenCalled()

			act(() => {
				vi.advanceTimersByTime(600)
			})

			expect(onComplete).toHaveBeenCalledOnce()

			// The initiating key's release after completion is a no-op.
			fireEvent.keyUp(el, { key: ' ' })

			expect(onHoldCancel).not.toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})

	it('starts on Space keydown', () => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.keyDown(el, { key: ' ' })

		expect(onHoldStart).toHaveBeenCalledOnce()
	})

	it('ignores repeated keydown events', () => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.keyDown(el, { key: ' ' })
		fireEvent.keyDown(el, { key: ' ', repeat: true })

		expect(onHoldStart).toHaveBeenCalledOnce()
	})

	it('does not start when disabled', () => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(
			<HoldButton disabled onHoldStart={onHoldStart}>
				Hold
			</HoldButton>,
		)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerDown(el)

		expect(onHoldStart).not.toHaveBeenCalled()
	})

	it('disables the button when disabled prop is set', () => {
		const { container } = renderUI(<HoldButton disabled>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button')

		expect(el).toBeDisabled()
	})

	it('forwards custom pointer handlers', () => {
		const onPointerDown = vi.fn()

		const { container } = renderUI(<HoldButton onPointerDown={onPointerDown}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerDown(el)

		expect(onPointerDown).toHaveBeenCalledOnce()
	})

	it('forwards onPointerUp to the caller', () => {
		const onPointerUp = vi.fn()

		const { container } = renderUI(<HoldButton onPointerUp={onPointerUp}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerUp(el)

		expect(onPointerUp).toHaveBeenCalledOnce()
	})

	it('forwards onPointerCancel to the caller', () => {
		const onPointerCancel = vi.fn()

		const { container } = renderUI(<HoldButton onPointerCancel={onPointerCancel}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerCancel(el)

		expect(onPointerCancel).toHaveBeenCalledOnce()
	})

	it('forwards onPointerLeave to the caller', () => {
		const onPointerLeave = vi.fn()

		const { container } = renderUI(<HoldButton onPointerLeave={onPointerLeave}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerLeave(el)

		expect(onPointerLeave).toHaveBeenCalledOnce()
	})

	it('forwards onKeyDown and onKeyUp to the caller', () => {
		const onKeyDown = vi.fn()
		const onKeyUp = vi.fn()

		const { container } = renderUI(
			<HoldButton onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
				Hold
			</HoldButton>,
		)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.keyDown(el, { key: 'Enter' })
		fireEvent.keyUp(el, { key: 'Enter' })

		expect(onKeyDown).toHaveBeenCalledOnce()

		expect(onKeyUp).toHaveBeenCalledOnce()
	})

	it('ignores non-primary pointer buttons on pointerdown', () => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button') as HTMLElement

		fireEvent.pointerDown(el, { button: 2 })

		expect(onHoldStart).not.toHaveBeenCalled()
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(
			<HoldButton id="test" aria-label="Hold to delete">
				Hold
			</HoldButton>,
		)

		const el = bySlot(container, 'hold-button')

		expect(el).toHaveAttribute('id', 'test')

		expect(el).toHaveAttribute('aria-label', 'Hold to delete')
	})

	describe('hold completion', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('fires onComplete after the hold duration elapses', () => {
			const onComplete = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={1000} onComplete={onComplete}>
					Hold
				</HoldButton>,
			)

			const el = bySlot(container, 'hold-button') as HTMLElement

			fireEvent.pointerDown(el)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(onComplete).toHaveBeenCalledOnce()
		})

		it('cancels an in-flight hold when disabled flips true mid-hold', () => {
			const onComplete = vi.fn()

			const onHoldCancel = vi.fn()

			const { container, rerender } = renderUI(
				<HoldButton duration={1000} onComplete={onComplete} onHoldCancel={onHoldCancel}>
					Hold
				</HoldButton>,
			)

			const el = bySlot(container, 'hold-button') as HTMLElement

			fireEvent.pointerDown(el)

			act(() => {
				vi.advanceTimersByTime(500)
			})

			rerender(
				<HoldButton duration={1000} disabled onComplete={onComplete} onHoldCancel={onHoldCancel}>
					Hold
				</HoldButton>,
			)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(onHoldCancel).toHaveBeenCalledOnce()

			expect(onComplete).not.toHaveBeenCalled()
		})

		it('does not fire onComplete when released before duration elapses', () => {
			const onComplete = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={1000} onComplete={onComplete}>
					Hold
				</HoldButton>,
			)

			const el = bySlot(container, 'hold-button') as HTMLElement

			fireEvent.pointerDown(el)

			act(() => {
				vi.advanceTimersByTime(500)
			})

			fireEvent.pointerUp(el)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(onComplete).not.toHaveBeenCalled()
		})
	})
})
