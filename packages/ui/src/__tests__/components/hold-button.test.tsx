import { animate } from 'motion'
import type { FormEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HoldButton } from '../../components/hold-button'
import { act, bySlot, fireEvent, getSlot, present, renderUI, withFakeTime } from '../helpers'

// `animate` is the shared module spy (setup/module-mocks.ts). The stub runs no
// animation. A real Motion animation under fake timers waits on a fake frame,
// and the frame loop of Motion then stays stuck for the next files of the
// worker, because the suites run with `isolate: false`.
beforeEach(() => {
	vi.mocked(animate).mockReturnValue({} as ReturnType<typeof animate>)
})

afterEach(() => {
	// Restore the call-through default of animate.
	vi.mocked(animate).mockRestore()
})

/** A plain primary press. jsdom gives a synthetic pointer event `isPrimary: false`. */
const PRESS = { isPrimary: true, button: 0 }

describe('HoldButton', () => {
	it('renders a button with data-slot="hold-button"', () => {
		const { container } = renderUI(<HoldButton>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('BUTTON')
	})

	it('takes a caller data-slot rename', () => {
		const { container } = renderUI(<HoldButton data-slot="delete-hold">Hold</HoldButton>)

		// No library selector reads this anchor, so a wrapper can rename the leaf
		// it renders (CONVENTIONS.md §3.9).
		expect(bySlot(container, 'delete-hold')).toBeInTheDocument()

		expect(bySlot(container, 'hold-button')).toBeNull()
	})

	it('fires onHoldStart on pointer down', () => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		const el = getSlot(container, 'hold-button')

		fireEvent.pointerDown(el, PRESS)

		expect(onHoldStart).toHaveBeenCalledOnce()
	})

	it('fires onHoldCancel on pointer up before completion', () => {
		const onHoldCancel = vi.fn()

		const onHoldComplete = vi.fn()

		const { container } = renderUI(
			<HoldButton onHoldCancel={onHoldCancel} onHoldComplete={onHoldComplete}>
				Hold
			</HoldButton>,
		)

		const el = getSlot(container, 'hold-button')

		fireEvent.pointerDown(el, PRESS)

		fireEvent.pointerUp(el)

		expect(onHoldCancel).toHaveBeenCalledOnce()

		expect(onHoldComplete).not.toHaveBeenCalled()
	})

	it('cancels on pointer leave', () => {
		const onHoldCancel = vi.fn()

		const { container } = renderUI(<HoldButton onHoldCancel={onHoldCancel}>Hold</HoldButton>)

		const el = getSlot(container, 'hold-button')

		fireEvent.pointerDown(el, PRESS)

		fireEvent.pointerLeave(el)

		expect(onHoldCancel).toHaveBeenCalledOnce()
	})

	it('cancels a keyboard hold on blur instead of completing after focus loss', async () => {
		await withFakeTime(async (clock) => {
			const onHoldComplete = vi.fn()

			const onHoldCancel = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={500} onHoldComplete={onHoldComplete} onHoldCancel={onHoldCancel}>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			fireEvent.keyDown(el, { key: ' ' })

			// Tab-away routes the keyup elsewhere; the irreversible action must
			// not fire for an unfocused control.
			fireEvent.blur(el)

			await clock.advance(600)

			expect(onHoldComplete).not.toHaveBeenCalled()

			expect(onHoldCancel).toHaveBeenCalledOnce()
		})
	})

	it('cancels a keyboard hold when the window loses focus', async () => {
		await withFakeTime(async (clock) => {
			const onHoldComplete = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={500} onHoldComplete={onHoldComplete}>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			fireEvent.keyDown(el, { key: ' ' })

			fireEvent.blur(window)

			await clock.advance(600)

			expect(onHoldComplete).not.toHaveBeenCalled()
		})
	})

	it('ignores releasing the other activation key mid-hold', async () => {
		await withFakeTime(async (clock) => {
			const onHoldComplete = vi.fn()

			const onHoldCancel = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={500} onHoldComplete={onHoldComplete} onHoldCancel={onHoldCancel}>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			// Space starts the hold; pressing and releasing Enter must not abort it.
			fireEvent.keyDown(el, { key: ' ' })

			fireEvent.keyDown(el, { key: 'Enter' })

			fireEvent.keyUp(el, { key: 'Enter' })

			expect(onHoldCancel).not.toHaveBeenCalled()

			await clock.advance(600)

			expect(onHoldComplete).toHaveBeenCalledOnce()

			// The initiating key's release after completion is a no-op.
			fireEvent.keyUp(el, { key: ' ' })

			expect(onHoldCancel).not.toHaveBeenCalled()
		})
	})

	it('starts on Space keydown', () => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		const el = getSlot(container, 'hold-button')

		fireEvent.keyDown(el, { key: ' ' })

		expect(onHoldStart).toHaveBeenCalledOnce()
	})

	it('ignores repeated keydown events', () => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		const el = getSlot(container, 'hold-button')

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

		const el = getSlot(container, 'hold-button')

		fireEvent.pointerDown(el, PRESS)

		expect(onHoldStart).not.toHaveBeenCalled()
	})

	it('disables the button when disabled prop is set', () => {
		const { container } = renderUI(<HoldButton disabled>Hold</HoldButton>)

		const el = bySlot(container, 'hold-button')

		expect(el).toBeDisabled()
	})

	// The handler composition block checks that onKeyDown and onKeyUp reach the caller.
	it.each([
		['onPointerDown', (el: HTMLElement) => fireEvent.pointerDown(el, PRESS)],
		['onPointerUp', (el: HTMLElement) => fireEvent.pointerUp(el)],
		['onPointerCancel', (el: HTMLElement) => fireEvent.pointerCancel(el)],
		['onPointerLeave', (el: HTMLElement) => fireEvent.pointerLeave(el)],
	] as const)('forwards %s to the caller', (prop, fire) => {
		const handler = vi.fn()

		const { container } = renderUI(<HoldButton {...{ [prop]: handler }}>Hold</HoldButton>)

		fire(getSlot(container, 'hold-button'))

		expect(handler).toHaveBeenCalledOnce()
	})

	// On macOS a Ctrl-click is the secondary click. It sends button 0 with Ctrl and opens a
	// context menu, which can take the release, so a hold that it starts would complete.
	it.each([
		['a secondary button', { isPrimary: true, button: 2 }],
		['a macOS Ctrl-click', { isPrimary: true, button: 0, ctrlKey: true }],
		['a pointer that is not primary', { isPrimary: false, button: 0 }],
	])('starts no hold on %s', (_name, init) => {
		const onHoldStart = vi.fn()

		const { container } = renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		fireEvent.pointerDown(getSlot(container, 'hold-button'), init)

		expect(onHoldStart).not.toHaveBeenCalled()
	})

	it('writes type="button" when the caller gives no type', () => {
		const { container } = renderUI(<HoldButton>Hold</HoldButton>)

		expect(getSlot(container, 'hold-button')).toHaveAttribute('type', 'button')
	})

	it('writes the caller type', () => {
		const { container } = renderUI(
			<form>
				<HoldButton type="submit">Delete</HoldButton>
			</form>,
		)

		expect(getSlot(container, 'hold-button')).toHaveAttribute('type', 'submit')
	})

	it('does not submit the form on a quick press', () => {
		const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())

		const { container } = renderUI(
			<form onSubmit={onSubmit}>
				<HoldButton type="submit">Delete</HoldButton>
			</form>,
		)

		const el = getSlot(container, 'hold-button')

		// A quick press cancels the hold, but the browser sends a native click
		// after the pointer pair. That click must not submit the form, or the
		// hold gate stops nothing.
		fireEvent.pointerDown(el, PRESS)

		fireEvent.pointerUp(el)

		fireEvent.click(el)

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('does not reset the form on a quick press', () => {
		const { container } = renderUI(
			<form>
				<input aria-label="Name" defaultValue="a" />
				<HoldButton type="reset">Clear</HoldButton>
			</form>,
		)

		const input = present<HTMLInputElement>(container.querySelector('input'), 'name input')

		input.value = 'b'

		fireEvent.click(getSlot(container, 'hold-button'))

		expect(input.value).toBe('b')
	})

	describe('hold completion', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('fires onHoldComplete after the hold duration elapses', () => {
			const onHoldComplete = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={1000} onHoldComplete={onHoldComplete}>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			fireEvent.pointerDown(el, PRESS)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(onHoldComplete).toHaveBeenCalledOnce()
		})

		it('submits the form with the button as the submitter when a submit hold completes', () => {
			const onHoldComplete = vi.fn()

			const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
				event.preventDefault()

				return (event.nativeEvent as SubmitEvent).submitter
			})

			const { container } = renderUI(
				<form onSubmit={onSubmit}>
					<HoldButton type="submit" name="intent" value="delete" onHoldComplete={onHoldComplete}>
						Delete
					</HoldButton>
				</form>,
			)

			const el = getSlot(container, 'hold-button')

			fireEvent.pointerDown(el, PRESS)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(onHoldComplete).toHaveBeenCalledOnce()

			expect(onSubmit).toHaveBeenCalledOnce()

			expect(onSubmit.mock.results[0]?.value).toBe(el)
		})

		it('resets the form when a reset hold completes', () => {
			const { container } = renderUI(
				<form>
					<input aria-label="Name" defaultValue="a" />
					<HoldButton type="reset">Clear</HoldButton>
				</form>,
			)

			const input = present<HTMLInputElement>(container.querySelector('input'), 'name input')

			input.value = 'b'

			fireEvent.pointerDown(getSlot(container, 'hold-button'), PRESS)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(input.value).toBe('a')
		})

		it('does not submit the form when a button hold completes', () => {
			const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())

			const { container } = renderUI(
				<form onSubmit={onSubmit}>
					<HoldButton>Hold</HoldButton>
				</form>,
			)

			fireEvent.pointerDown(getSlot(container, 'hold-button'), PRESS)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('cancels an in-flight hold when disabled flips true mid-hold', () => {
			const onHoldComplete = vi.fn()

			const onHoldCancel = vi.fn()

			const { container, rerender } = renderUI(
				<HoldButton duration={1000} onHoldComplete={onHoldComplete} onHoldCancel={onHoldCancel}>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			fireEvent.pointerDown(el, PRESS)

			act(() => {
				vi.advanceTimersByTime(500)
			})

			rerender(
				<HoldButton
					duration={1000}
					disabled
					onHoldComplete={onHoldComplete}
					onHoldCancel={onHoldCancel}
				>
					Hold
				</HoldButton>,
			)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(onHoldCancel).toHaveBeenCalledOnce()

			expect(onHoldComplete).not.toHaveBeenCalled()
		})

		it('does not fire onHoldComplete when released before duration elapses', () => {
			const onHoldComplete = vi.fn()

			const { container } = renderUI(
				<HoldButton duration={1000} onHoldComplete={onHoldComplete}>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			fireEvent.pointerDown(el, PRESS)

			act(() => {
				vi.advanceTimersByTime(500)
			})

			fireEvent.pointerUp(el)

			act(() => {
				vi.advanceTimersByTime(1000)
			})

			expect(onHoldComplete).not.toHaveBeenCalled()
		})
	})

	// The caller's handler runs first (CONVENTIONS.md §3.9). A caller
	// `preventDefault()` can keep a hold from starting, but never from ending: a
	// skipped cancel would leave the timer to fire `onHoldComplete` after release.
	describe('handler composition', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('runs the caller handler before the hold starts and before it cancels', () => {
			const calls: string[] = []

			const { container } = renderUI(
				<HoldButton
					onPointerDown={() => calls.push('pointerdown')}
					onPointerUp={() => calls.push('pointerup')}
					onKeyDown={() => calls.push('keydown')}
					onKeyUp={() => calls.push('keyup')}
					onHoldStart={() => calls.push('start')}
					onHoldCancel={() => calls.push('cancel')}
				>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			fireEvent.pointerDown(el, PRESS)

			fireEvent.pointerUp(el)

			fireEvent.keyDown(el, { key: ' ' })

			fireEvent.keyUp(el, { key: ' ' })

			expect(calls).toEqual([
				'pointerdown',
				'start',
				'pointerup',
				'cancel',
				'keydown',
				'start',
				'keyup',
				'cancel',
			])
		})

		it.each([
			['a pointer press', 'onPointerDown', (el: HTMLElement) => fireEvent.pointerDown(el, PRESS)],
			['a Space keydown', 'onKeyDown', (el: HTMLElement) => fireEvent.keyDown(el, { key: ' ' })],
		] as const)(
			'lets a caller preventDefault() on %s keep the hold from starting',
			(_, prop, press) => {
				const onHoldStart = vi.fn()

				const onHoldComplete = vi.fn()

				const prevent = {
					[prop]: (event: { preventDefault: () => void }) => event.preventDefault(),
				}

				const { container } = renderUI(
					<HoldButton
						duration={500}
						onHoldStart={onHoldStart}
						onHoldComplete={onHoldComplete}
						{...prevent}
					>
						Hold
					</HoldButton>,
				)

				press(getSlot(container, 'hold-button'))

				act(() => {
					vi.advanceTimersByTime(600)
				})

				expect(onHoldStart).not.toHaveBeenCalled()

				expect(onHoldComplete).not.toHaveBeenCalled()
			},
		)

		it.each([
			['onPointerUp', 'pointer', (el: HTMLElement) => fireEvent.pointerUp(el)],
			['onPointerCancel', 'pointer', (el: HTMLElement) => fireEvent.pointerCancel(el)],
			['onPointerLeave', 'pointer', (el: HTMLElement) => fireEvent.pointerLeave(el)],
			['onKeyUp', 'key', (el: HTMLElement) => fireEvent.keyUp(el, { key: ' ' })],
			['onBlur', 'key', (el: HTMLElement) => fireEvent.blur(el)],
		] as const)('still cancels when the caller prevents %s', (prop, press, release) => {
			const onHoldCancel = vi.fn()

			const onHoldComplete = vi.fn()

			const prevent = { [prop]: (event: { preventDefault: () => void }) => event.preventDefault() }

			const { container } = renderUI(
				<HoldButton
					duration={500}
					onHoldCancel={onHoldCancel}
					onHoldComplete={onHoldComplete}
					{...prevent}
				>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			if (press === 'pointer') fireEvent.pointerDown(el, PRESS)
			else fireEvent.keyDown(el, { key: ' ' })

			release(el)

			act(() => {
				vi.advanceTimersByTime(600)
			})

			expect(onHoldCancel).toHaveBeenCalledOnce()

			expect(onHoldComplete).not.toHaveBeenCalled()
		})

		it.each([
			['onKeyUp', (el: HTMLElement) => fireEvent.keyUp(el, { key: ' ' })],
			['onBlur', (el: HTMLElement) => fireEvent.blur(el)],
		] as const)('clears the held key when the caller prevents %s', (prop, release) => {
			const onHoldComplete = vi.fn()

			const prevent = { [prop]: (event: { preventDefault: () => void }) => event.preventDefault() }

			const { container } = renderUI(
				<HoldButton duration={500} onHoldComplete={onHoldComplete} {...prevent}>
					Hold
				</HoldButton>,
			)

			const el = getSlot(container, 'hold-button')

			fireEvent.keyDown(el, { key: ' ' })

			release(el)

			// A stale Space would make the Enter release below cancel nothing.
			fireEvent.keyDown(el, { key: 'Enter' })

			fireEvent.keyUp(el, { key: 'Enter' })

			act(() => {
				vi.advanceTimersByTime(600)
			})

			expect(onHoldComplete).not.toHaveBeenCalled()
		})
	})
})
