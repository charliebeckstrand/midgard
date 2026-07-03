import { memo } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type FrameSizing, RESIZE_SETTLE_MS, usePlotFrame } from '../../primitives/plot'
import { act, mockDomGeometry, renderUI, screen, withFakeTime } from '../helpers'

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

	it('reveals immediately, then never redraws for a height-only change under an aspect policy', async () => {
		await withFakeTime(async (clock) => {
			const onMarks = vi.fn()

			renderUI(<Probe width={undefined} sizing={{ mode: 'aspect', ratio: 2 }} onMarks={onMarks} />)

			const plot = screen.getByTestId('plot')

			// The first real box is a reveal: no settle wait, and the height
			// derives from the width — not the container.
			resizeTo(plot, { width: 300, height: 200 })

			expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')

			expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('150')

			const drawsAfterWidth = onMarks.mock.calls.length

			// A height-only resize changes nothing the policy consumes: even
			// after the settle window, the re-measure bails and marks stay put.
			resizeTo(plot, { width: 300, height: 500 })

			await clock.advance(RESIZE_SETTLE_MS)

			expect(onMarks).toHaveBeenCalledTimes(drawsAfterWidth)

			expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('150')
		})
	})

	it('collapses a width drag into one settle redraw', async () => {
		await withFakeTime(async (clock) => {
			const onMarks = vi.fn()

			renderUI(<Probe width={undefined} sizing={{ mode: 'aspect', ratio: 2 }} onMarks={onMarks} />)

			const plot = screen.getByTestId('plot')

			resizeTo(plot, { width: 300, height: 150 })

			const drawsAfterReveal = onMarks.mock.calls.length

			// Three drag frames: each re-arms the settle timer without touching
			// state, so the frame keeps its last geometry (CSS scales the SVG).
			resizeTo(plot, { width: 350, height: 175 })

			resizeTo(plot, { width: 380, height: 190 })

			resizeTo(plot, { width: 400, height: 200 })

			expect(onMarks).toHaveBeenCalledTimes(drawsAfterReveal)

			expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')

			// The box holds steady: one re-measure, one redraw, final geometry.
			await clock.advance(RESIZE_SETTLE_MS)

			expect(onMarks).toHaveBeenCalledTimes(drawsAfterReveal + 1)

			expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('400')

			expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('200')
		})
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

	it('redraws on a settled height change under a fill policy', async () => {
		await withFakeTime(async (clock) => {
			const onMarks = vi.fn()

			renderUI(<Probe width={undefined} sizing={{ mode: 'fill' }} onMarks={onMarks} />)

			const plot = screen.getByTestId('plot')

			resizeTo(plot, { width: 300, height: 200 })

			expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('200')

			const drawsAfterReveal = onMarks.mock.calls.length

			// The free-form height feeds the sizing, so the settle re-measure
			// must redraw to the new box.
			resizeTo(plot, { width: 300, height: 260 })

			expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('200')

			await clock.advance(RESIZE_SETTLE_MS)

			expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('260')

			expect(onMarks.mock.calls.length).toBeGreaterThan(drawsAfterReveal)
		})
	})
})
