import { memo } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { type FrameSizing, usePlotFrame } from '../../hooks'
import { frames, present, renderUI, screen, waitFor } from '../helpers'

/**
 * Which axis a sizing policy reads, decided by a real container.
 *
 * `usePlotFrame` measures its own box and resolves a drawing size from it. Under
 * an aspect policy the height derives from the width, so a height-only resize
 * must change nothing and must not redraw the frame's expensive subtree — the
 * render a resize is supposed to avoid. Under a fill policy the height is an
 * input, so the same resize must redraw.
 *
 * jsdom asserted both by writing `clientWidth` and `clientHeight` onto the plot
 * and firing the observer by hand, which meant the case chose the measurement
 * whose consequences it then checked. Here the host really resizes on one axis
 * and the engine's own observer reports it.
 */

/**
 * The frame's expensive subtree: memoized on the resolved size, so it re-renders
 * only when a dimension it draws from changes. React never descends into a memo
 * whose props are unchanged, so its render count is the faithful signal for
 * "the frame redrew".
 */
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

function Probe({ sizing, onMarks }: { sizing: FrameSizing; onMarks: () => void }) {
	const plot = usePlotFrame(undefined, sizing)

	return (
		<div data-testid="host" style={{ width: 300, height: 200 }}>
			<div ref={plot.ref} data-testid="plot" style={{ width: '100%', height: '100%' }}>
				<Marks width={plot.width} height={plot.height} onRender={onMarks} />
			</div>
		</div>
	)
}

describe('usePlotFrame against a real container', () => {
	/** Mounts a probe and settles the first measurement. */
	async function mounted(sizing: FrameSizing) {
		const onMarks = vi.fn()

		renderUI(<Probe sizing={sizing} onMarks={onMarks} />)

		const host = present(screen.getByTestId('host'), 'the host')

		const marks = () => present(screen.getByTestId('marks'), 'the marks')

		await waitFor(() => expect(marks().getAttribute('data-width')).toBe('300'))

		await frames()

		return { host, marks, onMarks }
	}

	it('derives the height from the width, and ignores a height-only resize, under aspect', async () => {
		const { host, marks, onMarks } = await mounted({ mode: 'aspect', ratio: 2 })

		// 300 wide at 2:1 draws 150 tall, whatever the container's own height is.
		expect(marks().getAttribute('data-height')).toBe('150')

		const before = onMarks.mock.calls.length

		// A height-only resize: the policy consumes no height, so the untracked
		// axis stays unread and the expensive subtree must not redraw.
		host.style.height = '500px'

		await frames()

		await frames()

		expect(marks().getAttribute('data-height')).toBe('150')

		expect(onMarks.mock.calls.length).toBe(before)
	})

	it('redraws on a height-only resize under fill, where the height is an input', async () => {
		const { host, marks, onMarks } = await mounted({ mode: 'fill' })

		await waitFor(() => expect(marks().getAttribute('data-height')).toBe('200'))

		const before = onMarks.mock.calls.length

		host.style.height = '260px'

		await waitFor(() => expect(marks().getAttribute('data-height')).toBe('260'))

		expect(onMarks.mock.calls.length).toBeGreaterThan(before)
	})
})
