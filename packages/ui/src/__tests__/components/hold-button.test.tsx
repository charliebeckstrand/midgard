import { describe, expect, it, vi } from 'vitest'
import { HoldButton } from '../../components/hold-button'
import { act, bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('HoldButton', () => {
	it('renders a button with data-slot="hold-button"', () => {
		const { container } = renderUI(<HoldButton>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('BUTTON')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<HoldButton className="custom">Hold</HoldButton>)

		const el = bySlot(container, 'hold-button')

		expect(el?.className).toContain('custom')
	})

	it('renders children', () => {
		renderUI(<HoldButton>Hold to confirm</HoldButton>)

		expect(screen.getByText('Hold to confirm')).toBeInTheDocument()
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

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<HoldButton>Hold</HoldButton>, { skeleton: true })

		expect(bySlot(container, 'hold-button')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('fires onComplete after the hold duration elapses', () => {
		vi.useFakeTimers()

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

		vi.useRealTimers()
	})

	it('cancels an in-flight hold when disabled flips true mid-hold', () => {
		vi.useFakeTimers()

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

		vi.useRealTimers()
	})

	it('does not fire onComplete when released before duration elapses', () => {
		vi.useFakeTimers()

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

		vi.useRealTimers()
	})
})
