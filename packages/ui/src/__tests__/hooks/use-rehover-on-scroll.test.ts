import { renderHook } from '@testing-library/react'
import { createRef, type RefObject } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRehoverOnScroll } from '../../hooks/use-rehover-on-scroll'

/** A plot region holding one hit mark, both attached to the document. */
function plot(): { region: HTMLDivElement; mark: HTMLDivElement; ref: RefObject<HTMLDivElement> } {
	const region = document.createElement('div')

	const mark = document.createElement('div')

	region.appendChild(mark)

	document.body.appendChild(region)

	return { region, mark, ref: { current: region } }
}

/** Move the pointer to a viewport point; the hook records it for the next scroll. */
function movePointer(x: number, y: number): void {
	window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))
}

/** jsdom lays nothing out, so stand in for the element under the pointer. */
function elementUnderPointer(element: Element | null): ReturnType<typeof vi.fn> {
	const stub = vi.fn().mockReturnValue(element)

	document.elementFromPoint = stub

	return stub
}

afterEach(() => {
	vi.restoreAllMocks()

	document.elementFromPoint = undefined as never

	document.body.replaceChildren()
})

describe('useRehoverOnScroll', () => {
	it('clears the readout on scroll', () => {
		const clear = vi.fn()

		const { ref } = plot()

		renderHook(() => useRehoverOnScroll(true, clear, ref))

		window.dispatchEvent(new Event('scroll'))

		expect(clear).toHaveBeenCalledOnce()
	})

	it('replays the pointer onto the mark still under it', () => {
		const clear = vi.fn()

		const { mark, ref } = plot()

		const under = elementUnderPointer(mark)

		const replayed = vi.fn()

		mark.addEventListener('pointermove', replayed)

		renderHook(() => useRehoverOnScroll(true, clear, ref))

		movePointer(120, 80)

		window.dispatchEvent(new Event('scroll'))

		// Cleared first, then the pointer replayed at its last position onto the mark.
		expect(clear).toHaveBeenCalledOnce()

		expect(under).toHaveBeenCalledWith(120, 80)

		expect(replayed).toHaveBeenCalledOnce()

		expect(replayed.mock.calls[0]?.[0]).toMatchObject({ clientX: 120, clientY: 80 })
	})

	it('only clears when the pointer rests off every mark', () => {
		const clear = vi.fn()

		const { ref } = plot()

		// Off the plot entirely: no element resolves under the pointer.
		elementUnderPointer(null)

		renderHook(() => useRehoverOnScroll(true, clear, ref))

		movePointer(10, 10)

		window.dispatchEvent(new Event('scroll'))

		expect(clear).toHaveBeenCalledOnce()
	})

	it('never replays into a foreign element outside the plot', () => {
		const clear = vi.fn()

		const { ref } = plot()

		const foreign = document.createElement('div')

		document.body.appendChild(foreign)

		elementUnderPointer(foreign)

		const replayed = vi.fn()

		foreign.addEventListener('pointermove', replayed)

		renderHook(() => useRehoverOnScroll(true, clear, ref))

		movePointer(300, 300)

		window.dispatchEvent(new Event('scroll'))

		expect(clear).toHaveBeenCalledOnce()

		expect(replayed).not.toHaveBeenCalled()
	})

	it('ignores scroll while inactive', () => {
		const clear = vi.fn()

		const { ref } = plot()

		renderHook(() => useRehoverOnScroll(false, clear, ref))

		window.dispatchEvent(new Event('scroll'))

		expect(clear).not.toHaveBeenCalled()
	})

	it('reads the latest clear without resubscribing', () => {
		const first = vi.fn()

		const second = vi.fn()

		const ref = createRef<HTMLDivElement>()

		const { rerender } = renderHook(
			({ clear }: { clear: () => void }) => useRehoverOnScroll(true, clear, ref),
			{ initialProps: { clear: first } },
		)

		rerender({ clear: second })

		window.dispatchEvent(new Event('scroll'))

		expect(first).not.toHaveBeenCalled()

		expect(second).toHaveBeenCalledOnce()
	})
})
