import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
	holdVisualViewport,
	useVisualViewport,
	visibleFrame,
} from '../../hooks/use-visual-viewport'

/** A box fixed to a layout viewport of 800 px. */
const BOX = { top: 0, height: 800 }

/** The properties that the reading writes on the root element. */
const TOP = '--visual-viewport-top'

const HEIGHT = '--visual-viewport-height'

/**
 * Stubs a page whose layout viewport the test can move, under a visual viewport
 * it can move too. jsdom lays nothing out, so each box reads the layout
 * viewport. The frames queue, so the test runs them when it chooses.
 */
function stubPage(reading: { layout?: number; height: number; offsetTop?: number }) {
	const page = { layout: reading.layout ?? BOX.height }

	const viewport = Object.assign(new EventTarget(), {
		offsetTop: reading.offsetTop ?? 0,
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

/** The values of the properties on the root element, `''` for each that is not set. */
function properties(): [string, string] {
	const { style } = document.documentElement

	return [style.getPropertyValue(TOP), style.getPropertyValue(HEIGHT)]
}

/** The number of probes in the page. */
function probes(): number {
	return document.querySelectorAll('body > [aria-hidden="true"][style*="fixed"]').length
}

describe('visibleFrame', () => {
	it('reads the part of the box above a toolbar on the bottom edge', () => {
		expect(visibleFrame(BOX, { offsetTop: 0, height: 740, scale: 1 })).toEqual({
			top: 0,
			height: 740,
		})
	})

	it('reads nothing when the visual viewport is the full box', () => {
		expect(visibleFrame(BOX, { offsetTop: 0, height: 800, scale: 1 })).toBeNull()
	})

	it('reads a fraction of a pixel as nothing', () => {
		expect(visibleFrame(BOX, { offsetTop: 0, height: 799.5, scale: 1 })).toBeNull()
	})

	it('reads the part of the box above a keyboard', () => {
		expect(visibleFrame(BOX, { offsetTop: 0, height: 480, scale: 1 })).toEqual({
			top: 0,
			height: 480,
		})
	})

	it('counts the offset of a visual viewport that the page scrolled', () => {
		// iOS scrolls the visual viewport over the layout viewport to show a field
		// above the keyboard.
		expect(visibleFrame(BOX, { offsetTop: 120, height: 480, scale: 1 })).toEqual({
			top: 120,
			height: 480,
		})
	})

	it('measures from the top of the fixed box', () => {
		expect(
			visibleFrame({ top: -20, height: 800 }, { offsetTop: 0, height: 740, scale: 1 }),
		).toEqual({ top: 20, height: 740 })
	})

	it('reads a pinch zoom as nothing', () => {
		expect(visibleFrame(BOX, { offsetTop: 100, height: 400, scale: 2 })).toBeNull()
	})
})

describe('useVisualViewport', () => {
	it('reads the frame on mount, and sets the properties on the root element', () => {
		stubPage({ height: 740 })

		const { result } = renderHook(() => useVisualViewport())

		expect(result.current).toEqual({ top: 0, height: 740 })

		expect(properties()).toEqual(['0px', '740px'])
	})

	it('reads the frame again when the visual viewport resizes', () => {
		const { viewport, flush } = stubPage({ height: 740 })

		const { result } = renderHook(() => useVisualViewport())

		// The toolbar hides, and the visual viewport reaches the bottom of the screen.
		viewport.height = 800

		viewport.dispatchEvent(new Event('resize'))

		flush()

		expect(result.current).toBeNull()

		// A full frame leaves the fallback of each surface in place.
		expect(properties()).toEqual(['', ''])
	})

	it('reads the frame again when the visual viewport scrolls', () => {
		const { viewport, flush } = stubPage({ height: 480 })

		const { result } = renderHook(() => useVisualViewport())

		viewport.offsetTop = 120

		viewport.dispatchEvent(new Event('scroll'))

		flush()

		expect(result.current).toEqual({ top: 120, height: 480 })

		expect(properties()).toEqual(['120px', '480px'])
	})

	it('reads the frame again when the page scrolls, with no resize', () => {
		// Chrome on iOS can move its layout viewport on a scroll. The visual viewport
		// keeps its size, so no resize arrives.
		const { page, flush } = stubPage({ height: 740 })

		const { result } = renderHook(() => useVisualViewport())

		page.layout = 740

		window.dispatchEvent(new Event('scroll'))

		flush()

		expect(result.current).toBeNull()

		expect(properties()).toEqual(['', ''])
	})

	it('reads the frame on a page that is scrolled down', () => {
		// The docs page in the report was scrolled when the sheet opened, under the
		// toolbar of Chrome on iOS.
		stubPage({ height: 740 })

		vi.stubGlobal('scrollY', 120)

		const { result } = renderHook(() => useVisualViewport())

		expect(result.current).toEqual({ top: 0, height: 740 })
	})

	it('shares one probe between holders, and takes it away with the last', () => {
		stubPage({ height: 740 })

		const first = renderHook(() => useVisualViewport())

		const second = renderHook(() => useVisualViewport())

		expect(probes()).toBe(1)

		expect(second.result.current).toEqual({ top: 0, height: 740 })

		first.unmount()

		expect(probes()).toBe(1)

		expect(properties()).toEqual(['0px', '740px'])

		second.unmount()

		expect(probes()).toBe(0)

		expect(properties()).toEqual(['', ''])
	})

	it('stops the listeners when the last holder unmounts', () => {
		const { viewport, flush } = stubPage({ height: 740 })

		const { unmount } = renderHook(() => useVisualViewport())

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

		const { result } = renderHook(() => useVisualViewport(false))

		expect(result.current).toBeNull()

		expect(probes()).toBe(0)

		expect(properties()).toEqual(['', ''])
	})

	it('holds nothing without a visual viewport', () => {
		vi.stubGlobal('visualViewport', null)

		const { result } = renderHook(() => useVisualViewport())

		expect(result.current).toBeNull()

		expect(probes()).toBe(0)
	})
})

describe('holdVisualViewport', () => {
	it('releases once, however many times the release runs', () => {
		stubPage({ height: 740 })

		const first = holdVisualViewport()

		const second = holdVisualViewport()

		first()

		first()

		// The second hold still stands.
		expect(properties()).toEqual(['0px', '740px'])

		second()

		expect(properties()).toEqual(['', ''])
	})
})
