import { memo } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type FrameSizing, usePlotFrame } from '../../hooks'
import { act, mockDomGeometry, renderUI, screen } from '../helpers'
import { type ResizeObserverStub, stubResizeObserver } from '../helpers/stub-resize-observer'

// The frame's expensive subtree: memoized on the resolved size, so it re-renders
// only when a dimension it draws from changes — the render a resize should avoid.
// A bail-out in `usePlotFrame` may still re-run the parent once, but React never
// descends into a memo whose props are unchanged, so its render count is the
// faithful signal for "the frame re-rendered".
const Marks = memo(function Marks({
	width,
	height,
	onRender,
}: {
	width: number
	height: number
	onRender: () => void
}) {
	onRender()

	return <span data-testid="marks" data-width={width} data-height={height} />
})

function Probe({
	width,
	sizing,
	onMarks,
}: {
	width: number | undefined
	sizing: FrameSizing
	onMarks: () => void
}) {
	const plot = usePlotFrame(width, sizing)

	return (
		<div ref={plot.ref} data-testid="plot">
			<Marks width={plot.width} height={plot.height} onRender={onMarks} />
		</div>
	)
}

/**
 * The observer's own lifecycle, which is what the stub is for.
 *
 * Which axis a sizing policy reads is a question about a real container, and
 * `browser/plot-frame.test.tsx` now asks it there: a height-only resize that an
 * aspect policy must ignore, and the same resize that a fill policy must redraw
 * on. What stays is the bookkeeping around it, and none of it is a measurement.
 * That a fully fixed size constructs no observer at all, that an unchanged size
 * is equality-guarded out, that a positional swap re-targets the observer onto
 * the live node, and that a notification arriving from a detached node is
 * skipped rather than committed as a zero.
 *
 * Each needs a notification produced on demand — one that repeats a size, or
 * arrives from a node already detached — and a real `ResizeObserver` delivers
 * what layout produces. `resolveFrameSizing`, the pure function these resolve
 * through, is pinned in `resolve-frame-sizing.test.ts` with no DOM at all.
 */
describe('usePlotFrame observer lifecycle', () => {
	let observers: ResizeObserverStub[]

	beforeEach(() => {
		observers = stubResizeObserver()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	function firstObserver(): ResizeObserverStub {
		const instance = observers[0]

		if (!instance) throw new Error('no ResizeObserver was constructed')

		return instance
	}

	/** Reports a new container size to the hook through its captured observer. */
	function resizeTo(el: Element, box: { width: number; height: number }) {
		mockDomGeometry(el, { clientWidth: box.width, clientHeight: box.height })

		act(() => {
			const observer = firstObserver()

			observer.callback([], observer as unknown as ResizeObserver)
		})
	}

	it('constructs no observer and resolves from props when the size is fully fixed', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={600} sizing={{ mode: 'aspect', ratio: 2 }} onMarks={onMarks} />)

		// Nothing feeds the sizing, so the frame observes nothing at all.
		expect(observers).toHaveLength(0)

		// Width from the prop, height derived — both ready on the first paint.
		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('600')

		expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('300')
	})

	it('tracks resize notifications live and swallows the ones that change nothing', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={undefined} sizing={{ mode: 'aspect', ratio: 2 }} onMarks={onMarks} />)

		const plot = screen.getByTestId('plot')

		resizeTo(plot, { width: 300, height: 0 })

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')

		// Each changed size commits as it arrives — no settle window, no timers —
		// so the final notification's size is already the drawn one.
		resizeTo(plot, { width: 320, height: 0 })

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('320')

		resizeTo(plot, { width: 360, height: 0 })

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('360')

		const drawsAfterBurst = onMarks.mock.calls.length

		// An unchanged size is equality-guarded out: no re-render at all.
		resizeTo(plot, { width: 360, height: 0 })

		expect(onMarks).toHaveBeenCalledTimes(drawsAfterBurst)
	})

	it('re-targets the observer when React swaps the plot node without unmounting the hook', () => {
		const onMarks = vi.fn()

		// Swapping the wrapper's element type discards its subtree — React
		// recreates the plot div positionally while the hook's component stays
		// mounted, the shape a re-arranging layout branch produces with unkeyed
		// children. The frozen-frame defect: an observer attached by a
		// policy-keyed effect would keep watching the detached node.
		function SwapProbe({ swap }: { swap: boolean }) {
			const plot = usePlotFrame(undefined, { mode: 'aspect', ratio: 2 })

			const region = (
				<div ref={plot.ref} data-testid="plot">
					<Marks width={plot.width} height={plot.height} onRender={onMarks} />
				</div>
			)

			return swap ? <section>{region}</section> : <main>{region}</main>
		}

		const { rerender } = renderUI(<SwapProbe swap={false} />)

		const first = screen.getByTestId('plot')

		resizeTo(first, { width: 300, height: 0 })

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')

		rerender(<SwapProbe swap />)

		const second = screen.getByTestId('plot')

		expect(second).not.toBe(first)

		// The observer let go of the detached node and watches the live one.
		expect(firstObserver().disconnect).toHaveBeenCalled()

		const live = observers.at(-1)

		if (!live || live === firstObserver()) throw new Error('no observer re-targeted the new node')

		expect(live.observe).toHaveBeenCalledWith(second)

		// And its notifications still commit: the frame tracks the new node.
		mockDomGeometry(second, { clientWidth: 340, clientHeight: 0 })

		act(() => {
			live.callback([], live as unknown as ResizeObserver)
		})

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('340')
	})

	it('ignores a measurement from a detached node instead of committing its zero size', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={undefined} sizing={{ mode: 'aspect', ratio: 2 }} onMarks={onMarks} />)

		const plot = screen.getByTestId('plot')

		resizeTo(plot, { width: 300, height: 0 })

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')

		// A commit that re-arranges the layout around the plot detaches its node
		// before the swap's ref updates land; a notification (or the settle
		// effect) racing that window measures the detached node at 0 × 0 —
		// garbage that would flip every size-driven policy downstream. Simulate
		// the race by reporting the node detached, jsdom-style: a defined
		// property, so React's own unmount cleanup still finds the node in place.
		Object.defineProperty(plot, 'isConnected', { value: false, configurable: true })

		mockDomGeometry(plot, { clientWidth: 0, clientHeight: 0 })

		act(() => {
			const observer = firstObserver()

			observer.callback([], observer as unknown as ResizeObserver)
		})

		// The garbage measurement is skipped: the frame holds its last real size.
		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')
	})
})
