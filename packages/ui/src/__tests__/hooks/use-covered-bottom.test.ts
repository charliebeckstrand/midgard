import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { coveredBottom, holdCoveredBottom, useCoveredBottom } from '../../hooks/use-covered-bottom'

/** A frame fixed to a layout viewport of 800 px. */
const FRAME = { bottom: 800, height: 800 }

/** The property that the reading writes on the root element. */
const PROPERTY = '--covered-bottom'

/**
 * Stubs a page whose layout viewport the test can move, under a visual viewport
 * it can move too. jsdom lays nothing out, so each box reads the layout
 * viewport. The frames queue, so the test runs them when it chooses.
 */
function stubPage(reading: { layout?: number; height: number }) {
	const page = { layout: reading.layout ?? FRAME.height }

	const viewport = Object.assign(new EventTarget(), {
		offsetTop: 0,
		scale: 1,
		height: reading.height,
	})

	vi.stubGlobal('visualViewport', viewport)

	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() =>
		DOMRect.fromRect({ width: 400, height: page.layout }),
	)

	const queued: FrameRequestCallback[] = []

	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => queued.push(callback))

	vi.stubGlobal('cancelAnimationFrame', () => {})

	/** Runs the queued frames. */
	const flush = () =>
		act(() => {
			for (const callback of queued.splice(0)) callback(0)
		})

	return { page, viewport, flush }
}

/** The value of the property on the root element, or `''` when it is not set. */
function property(): string {
	return document.documentElement.style.getPropertyValue(PROPERTY)
}

/** The number of probes in the page. */
function probes(): number {
	return document.querySelectorAll('body > [aria-hidden="true"][style*="fixed"]').length
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
		// A surface keeps its place under a keyboard, as it did before.
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
	it('reads the strip on mount, and sets the property on the root element', () => {
		stubPage({ height: 740 })

		const { result } = renderHook(() => useCoveredBottom())

		expect(result.current).toBe(60)

		expect(property()).toBe('60px')
	})

	it('reads the strip again when the visual viewport resizes', () => {
		const { viewport, flush } = stubPage({ height: 740 })

		const { result } = renderHook(() => useCoveredBottom())

		// The toolbar hides, and the visual viewport reaches the bottom of the screen.
		viewport.height = 800

		viewport.dispatchEvent(new Event('resize'))

		flush()

		expect(result.current).toBe(0)

		// A strip of zero leaves the fallback of each surface in place.
		expect(property()).toBe('')
	})

	it('reads the strip again when the page scrolls, with no resize', () => {
		// Chrome on iOS corrects its layout viewport on the first scroll. The visual
		// viewport keeps its size, so no resize arrives.
		const { page, flush } = stubPage({ height: 740 })

		const { result } = renderHook(() => useCoveredBottom())

		page.layout = 740

		window.dispatchEvent(new Event('scroll'))

		flush()

		expect(result.current).toBe(0)

		expect(property()).toBe('')
	})

	it('shares one probe between holders, and takes it away with the last', () => {
		stubPage({ height: 740 })

		const first = renderHook(() => useCoveredBottom())

		const second = renderHook(() => useCoveredBottom())

		expect(probes()).toBe(1)

		expect(second.result.current).toBe(60)

		first.unmount()

		expect(probes()).toBe(1)

		expect(property()).toBe('60px')

		second.unmount()

		expect(probes()).toBe(0)

		expect(property()).toBe('')
	})

	it('stops the listeners when the last holder unmounts', () => {
		const { viewport, flush } = stubPage({ height: 740 })

		const { unmount } = renderHook(() => useCoveredBottom())

		unmount()

		const measure = vi.mocked(Element.prototype.getBoundingClientRect)

		measure.mockClear()

		viewport.dispatchEvent(new Event('resize'))

		window.dispatchEvent(new Event('scroll'))

		flush()

		expect(measure).not.toHaveBeenCalled()
	})

	it('holds nothing while disabled', () => {
		stubPage({ height: 740 })

		const { result } = renderHook(() => useCoveredBottom(false))

		expect(result.current).toBe(0)

		expect(probes()).toBe(0)

		expect(property()).toBe('')
	})

	it('holds nothing without a visual viewport', () => {
		vi.stubGlobal('visualViewport', null)

		const { result } = renderHook(() => useCoveredBottom())

		expect(result.current).toBe(0)

		expect(probes()).toBe(0)
	})
})

describe('holdCoveredBottom', () => {
	it('releases once, however many times the release runs', () => {
		stubPage({ height: 740 })

		const first = holdCoveredBottom()

		const second = holdCoveredBottom()

		first()

		first()

		// The second hold still stands.
		expect(property()).toBe('60px')

		second()

		expect(property()).toBe('')
	})
})
