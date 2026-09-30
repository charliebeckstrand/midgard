import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { coveredBottom, useCoveredBottom } from '../../hooks/use-covered-bottom'

/** A frame fixed to a layout viewport of 800 px. */
const FRAME = { bottom: 800, height: 800 }

/** A visual viewport that the test can move, with the events of the real one. */
function stubViewport(reading: { offsetTop?: number; height: number; scale?: number }) {
	const viewport = Object.assign(new EventTarget(), { offsetTop: 0, scale: 1, ...reading })

	vi.stubGlobal('visualViewport', viewport)

	return viewport
}

/** A frame whose box is {@link FRAME}, with a spy on the read. jsdom lays nothing out. */
function makeFrame(): HTMLDivElement & { getBoundingClientRect: ReturnType<typeof vi.fn> } {
	const frame = document.createElement('div')

	const read = vi.fn(() => DOMRect.fromRect({ y: 0, width: 400, height: FRAME.height }))

	Object.defineProperty(frame, 'getBoundingClientRect', { value: read })

	return frame as HTMLDivElement & { getBoundingClientRect: typeof read }
}

describe('coveredBottom', () => {
	it('reads the strip of the frame under the bottom of the visual viewport', () => {
		// A toolbar of 60 px over a frame that runs to the bottom of the screen.
		expect(coveredBottom(FRAME, { offsetTop: 0, height: 740, scale: 1 })).toBe(60)
	})

	it('reads nothing when the visual viewport reaches the bottom of the frame', () => {
		expect(coveredBottom(FRAME, { offsetTop: 0, height: 800, scale: 1 })).toBe(0)

		// The toolbars collapse, and the visual viewport grows past the frame.
		expect(coveredBottom(FRAME, { offsetTop: 0, height: 860, scale: 1 })).toBe(0)
	})

	it('reads a fraction of a pixel as nothing', () => {
		expect(coveredBottom(FRAME, { offsetTop: 0, height: 799.5, scale: 1 })).toBe(0)
	})

	it('reads a strip as tall as a keyboard as nothing', () => {
		// The panel keeps its place under a keyboard, as it did before.
		expect(coveredBottom(FRAME, { offsetTop: 0, height: 480, scale: 1 })).toBe(0)
	})

	it('reads a pinch zoom as nothing', () => {
		expect(coveredBottom(FRAME, { offsetTop: 100, height: 400, scale: 2 })).toBe(0)
	})

	it('counts the offset of a visual viewport that the page scrolled', () => {
		expect(coveredBottom(FRAME, { offsetTop: 20, height: 740, scale: 1 })).toBe(40)
	})
})

describe('useCoveredBottom', () => {
	it('measures the frame when it mounts', () => {
		stubViewport({ height: 740 })

		const { result } = renderHook(() => useCoveredBottom(true))

		act(() => result.current.ref(makeFrame()))

		expect(result.current.covered).toBe(60)
	})

	it('measures again when the visual viewport resizes', () => {
		const viewport = stubViewport({ height: 740 })

		const { result } = renderHook(() => useCoveredBottom(true))

		act(() => result.current.ref(makeFrame()))

		// The browser corrects its layout viewport, and the strip goes.
		act(() => {
			viewport.height = 800

			viewport.dispatchEvent(new Event('resize'))
		})

		expect(result.current.covered).toBe(0)
	})

	it('measures nothing for a frame scoped to a container', () => {
		stubViewport({ height: 740 })

		const { result } = renderHook(() => useCoveredBottom(false))

		act(() => result.current.ref(makeFrame()))

		expect(result.current.covered).toBe(0)
	})

	it('measures nothing without a visual viewport', () => {
		vi.stubGlobal('visualViewport', null)

		const { result } = renderHook(() => useCoveredBottom(true))

		act(() => result.current.ref(makeFrame()))

		expect(result.current.covered).toBe(0)
	})

	it('stops the listeners when the frame unmounts', () => {
		const viewport = stubViewport({ height: 740 })

		const frame = makeFrame()

		const measure = frame.getBoundingClientRect

		const { result, unmount } = renderHook(() => useCoveredBottom(true))

		act(() => result.current.ref(frame))

		unmount()

		measure.mockClear()

		viewport.dispatchEvent(new Event('resize'))

		window.dispatchEvent(new Event('resize'))

		expect(measure).not.toHaveBeenCalled()
	})
})
