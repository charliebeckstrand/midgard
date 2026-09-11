import { act, render, renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PdfViewer, type PdfViewerMagnifierZoom } from '../../components/pdf-viewer'
import { usePdfViewer } from '../../components/pdf-viewer/use-pdf-viewer'
import {
	lensOffset,
	resolveMagnifier,
	resolveMagnifierChoice,
	usePdfViewerMagnifier,
} from '../../components/pdf-viewer/use-pdf-viewer-magnifier'
import { fireEvent, renderUI, screen } from '../helpers'

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

describe('resolveMagnifierChoice', () => {
	const steps = { zoom: 'md', size: 'md', delay: 'default' }

	/*
	 * Whether a loupe was asked for at all, and which control the toolbar carries for it, are
	 * read straight off the prop in `usePdfViewer` — so they are asserted through the viewer,
	 * below, rather than here. What is left for this seam is the one thing it decides: which
	 * step each setting lands on.
	 */
	it('takes the middle step for a setting the consumer did not name', () => {
		expect(resolveMagnifierChoice({})).toEqual(steps)
	})

	it('fills in only the steps an object leaves out', () => {
		expect(resolveMagnifierChoice({ zoom: 'lg' })).toEqual({ ...steps, zoom: 'lg' })

		expect(resolveMagnifierChoice({ delay: 'none', size: 'sm' })).toEqual({
			zoom: 'md',
			size: 'sm',
			delay: 'none',
		})
	})

	/**
	 * A setting written as `undefined` is a setting the consumer did not name, and takes its
	 * default — rather than erasing one, which a spread over the defaults would do.
	 */
	it('defaults a step the consumer left undefined', () => {
		expect(resolveMagnifierChoice({ zoom: undefined, size: 'lg' })).toEqual({
			...steps,
			size: 'lg',
		})
	})
})

