import { describe, expect, it, onTestFinished } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { renderUI, screen } from '../../helpers'
import { nextPaint } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { settleViewport } from '../setup/viewport'

/** The inline transform of the active indicator, or `null` while no indicator shows. */
function indicatorTransform(): string | null {
	const indicator = document.querySelector<HTMLElement>('[data-slot="active-indicator"]')

	return indicator ? indicator.style.transform : null
}

/** Renders a Segment of two items, and gives the item that is not selected. */
function renderSegment() {
	const { unmount } = renderUI(
		<Segment defaultValue="overview">
			<SegmentControl aria-label="View">
				<SegmentItem value="overview">Overview</SegmentItem>
				<SegmentItem value="county">By county</SegmentItem>
			</SegmentControl>
		</Segment>,
	)

	return { item: screen.getByRole('radio', { name: 'By county' }), unmount }
}

/** Presses `item`, and gives each transform of the indicator until it rests at `none`. */
async function morph(item: HTMLElement): Promise<string[]> {
	const samples: string[] = []

	await sampleMotionFrames(
		() => {
			const transform = indicatorTransform()

			if (transform !== null) samples.push(transform)

			return samples
		},
		(read) => read.some((value) => value.includes('translate')) && read.at(-1) === 'none',
		{ during: async () => item.click() },
	)

	return samples
}

/**
 * Real-Motion check of the morph of the active indicator in a case that starts
 * after a change of the width of the window. The other suites mock
 * `motion/react`, and the mock moves nothing.
 *
 * After a change of the width, Motion starts no layout animation for 250ms,
 * or until the next commit. Vitest sets the width of the tester iframe before each file, and
 * the browser sends `resize` only in its next rendering update. A case that
 * rendered before that update got the event between its render and its press,
 * and the indicator moved with no morph. `settleViewport` holds the case until
 * the event comes. The browser setup calls it before each case, and this case
 * calls it at the point where the setup calls it.
 */
describe('active indicator morph after a resize (real Motion)', () => {
	it('morphs in a case that starts after a change of the width', async ({ signal }) => {
		const startWidth = innerWidth

		const iframe = window.frameElement as HTMLIFrameElement

		const width = iframe.style.width

		onTestFinished(async () => {
			iframe.style.width = width

			await settleViewport()
		})

		// A morph before the resize, as a file before this one gives: Motion
		// listens for `resize` only after it mounts its first layout node.
		const first = renderSegment()

		await nextPaint()

		await morph(first.item)

		first.unmount()

		signal.throwIfAborted()

		// The width that a file before this one leaves, as `lightbox-corners`
		// leaves 800px. Motion keeps the width of each `resize` event.
		iframe.style.width = `${innerWidth + 100}px`

		await settleViewport()

		signal.throwIfAborted()

		// The reset that Vitest makes before the next file. The read lays out the
		// page of the runner, so the iframe has its width at once, and the browser
		// sends `resize` in its next rendering update.
		iframe.style.width = width

		expect(innerWidth).toBe(startWidth)

		// The wait of the browser setup before each case.
		await settleViewport()

		const { item } = renderSegment()

		await nextPaint()

		const samples = await morph(item)

		expect(samples.filter((value) => value.includes('translate(')).length).toBeGreaterThan(0)
	})
})
