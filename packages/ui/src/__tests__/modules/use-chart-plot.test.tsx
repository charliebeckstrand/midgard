import { memo } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChartPlot } from '../../modules/chart/use-chart-plot'
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
// A bail-out in `useChartPlot` may still re-run the parent once, but React never
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
	measureHeight,
	onMarks,
}: {
	width: number | undefined
	measureHeight: boolean
	onMarks: () => void
}) {
	const plot = useChartPlot(width, measureHeight)

	return (
		<div ref={plot.ref} data-testid="plot">
			<Marks width={plot.width} height={plot.height} onRender={onMarks} />
		</div>
	)
}

describe('useChartPlot', () => {
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

	it('redraws on a width change but not a height-only change when the height is derived', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={undefined} measureHeight={false} onMarks={onMarks} />)

		const plot = screen.getByTestId('plot')

		// The width resolves and the frame redraws to fill it.
		resizeTo(plot, { width: 300, height: 200 })

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')

		const drawsAfterWidth = onMarks.mock.calls.length

		// A height-only resize changes nothing a derived-height frame draws from,
		// so the untracked axis stays 0 and the marks never redraw.
		resizeTo(plot, { width: 300, height: 500 })

		expect(onMarks).toHaveBeenCalledTimes(drawsAfterWidth)

		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('300')

		expect(screen.getByTestId('marks').getAttribute('data-height')).toBe('0')
	})

	it('constructs no observer and takes its width from the prop when the size is fixed', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={600} measureHeight={false} onMarks={onMarks} />)

		// Nothing feeds the sizing, so the frame observes nothing at all.
		expect(stub.instances).toHaveLength(0)

		// The width comes straight from the prop, ready on the first paint.
		expect(screen.getByTestId('marks').getAttribute('data-width')).toBe('600')
	})

	it('redraws on a height change for a free-form frame', () => {
		const onMarks = vi.fn()

		renderUI(<Probe width={undefined} measureHeight onMarks={onMarks} />)

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