describe('resolveMagnifier', () => {
	/**
	 * The middle step of each scale is what the loupe drew with before the scales existed. So
	 * this is the test that the named steps changed the vocabulary and nothing else.
	 */
	it('holds the loupe as it was at the middle of every scale', () => {
		expect(resolveMagnifier({ zoom: 'md', size: 'md', delay: 'default' })).toEqual({
			zoom: 2.5,
			size: 180,
			delay: 300,
		})
	})

	it('reads each step off as the number the lens draws with', () => {
		expect(resolveMagnifier({ zoom: 'sm', size: 'sm', delay: 'none' })).toEqual({
			zoom: 2,
			size: 140,
			delay: 0,
		})

		expect(resolveMagnifier({ zoom: 'lg', size: 'lg', delay: 'default' })).toEqual({
			zoom: 4,
			size: 240,
			delay: 300,
		})
	})

	/** `'none'` is a dwell of zero, not an absent one: the lens opens the moment it is over ink. */
	it('reads the absent dwell as zero', () => {
		expect(resolveMagnifier({ zoom: 'md', size: 'md', delay: 'none' }).delay).toBe(0)
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
 * What an inline `magnifier` object costs the viewer, which is nothing.
 *
 * `magnifier={{ mode: 'config' }}` is a new object on every render of the consumer, and
 * config mode makes an object the common shape rather than the exception a different power
 * used to be. `usePdfViewer` memoizes its context value so that a render touching none of its
 * fields leaves the toolbar, the thumbnail rail and every region on the page alone; a prop
 * resolved on identity would have retired that guarantee for every viewer that configures a
 * loupe.
 */
describe('usePdfViewer over a re-rendered magnifier prop', () => {
	const pages = [{ id: 'a', src: '/page-1.png' }]

	/** A viewer in config mode, whose `magnifier` object is built fresh on every render. */
	function configured(zoom: PdfViewerMagnifierZoom) {
		const initialProps: { zoom: PdfViewerMagnifierZoom } = { zoom }

		return renderHook(
			({ zoom: step }) => usePdfViewer({ pages, magnifier: { mode: 'config', zoom: step } }),
			{ initialProps },
		)
	}

	it('holds the context value across a fresh object carrying the same settings', () => {
		const { result, rerender } = configured('md')

		const first = result.current

		rerender({ zoom: 'md' })

		expect(result.current).toBe(first)
	})

	/** And still moves when the consumer actually changes one. */
	it('rebuilds it when a setting changes', () => {
		const { result, rerender } = configured('md')

		expect(result.current.magnifierSettings).toEqual({ zoom: 2.5, size: 180, delay: 300 })

		rerender({ zoom: 'lg' })

		expect(result.current.magnifierSettings).toEqual({ zoom: 4, size: 180, delay: 300 })
	})
})

/**
 * The two toolbar controls, and the dialog behind the second of them.
 *
 * Nothing here opens a lens — `@floating-ui/react` is mocked away in this project and its
 * `useHover` contributes no reference props, so no dwell can elapse under jsdom. What is
 * asserted is the chrome: which control the mode puts in the bar, what the dialog holds, and
 * that a press in it reaches the reader's settings.
 */
describe('PdfViewer magnifier controls', () => {
	const pages = [{ src: '/page-1.png', width: 850, height: 1100 }]

	/** The default, and what every viewer that asked for a loupe had before `mode` existed. */
	it('puts a switch in the toolbar in simple mode', () => {
		renderUI(<PdfViewer pages={pages} magnifier />)

		const control = screen.getByRole('button', { name: 'Turn magnifier off' })

		expect(control).toHaveAttribute('aria-pressed', 'true')

		expect(control).not.toHaveAttribute('aria-haspopup')
	})

	/**
	 * `aria-pressed` would be wrong on this one and `aria-haspopup` is right: the press opens a
	 * dialog and switches nothing, and the two attributes say which it is.
	 */
	it('puts the settings control in the toolbar in config mode', () => {
		renderUI(<PdfViewer pages={pages} magnifier={{ mode: 'config' }} />)

		const control = screen.getByRole('button', { name: 'Magnifier settings' })

		expect(control).toHaveAttribute('aria-haspopup', 'dialog')
		expect(control).toHaveAttribute('aria-expanded', 'false')

		expect(control).not.toHaveAttribute('aria-pressed')

		expect(screen.queryByRole('button', { name: 'Turn magnifier off' })).not.toBeInTheDocument()
	})

	it('opens the dialog on the press, showing the settings the viewer is on', () => {
		renderUI(<PdfViewer pages={pages} magnifier={{ mode: 'config', size: 'lg' }} />)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Magnifier settings' }))

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByRole('switch', { name: 'Show the magnifier' })).toBeChecked()

		// The consumer asked for the large lens, so that is the option standing selected.
		expect(screen.getByRole('radio', { name: 'Large' })).toBeChecked()
		expect(screen.getByRole('radio', { name: 'Medium' })).not.toBeChecked()

		// The two the consumer left alone open on the middle step and the default dwell.
		expect(screen.getByRole('radio', { name: '2.5×' })).toBeChecked()
		expect(screen.getByRole('radio', { name: 'Default' })).toBeChecked()
	})

	it('reports the step the reader picks, with the settings they left alone', () => {
		const onMagnifierChange = vi.fn()

		renderUI(
			<PdfViewer
				pages={pages}
				magnifier={{ mode: 'config' }}
				onMagnifierChange={onMagnifierChange}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Magnifier settings' }))

		fireEvent.click(screen.getByRole('radio', { name: '4×' }))

		expect(onMagnifierChange).toHaveBeenCalledExactlyOnceWith({
			enabled: true,
			zoom: 'lg',
			size: 'md',
			delay: 'default',
		})

		// The second press carries the first one's choice, rather than reverting to the prop.
		fireEvent.click(screen.getByRole('radio', { name: 'None' }))

		expect(onMagnifierChange).toHaveBeenLastCalledWith({
			enabled: true,
			zoom: 'lg',
			size: 'md',
			delay: 'none',
		})

		expect(screen.getByRole('radio', { name: '4×' })).toBeChecked()
	})

	/**
	 * The switch the toolbar control stopped being. Without it, config mode would take away the
	 * one thing simple mode always offered.
	 */
	it('turns the loupe off from inside the dialog', () => {
		const onMagnifierChange = vi.fn()

		renderUI(
			<PdfViewer
				pages={pages}
				magnifier={{ mode: 'config' }}
				onMagnifierChange={onMagnifierChange}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Magnifier settings' }))

		fireEvent.click(screen.getByRole('switch', { name: 'Show the magnifier' }))

		expect(onMagnifierChange).toHaveBeenCalledExactlyOnceWith({
			enabled: false,
			zoom: 'md',
			size: 'md',
			delay: 'default',
		})

		// The control stays where it is, and stops wearing the fill — that press is what brings
		// the loupe back.
		expect(screen.getByRole('button', { name: 'Magnifier settings' })).toHaveAttribute(
			'data-variant',
			'plain',
		)
	})

	/** No loupe offered, no control of either kind — `mode` does not conjure one. */
	it('offers neither control where the consumer asked for no loupe', () => {
		renderUI(<PdfViewer pages={pages} />)

		expect(screen.queryByRole('button', { name: 'Magnifier settings' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Turn magnifier off' })).not.toBeInTheDocument()
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

	/** A page frame that reports where it is, so a pan can be staged by moving it. */
	function frameAt(top: number) {
		const frame = { getBoundingClientRect: () => ({ left: 0, top, width: 800, height: 1000 }) }

		return frame as unknown as HTMLElement
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

			const scroll = result.current.viewportProps.onScroll as () => void

			// The page starts at the top of the viewport; the pointer rests 300px down it.
			act(() => {
				move(pointerOn(frameAt(0), 120, 300))
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

			const frame = {
				getBoundingClientRect: () => ({ left: 0, top, width: 800, height: 1000 }),
			} as unknown as HTMLElement

			const { result } = renderHook(() => usePdfViewerMagnifier(settings))

			const move = result.current.referenceProps.onPointerMove as (
				event: ReactPointerEvent<HTMLElement>,
			) => void

			const scroll = result.current.viewportProps.onScroll as () => void

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

			const scroll = result.current.viewportProps.onScroll as () => void

			act(() => {
				move(pointerOn(frameAt(0), 120, 300))
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

	/** A loupe the consumer never asked for attaches nothing to the viewport to begin with. */
	it('watches for no pan when there is no loupe', () => {
		const { result } = renderHook(() => usePdfViewerMagnifier(null))

		expect(result.current.viewportProps).toEqual({})
	})
})
