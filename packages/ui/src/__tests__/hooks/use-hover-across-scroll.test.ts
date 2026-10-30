import { renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import { useHoverAcrossScroll } from '../../hooks/use-hover-across-scroll'
import { it, onFakeClock } from '../helpers/fake-clock'

/** Move the pointer to a viewport point; the hook records it for the next settle. */
function movePointer(x: number, y: number): void {
	window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))
}

/** Sends one scroll frame to the window. */
function scroll(): void {
	window.dispatchEvent(new Event('scroll'))
}

/** Renders the hook with spy callbacks. `enabled` is a prop, so `rerender` can flip it. */
function setup(enabled = true) {
	const clear = vi.fn()

	const resolveAt = vi.fn()

	const { rerender, unmount } = renderHook(
		({ enabled }: { enabled: boolean }) => useHoverAcrossScroll(enabled, clear, resolveAt),
		{ initialProps: { enabled } },
	)

	return { clear, resolveAt, rerender, unmount }
}

describe('useHoverAcrossScroll', () => {
	onFakeClock()

	it('hides on scroll and re-resolves at the pointer once it settles', async ({ clock }) => {
		const { clear, resolveAt } = setup()

		movePointer(120, 80)

		scroll()

		// Hidden immediately; the re-resolve waits for the scroll to settle.
		expect(clear).toHaveBeenCalledOnce()

		expect(resolveAt).not.toHaveBeenCalled()

		await clock.advance(200)

		expect(resolveAt).toHaveBeenCalledExactlyOnceWith(120, 80)
	})

	it('debounces a burst of scroll frames into one settle', async ({ clock }) => {
		const { clear, resolveAt } = setup()

		movePointer(50, 50)

		for (let i = 0; i < 5; i++) {
			scroll()

			await clock.advance(40)
		}

		// Each frame hid the readout; none settled yet (frames were < 120ms apart).
		expect(clear).toHaveBeenCalledTimes(5)

		expect(resolveAt).not.toHaveBeenCalled()

		await clock.advance(200)

		expect(resolveAt).toHaveBeenCalledExactlyOnceWith(50, 50)
	})

	it('does not re-resolve when no pointer has been seen', async ({ clock }) => {
		const { clear, resolveAt } = setup()

		scroll()

		await clock.advance(200)

		expect(clear).toHaveBeenCalledOnce()

		expect(resolveAt).not.toHaveBeenCalled()
	})

	it('ignores scroll while disabled', async ({ clock }) => {
		const { clear, resolveAt } = setup(false)

		movePointer(10, 10)

		scroll()

		await clock.advance(200)

		expect(clear).not.toHaveBeenCalled()

		expect(resolveAt).not.toHaveBeenCalled()
	})

	// A chart with no tooltip adds no listener. Once the readout turns on, the hook
	// knows the pointer only from the next move.
	it('tracks no pointer while disabled', async ({ clock }) => {
		const add = vi.spyOn(window, 'addEventListener')

		const { clear, resolveAt, rerender } = setup(false)

		expect(add).not.toHaveBeenCalled()

		movePointer(10, 10)

		rerender({ enabled: true })

		scroll()

		await clock.advance(200)

		expect(clear).toHaveBeenCalledOnce()

		expect(resolveAt).not.toHaveBeenCalled()

		movePointer(30, 40)

		scroll()

		await clock.advance(200)

		expect(resolveAt).toHaveBeenCalledExactlyOnceWith(30, 40)
	})

	// A pointer seen before the readout turned off is stale when it turns on again.
	it('forgets the pointer when it turns off', async ({ clock }) => {
		const { resolveAt, rerender } = setup()

		movePointer(10, 10)

		rerender({ enabled: false })

		rerender({ enabled: true })

		scroll()

		await clock.advance(200)

		expect(resolveAt).not.toHaveBeenCalled()
	})

	it('reads the latest callbacks without resubscribing', () => {
		const firstClear = vi.fn()

		const secondClear = vi.fn()

		const resolveAt = vi.fn()

		const { rerender } = renderHook(
			({ clear }: { clear: () => void }) => useHoverAcrossScroll(true, clear, resolveAt),
			{ initialProps: { clear: firstClear } },
		)

		rerender({ clear: secondClear })

		scroll()

		expect(firstClear).not.toHaveBeenCalled()

		expect(secondClear).toHaveBeenCalledOnce()
	})

	it('drops a pending settle when it unmounts mid-scroll', async ({ clock }) => {
		const { resolveAt, unmount } = setup()

		movePointer(10, 10)

		scroll()

		unmount()

		await clock.advance(200)

		expect(resolveAt).not.toHaveBeenCalled()
	})
})
