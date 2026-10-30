import { animate } from 'motion'
import { Activity, type FormEvent } from 'react'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { ControlLockContext } from '../../components/control/context'
import { HoldButton, type HoldButtonProps } from '../../components/hold-button'
import { bySlot, fireEvent, getSlot, present, renderUI } from '../helpers'
import { it, onFakeClock } from '../helpers/fake-clock'

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

/** Renders a HoldButton with `props` and the label "Hold", and gives its button. */
function renderHold(props: HoldButtonProps = {}) {
	const view = renderUI(<HoldButton {...props}>Hold</HoldButton>)

	return { ...view, el: getSlot(view.container, 'hold-button') }
}

describe('HoldButton', () => {
	it('renders a button with data-slot="hold-button"', () => {
		const { el } = renderHold()

		expect(el).toBeInTheDocument()

		expect(el.tagName).toBe('BUTTON')
	})

	it('takes a caller data-slot rename', () => {
		const { container } = renderUI(<HoldButton data-slot="delete-hold">Hold</HoldButton>)

		// No library selector reads this anchor, so a wrapper can rename the leaf
		// it renders (CONVENTIONS.md §3.9).
		expect(bySlot(container, 'delete-hold')).toBeInTheDocument()

		expect(bySlot(container, 'hold-button')).toBeNull()
	})

	it('cancels a keyboard hold on blur instead of completing after focus loss', async ({
		clock,
	}) => {
		const onHoldComplete = vi.fn()

		const onHoldCancel = vi.fn()

		const { el } = renderHold({ duration: 500, onHoldComplete, onHoldCancel })

		fireEvent.keyDown(el, { key: ' ' })

		// Tab-away routes the keyup elsewhere; the irreversible action must
		// not fire for an unfocused control.
		fireEvent.blur(el)

		await clock.advance(600)

		expect(onHoldComplete).not.toHaveBeenCalled()

		expect(onHoldCancel).toHaveBeenCalledOnce()
	})

	it('cancels a keyboard hold when the window loses focus', async ({ clock }) => {
		const onHoldComplete = vi.fn()

		const { el } = renderHold({ duration: 500, onHoldComplete })

		fireEvent.keyDown(el, { key: ' ' })

		fireEvent.blur(window)

		await clock.advance(600)

		expect(onHoldComplete).not.toHaveBeenCalled()
	})

	it('ignores releasing the other activation key mid-hold', async ({ clock }) => {
		const onHoldComplete = vi.fn()

		const onHoldCancel = vi.fn()

		const { el } = renderHold({ duration: 500, onHoldComplete, onHoldCancel })

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

	it('ignores repeated keydown events', () => {
		const onHoldStart = vi.fn()

		const { el } = renderHold({ onHoldStart })

		fireEvent.keyDown(el, { key: ' ' })

		fireEvent.keyDown(el, { key: ' ', repeat: true })

		expect(onHoldStart).toHaveBeenCalledOnce()
	})

	it('does not start when disabled', () => {
		const onHoldStart = vi.fn()

		const { el } = renderHold({ disabled: true, onHoldStart })

		fireEvent.pointerDown(el, PRESS)

		expect(onHoldStart).not.toHaveBeenCalled()
	})

	it('disables the button when disabled prop is set', () => {
		const { el } = renderHold({ disabled: true })

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

		const { el } = renderHold({ [prop]: handler })

		fire(el)

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

		const { el } = renderHold({ onHoldStart })

		fireEvent.pointerDown(el, init)

		expect(onHoldStart).not.toHaveBeenCalled()
	})

	it('writes type="button" when the caller gives no type', () => {
		const { el } = renderHold()

		expect(el).toHaveAttribute('type', 'button')
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
		onFakeClock()

		it('fires onHoldComplete after the hold duration elapses', async ({ clock }) => {
			const onHoldComplete = vi.fn()

			const { el } = renderHold({ duration: 1000, onHoldComplete })

			fireEvent.pointerDown(el, PRESS)

			await clock.advance(1000)

			expect(onHoldComplete).toHaveBeenCalledOnce()
		})

		it('submits the form with the button as the submitter when a submit hold completes', async ({
			clock,
		}) => {
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

			await clock.advance(1000)

			expect(onHoldComplete).toHaveBeenCalledOnce()

			expect(onSubmit).toHaveBeenCalledOnce()

			expect(onSubmit.mock.results[0]?.value).toBe(el)
		})

		it('starts no hold in a locked scope, and submits nothing', async ({ clock }) => {
			const onHoldComplete = vi.fn()

			const onHoldStart = vi.fn()

			const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())

			const { container } = renderUI(
				<ControlLockContext value>
					<form onSubmit={onSubmit}>
						<HoldButton type="submit" onHoldStart={onHoldStart} onHoldComplete={onHoldComplete}>
							Delete
						</HoldButton>
					</form>
				</ControlLockContext>,
			)

			const el = getSlot(container, 'hold-button')

			expect(el).toHaveAttribute('aria-disabled', 'true')

			fireEvent.pointerDown(el, PRESS)

			fireEvent.keyDown(el, { key: 'Enter' })

			await clock.advance(1000)

			expect(onHoldStart).not.toHaveBeenCalled()

			expect(onHoldComplete).not.toHaveBeenCalled()

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('cancels a hold when the scope locks, and holds again with lockable={false}', async ({
			clock,
		}) => {
			const onHoldComplete = vi.fn()

			const onHoldCancel = vi.fn()

			const { container, rerender } = renderUI(
				<ControlLockContext value={false}>
					<HoldButton onHoldCancel={onHoldCancel} onHoldComplete={onHoldComplete}>
						Hold
					</HoldButton>
				</ControlLockContext>,
			)

			fireEvent.pointerDown(getSlot(container, 'hold-button'), PRESS)

			rerender(
				<ControlLockContext value>
					<HoldButton onHoldCancel={onHoldCancel} onHoldComplete={onHoldComplete}>
						Hold
					</HoldButton>
				</ControlLockContext>,
			)

			await clock.advance(1000)

			expect(onHoldCancel).toHaveBeenCalledOnce()

			expect(onHoldComplete).not.toHaveBeenCalled()

			rerender(
				<ControlLockContext value>
					<HoldButton lockable={false} onHoldComplete={onHoldComplete}>
						Hold
					</HoldButton>
				</ControlLockContext>,
			)

			fireEvent.pointerDown(getSlot(container, 'hold-button'), PRESS)

			await clock.advance(1000)

			expect(onHoldComplete).toHaveBeenCalledOnce()
		})

		it('resets the form when a reset hold completes', async ({ clock }) => {
			const { container } = renderUI(
				<form>
					<input aria-label="Name" defaultValue="a" />
					<HoldButton type="reset">Clear</HoldButton>
				</form>,
			)

			const input = present<HTMLInputElement>(container.querySelector('input'), 'name input')

			input.value = 'b'

			fireEvent.pointerDown(getSlot(container, 'hold-button'), PRESS)

			await clock.advance(1000)

			expect(input.value).toBe('a')
		})

		it('does not submit the form when a button hold completes', async ({ clock }) => {
			const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())

			const { container } = renderUI(
				<form onSubmit={onSubmit}>
					<HoldButton>Hold</HoldButton>
				</form>,
			)

			fireEvent.pointerDown(getSlot(container, 'hold-button'), PRESS)

			await clock.advance(1000)

			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('cancels an in-flight hold when disabled flips true mid-hold', async ({ clock }) => {
			const onHoldComplete = vi.fn()

			const onHoldCancel = vi.fn()

			const { rerender, el } = renderHold({ duration: 1000, onHoldComplete, onHoldCancel })

			fireEvent.pointerDown(el, PRESS)

			await clock.advance(500)

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

			await clock.advance(1000)

			expect(onHoldCancel).toHaveBeenCalledOnce()

			expect(onHoldComplete).not.toHaveBeenCalled()
		})

		it('does not fire onHoldComplete when released before duration elapses', async ({ clock }) => {
			const onHoldComplete = vi.fn()

			const { el } = renderHold({ duration: 1000, onHoldComplete })

			fireEvent.pointerDown(el, PRESS)

			await clock.advance(500)

			fireEvent.pointerUp(el)

			await clock.advance(1000)

			expect(onHoldComplete).not.toHaveBeenCalled()
		})

		// K4-C04: a hidden Activity cleans up the effects, which clears the
		// completion timer. The hold goes back to rest, so the next press holds.
		it('holds again on the first press after a hide mid-hold', async ({ clock }) => {
			const onHoldStart = vi.fn()

			const onHoldCancel = vi.fn()

			const onHoldComplete = vi.fn()

			const tree = (mode: 'visible' | 'hidden') => (
				<Activity mode={mode}>
					<HoldButton
						duration={1000}
						onHoldStart={onHoldStart}
						onHoldCancel={onHoldCancel}
						onHoldComplete={onHoldComplete}
					>
						Hold
					</HoldButton>
				</Activity>
			)

			const { container, rerender } = renderUI(tree('visible'))

			const el = getSlot(container, 'hold-button')

			fireEvent.pointerDown(el, PRESS)

			await clock.advance(500)

			rerender(tree('hidden'))

			rerender(tree('visible'))

			// The cleanup puts the fill back to rest.
			expect(vi.mocked(animate).mock.lastCall?.[1]).toEqual({ scaleX: 0 })

			fireEvent.pointerDown(el, PRESS)

			expect(onHoldStart).toHaveBeenCalledTimes(2)

			await clock.advance(1000)

			expect(onHoldComplete).toHaveBeenCalledOnce()

			// No callback runs at the cleanup.
			expect(onHoldCancel).not.toHaveBeenCalled()
		})
	})

	// The caller's handler runs first (CONVENTIONS.md §3.9). A caller
	// `preventDefault()` can keep a hold from starting, but never from ending: a
	// skipped cancel would leave the timer to fire `onHoldComplete` after release.
	describe('handler composition', () => {
		onFakeClock()

		it('runs the caller handler before the hold starts and before it cancels', () => {
			const calls: string[] = []

			const { el } = renderHold({
				onPointerDown: () => calls.push('pointerdown'),
				onPointerUp: () => calls.push('pointerup'),
				onKeyDown: () => calls.push('keydown'),
				onKeyUp: () => calls.push('keyup'),
				onHoldStart: () => calls.push('start'),
				onHoldCancel: () => calls.push('cancel'),
			})

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

		it.for([
			['a pointer press', 'onPointerDown', (el: HTMLElement) => fireEvent.pointerDown(el, PRESS)],
			['a Space keydown', 'onKeyDown', (el: HTMLElement) => fireEvent.keyDown(el, { key: ' ' })],
		] as const)(
			'lets a caller preventDefault() on %s keep the hold from starting',
			async ([_, prop, press], { clock }) => {
				const onHoldStart = vi.fn()

				const onHoldComplete = vi.fn()

				const prevent = {
					[prop]: (event: { preventDefault: () => void }) => event.preventDefault(),
				}

				const { el } = renderHold({ duration: 500, onHoldStart, onHoldComplete, ...prevent })

				press(el)

				await clock.advance(600)

				expect(onHoldStart).not.toHaveBeenCalled()

				expect(onHoldComplete).not.toHaveBeenCalled()
			},
		)

		it.for([
			['onPointerUp', 'pointer', (el: HTMLElement) => fireEvent.pointerUp(el)],
			['onPointerCancel', 'pointer', (el: HTMLElement) => fireEvent.pointerCancel(el)],
			['onPointerLeave', 'pointer', (el: HTMLElement) => fireEvent.pointerLeave(el)],
			['onKeyUp', 'key', (el: HTMLElement) => fireEvent.keyUp(el, { key: ' ' })],
			['onBlur', 'key', (el: HTMLElement) => fireEvent.blur(el)],
		] as const)(
			'still cancels when the caller prevents %s',
			async ([prop, press, release], { clock }) => {
				const onHoldCancel = vi.fn()

				const onHoldComplete = vi.fn()

				const prevent = {
					[prop]: (event: { preventDefault: () => void }) => event.preventDefault(),
				}

				const { el } = renderHold({ duration: 500, onHoldCancel, onHoldComplete, ...prevent })

				if (press === 'pointer') fireEvent.pointerDown(el, PRESS)
				else fireEvent.keyDown(el, { key: ' ' })

				release(el)

				await clock.advance(600)

				expect(onHoldCancel).toHaveBeenCalledOnce()

				expect(onHoldComplete).not.toHaveBeenCalled()
			},
		)

		it.for([
			['onKeyUp', (el: HTMLElement) => fireEvent.keyUp(el, { key: ' ' })],
			['onBlur', (el: HTMLElement) => fireEvent.blur(el)],
		] as const)(
			'clears the held key when the caller prevents %s',
			async ([prop, release], { clock }) => {
				const onHoldComplete = vi.fn()

				const prevent = {
					[prop]: (event: { preventDefault: () => void }) => event.preventDefault(),
				}

				const { el } = renderHold({ duration: 500, onHoldComplete, ...prevent })

				fireEvent.keyDown(el, { key: ' ' })

				release(el)

				// A stale Space would make the Enter release below cancel nothing.
				fireEvent.keyDown(el, { key: 'Enter' })

				fireEvent.keyUp(el, { key: 'Enter' })

				await clock.advance(600)

				expect(onHoldComplete).not.toHaveBeenCalled()
			},
		)
	})
})
