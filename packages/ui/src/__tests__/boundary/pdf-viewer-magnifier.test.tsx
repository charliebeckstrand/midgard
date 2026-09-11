import { act, render, renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { PdfViewer } from '../../components/pdf-viewer'
import {
	lensOffset,
	resolveMagnifier,
	usePdfViewerMagnifier,
} from '../../components/pdf-viewer/use-pdf-viewer-magnifier'

/**
 * The hover loupe's settled parts: what the boolean-or-object prop resolves to, and where the
 * lens puts its copy of the page.
 *
 * The open state itself is deliberately not asserted here. `@floating-ui/react` is mocked away
 * in this project (`__tests__/mocks/floating-ui`), and its `useHover` contributes no reference
 * props — so nothing in jsdom can dwell, open, or track. The dwell and the tracking are
 * floating-ui's own behaviour rather than this component's; what belongs to the component is
 * the arithmetic below, which is why it was extracted to a pure seam the way
 * `toFractionRect` was.
 */

describe('resolveMagnifier', () => {
	it('is off unless the consumer asks', () => {
		expect(resolveMagnifier(undefined)).toBeNull()
		expect(resolveMagnifier(false)).toBeNull()
	})

	it('takes the defaults for a bare `magnifier`', () => {
		expect(resolveMagnifier(true)).toEqual({ zoom: 2.5, size: 180, delay: 300 })
	})

	it('fills in the settings an object leaves out', () => {
		expect(resolveMagnifier({ zoom: 4 })).toEqual({ zoom: 4, size: 180, delay: 300 })
		expect(resolveMagnifier({ delay: 0, size: 240 })).toEqual({
			zoom: 2.5,
			size: 240,
			delay: 0,
		})
	})

	/** An explicit zero is a setting, not an absence — `{ delay: 0 }` means open at once. */
	it('keeps a zero the consumer meant', () => {
		expect(resolveMagnifier({ delay: 0 })?.delay).toBe(0)
	})
})

describe('lensOffset', () => {
	/**
	 * The whole contract: whatever the pointer is over ends up at the centre of the lens.
	 * Applying the transform by hand is what proves it — `offset + zoom * point === centre`.
	 */
	it('puts the pointed-at page coordinate under the crosshair', () => {
		const zoom = 2.5
		const size = 180
		const point = { x: 120, y: 300 }

		const offset = lensOffset(point, zoom, size)

		expect(offset.x + zoom * point.x).toBe(size / 2)
		expect(offset.y + zoom * point.y).toBe(size / 2)
	})

	it('holds at the page origin, where the copy hangs off the lens', () => {
		expect(lensOffset({ x: 0, y: 0 }, 2, 180)).toEqual({ x: 90, y: 90 })
	})

	it('scales with the magnification, not with the page', () => {
		expect(lensOffset({ x: 10, y: 10 }, 2, 100)).toEqual({ x: 30, y: 30 })
		expect(lensOffset({ x: 10, y: 10 }, 4, 100)).toEqual({ x: 10, y: 10 })
	})
})

describe('PdfViewer without a magnifier', () => {
	it('renders no lens, and asks for none', () => {
		render(<PdfViewer pages={[{ src: '/page-1.png', width: 850, height: 1100 }]} />)

		// By `data-slot`, which is how the lens is actually addressed — a `data-testid` query
		// would match nothing whether or not it rendered, and pass either way.
		expect(document.querySelector('[data-slot="pdf-viewer-magnifier"]')).toBeNull()
	})

	/** Enabled but never hovered is still nothing painted. */
	it('renders no lens before the pointer has rested on the page', () => {
		render(<PdfViewer pages={[{ src: '/page-1.png', width: 850, height: 1100 }]} magnifier />)

		expect(document.querySelector('[data-slot="pdf-viewer-magnifier"]')).toBeNull()
	})
})

/**
 * The pan, which is the loupe's one blind gesture.
 *
 * Every other way the page moves under the lens arrives as a pointer event. A pan does not: the
 * reader scrolls, the page slides, the cursor has not moved, and nothing tells the lens that the
 * ink it is holding came from somewhere the page no longer is. So the pan is watched for
 * directly — the lens leaves for the gesture and comes back after the same dwell that opened it.
 *
 * Watched for on the way down through the document, which is why every pan below is staged as a
 * scroll event dispatched at the document rather than as a prop on the viewport. A scroll event
 * does not bubble, and the page moves just as far when the scroller is a drawer around the viewer
 * or the document itself.
 *
 * Asserted on the hook rather than through the viewer, and not for the usual reason. The lens
 * needs a measured frame to paint (`PdfViewerMagnifier` returns null without one) and jsdom lays
 * nothing out, so no rendered assertion could tell a withdrawn lens from an unmeasured one. At
 * this level the frame is a stand-in whose rect is ours to move — which is the only way to write
 * down the thing the feature is actually for: the same cursor, over a page that has shifted
 * beneath it, is a different place on the page.
 *
 * Nothing here can open the lens by hovering — `@floating-ui/react` is mocked away and its
 * `useHover` contributes no props — so every opening below is unambiguously the settle's doing.
 */
describe('usePdfViewerMagnifier over a pan', () => {
	const settings = { zoom: 2.5, size: 180, delay: 300 }

	/**
	 * A page frame that reports where it is, so a pan can be staged by moving it.
	 *
	 * A real element, in the document, because the watch asks of every scroll whether the
	 * scroller holds the page — a frame in no document is held by nothing, and every pan below
	 * would read as someone scrolling a list elsewhere on the screen.
	 */
	function frameAt(top: () => number) {
		const frame = document.createElement('div')

		frame.getBoundingClientRect = () =>
			({ left: 0, top: top(), width: 800, height: 1000 }) as DOMRect

		document.body.append(frame)

		onTestFinished(() => frame.remove())

		return frame
	}

	function pointerOn(frame: HTMLElement, clientX: number, clientY: number) {
		return {
			pointerType: 'mouse',
			clientX,
			clientY,
			currentTarget: frame,
		} as unknown as ReactPointerEvent<HTMLElement>
	}

	it('brings the lens back at the pointer once the page comes to rest', () => {
		vi.useFakeTimers()

		try {
			const { result } = renderHook(() => usePdfViewerMagnifier(settings))

			const move = result.current.referenceProps.onPointerMove as (
				event: ReactPointerEvent<HTMLElement>,
			) => void

			const scroll = () => document.dispatchEvent(new Event('scroll'))

			const frame = frameAt(() => 0)

			// The page starts at the top of the viewport; the pointer rests 300px down it.
			act(() => {
				move(pointerOn(frame, 120, 300))
			})

			// A pointer alone opens nothing here: the dwell belongs to floating-ui, which is mocked.
			expect(result.current.open).toBe(false)

			act(() => {
				scroll()
			})

			act(() => {
				vi.advanceTimersByTime(299)
			})

			// The reader's own dwell, not a settle time of this hook's invention — a consumer that
			// tuned one has tuned both.
			expect(result.current.open).toBe(false)

			act(() => {
				vi.advanceTimersByTime(1)
			})

			expect(result.current.open).toBe(true)
			expect(result.current.point).toEqual({ x: 120, y: 300 })
		} finally {
			vi.useRealTimers()
		}
	})

	/**
	 * The whole point of withdrawing rather than following: what the lens shows has to be measured
	 * against where the page ended up, not where it was when the pointer last moved.
	 */
	it('re-reads the pointer against a page that moved under it', () => {
		vi.useFakeTimers()

		try {
			/*
			 * One frame that moves, rather than a second frame: the hook keeps the node the pointer
			 * arrived on, and a pan moves that node. Replacing it would hand the hook the new
			 * position through a pointer event, which is the one thing a pan never does.
			 */
			let top = 0

			const frame = frameAt(() => top)

			const { result } = renderHook(() => usePdfViewerMagnifier(settings))

			const move = result.current.referenceProps.onPointerMove as (
				event: ReactPointerEvent<HTMLElement>,
			) => void

			const scroll = () => document.dispatchEvent(new Event('scroll'))

			act(() => {
				move(pointerOn(frame, 120, 300))
			})

			// The pan: the page rides 200px up the viewport while the cursor stays exactly where it
			// was. No pointer event accompanies it, which is what makes it invisible to the loupe.
			top = -200

			act(() => {
				scroll()
			})

			act(() => {
				vi.advanceTimersByTime(300)
			})

			// 200px further down the page, from a cursor that never moved.
			expect(result.current.point).toEqual({ x: 120, y: 500 })
		} finally {
			vi.useRealTimers()
		}
	})

	/*
	 * A pan that carries the page out from under the cursor — or a reader who leaves mid-gesture —
	 * has nowhere to put a lens, and must not guess at one.
	 */
	it('brings nothing back when the pointer has left the page', () => {
		vi.useFakeTimers()

		try {
			const { result } = renderHook(() => usePdfViewerMagnifier(settings))

			const move = result.current.referenceProps.onPointerMove as (
				event: ReactPointerEvent<HTMLElement>,
			) => void

			const leave = result.current.referenceProps.onPointerLeave as () => void

			const scroll = () => document.dispatchEvent(new Event('scroll'))

			const frame = frameAt(() => 0)

			act(() => {
				move(pointerOn(frame, 120, 300))
				scroll()
				leave()
			})

			act(() => {
				vi.advanceTimersByTime(300)
			})

			expect(result.current.open).toBe(false)
			expect(result.current.point).toBeNull()
		} finally {
			vi.useRealTimers()
		}
	})

	/*
	 * A scroll is only a pan where the scroller holds the page. A list somewhere else on the
	 * screen moves nothing the lens is showing, and a lens that withdrew for one would be
	 * flinching at nothing — which is what a watch on the whole document has to answer for.
	 */
	it('stands still for a scroller that does not hold the page', () => {
		vi.useFakeTimers()

		try {
			const { result } = renderHook(() => usePdfViewerMagnifier(settings))

			const move = result.current.referenceProps.onPointerMove as (
				event: ReactPointerEvent<HTMLElement>,
			) => void

			const elsewhere = document.createElement('div')

			document.body.append(elsewhere)

			onTestFinished(() => elsewhere.remove())

			const frame = frameAt(() => 0)

			act(() => {
				move(pointerOn(frame, 120, 300))
			})

			act(() => {
				elsewhere.dispatchEvent(new Event('scroll'))
			})

			act(() => {
				vi.advanceTimersByTime(300)
			})

			// The settle is what would have opened it; nothing was scheduled, so nothing did.
			expect(result.current.open).toBe(false)
		} finally {
			vi.useRealTimers()
		}
	})

	/** A loupe the consumer never asked for attaches nothing, and a pan is nothing to it. */
	it('watches for no pan when there is no loupe', () => {
		const { result } = renderHook(() => usePdfViewerMagnifier(null))

		expect(result.current.referenceProps).toEqual({})

		act(() => {
			document.dispatchEvent(new Event('scroll'))
		})

		expect(result.current.open).toBe(false)
	})
})
