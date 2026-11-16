import { describe, expect, it } from 'vitest'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { TabContent, TabContents } from '../../../components/tabs'
import { renderUI, screen } from '../../helpers'
import { nextPaint } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'

/** The offset of the painted marker from the current tab, in px on each axis. */
type Offset = { x: number; y: number }

/** The offset of the active indicator from the tab that holds it, or `null` while no indicator shows. */
function markerOffset(): Offset | null {
	const indicator = document.querySelector<HTMLElement>('[data-slot="active-indicator"]')

	const tab = indicator?.parentElement?.querySelector<HTMLElement>('[role="tab"]')

	if (!indicator || !tab) return null

	const marker = indicator.getBoundingClientRect()

	const item = tab.getBoundingClientRect()

	return { x: marker.left - item.left, y: marker.top - item.top }
}

/**
 * Real-Motion check of a marker in a list that moves in the commit of the
 * switch. The other suites mock `motion/react`, and the mock moves nothing.
 *
 * A panel that takes its height from its content, such as a Dialog on a phone,
 * moves the list when a tab of other height shows. Here the box holds its
 * content at the bottom, so a taller tab moves the list up. The marker must
 * stay on the row of its list in each frame, and travel only along it.
 */
describe('active indicator in a list that moves (real Motion)', () => {
	it('keeps the marker on the row of the list while the list moves', async () => {
		renderUI(
			<div className="flex h-[600px] w-96 flex-col justify-end">
				<Segment defaultValue="short">
					<SegmentControl aria-label="View">
						<SegmentItem value="short">Short</SegmentItem>
						<SegmentItem value="tall">Tall</SegmentItem>
					</SegmentControl>
					<TabContents>
						<TabContent value="short">
							<div className="h-20" />
						</TabContent>
						<TabContent value="tall">
							<div className="h-80" />
						</TabContent>
					</TabContents>
				</Segment>
			</div>,
		)

		const tall = screen.getByRole('tab', { name: 'Tall' })

		const listTop = () => screen.getByRole('tablist').getBoundingClientRect().top

		// Motion completes the mount of the indicator in a microtask after the
		// render. A press before that takes no snapshot, so no morph runs.
		await nextPaint()

		const before = listTop()

		const samples: { offset: Offset; transform: string }[] = []

		await sampleMotionFrames(
			() => {
				const offset = markerOffset()

				const indicator = document.querySelector<HTMLElement>('[data-slot="active-indicator"]')

				if (offset !== null && indicator !== null) {
					samples.push({ offset, transform: indicator.style.transform })
				}

				return samples
			},
			(read) =>
				read.some(({ transform }) => transform.includes('translate')) &&
				read.at(-1)?.transform === 'none',
			{ during: async () => tall.click() },
		)

		// The list moved up, so a morph in page space would drift on the y axis.
		expect(before - listTop()).toBeGreaterThan(100)

		const morph = samples.filter(({ transform }) => transform.includes('translate'))

		expect(morph.length).toBeGreaterThan(0)

		// The marker travels from the first tab, along the row.
		expect(morph.some(({ offset }) => offset.x < -1)).toBe(true)

		for (const { offset } of morph) {
			expect(offset.y).toBeCloseTo(0, 0)
		}
	})
})
