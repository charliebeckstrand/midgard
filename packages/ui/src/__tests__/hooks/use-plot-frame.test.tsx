import { memo } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type FrameSizing, resolveFrameSizing, usePlotFrame } from '../../hooks'
import { act, mockDomGeometry, renderUI, screen } from '../helpers'

type StubInstance = {
	observe: ReturnType<typeof vi.fn>
	disconnect: ReturnType<typeof vi.fn>
	callback: ResizeObserverCallback
}

/**
 * Captures every constructed `ResizeObserver` so a test can drive its callback
 * by hand — the global jsdom stub never fires one.
 */
function installResizeObserverStub() {
	const original = window.ResizeObserver

	const instances: StubInstance[] = []

	class Stub {
		observe = vi.fn()
		unobserve = vi.fn()
		disconnect = vi.fn()

		callback: ResizeObserverCallback

		constructor(cb: ResizeObserverCallback) {
			this.callback = cb

			instances.push(this)
		}
	}

	window.ResizeObserver = Stub as unknown as typeof ResizeObserver

	return {
		instances,
		restore: () => {
			window.ResizeObserver = original
		},
	}
}

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

describe('usePlotFrame', () => {
	let stub: ReturnType<typeof installResizeObserverStub>

	beforeEach(() => {
		stub = installResizeObserverStub()
	})

	afterEach(() => {
		stub.restore()
	})

	function firstObserver(): StubInstance {
		const instance = stub.instances[0]

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

	it('redraws on a width change but not a height-only change under an aspect policy', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={undefined} sizing={{ mode: 'aspect', ratio: 2 }} onMarks={onMarks} />)

		const plot = screen.getByTestId('plot')

		// The width resolves, and the height derives from it — not the container.
		resizeTo(plot, { width: 300, height: 200 })

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')

		expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('150')

		const drawsAfterWidth = onMarks.mock.calls.length

		// A height-only resize changes nothing the policy consumes, so the
		// untracked axis stays unread and the marks never redraw.
		resizeTo(plot, { width: 300, height: 500 })

		expect(onMarks).toHaveBeenCalledTimes(drawsAfterWidth)

		expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('150')
	})

	it('constructs no observer and resolves from props when the size is fully fixed', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={600} sizing={{ mode: 'aspect', ratio: 2 }} onMarks={onMarks} />)

		// Nothing feeds the sizing, so the frame observes nothing at all.
		expect(stub.instances).toHaveLength(0)

		// Width from the prop, height derived — both ready on the first paint.
		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('600')

		expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('300')
	})

	it('redraws on a height change under a fill policy', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={undefined} sizing={{ mode: 'fill' }} onMarks={onMarks} />)

		const plot = screen.getByTestId('plot')

		resizeTo(plot, { width: 300, height: 200 })

		expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('200')

		const drawsAfterFirst = onMarks.mock.calls.length

		// The free-form height feeds the sizing, so a height change must redraw.
		resizeTo(plot, { width: 300, height: 260 })

		expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('260')

		expect(onMarks.mock.calls.length).toBeGreaterThan(drawsAfterFirst)
	})
})

describe('resolveFrameSizing', () => {
	it('derives the height from the width and reserves the same ratio', () => {
		expect(resolveFrameSizing({ mode: 'aspect', ratio: 16 / 9 }, 320, 0)).toEqual({
			height: 180,
			reserve: { mode: 'aspect', ratio: 16 / 9 },
		})

		expect(resolveFrameSizing({ mode: 'aspect', ratio: 2 }, 400, 0)).toEqual({
			height: 200,
			reserve: { mode: 'aspect', ratio: 2 },
		})
	})

	it('holds a fixed height with nothing to reserve, ignoring the container', () => {
		expect(resolveFrameSizing({ mode: 'fixed', height: 240 }, 320, 275)).toEqual({
			height: 240,
			reserve: null,
		})
	})

	it('fills the container height and reserves nothing when free-form', () => {
		expect(resolveFrameSizing({ mode: 'fill' }, 320, 275)).toEqual({
			height: 275,
			reserve: null,
		})
	})

	it('yields no height until the width is measured, still reserving the ratio', () => {
		expect(resolveFrameSizing({ mode: 'aspect', ratio: 16 / 9 }, 0, 0)).toEqual({
			height: 0,
			reserve: { mode: 'aspect', ratio: 16 / 9 },
		})
	})

	it('fits the height to the width-bound radius plus the vertical margin, reserving offset and floor', () => {
		// radius = 400/2 - 100 = 100; height = 2*100 + 2*20; offset = 2*(20 - 100); min = 2*20.
		expect(resolveFrameSizing({ mode: 'content', hMargin: 100, vMargin: 20 }, 400, 0)).toEqual({
			height: 240,
			reserve: { mode: 'content', offset: -160, min: 40 },
		})
	})

	it('floors the content radius at zero instead of going negative', () => {
		// The margin alone exceeds the half-width, so only the vertical margin remains,
		// which is exactly the reserved `min` the CSS floor holds the box at.
		expect(resolveFrameSizing({ mode: 'content', hMargin: 300, vMargin: 20 }, 400, 0)).toEqual({
			height: 40,
			reserve: { mode: 'content', offset: -560, min: 40 },
		})
	})

	it('reserves the content offset and floor before the width is measured, so the box holds', () => {
		// height stays 0 until the width lands, but the reserve is already known —
		// the box holds its height from the first paint instead of collapsing.
		expect(resolveFrameSizing({ mode: 'content', hMargin: 100, vMargin: 20 }, 0, 0)).toEqual({
			height: 0,
			reserve: { mode: 'content', offset: -160, min: 40 },
		})
	})
})
