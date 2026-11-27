import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { frames, present, renderUI, screen } from '../helpers'
import { emulateForcedColors } from './helpers/forced-colors'

/**
 * A tab panel with no focusable content is a Tab stop (APG tabs pattern), so
 * it must show where the focus is (WCAG 2.4.7). An animating `TabContents`
 * clips its panels for the switch. Thus the ring of a panel must stay inside
 * the box of the panel, or the container cuts it off.
 */

/** How far a ring goes out of its box: the width and the offset of its outline. */
function outlineReach(style: CSSStyleDeclaration): number | null {
	if (style.outlineStyle === 'none' || style.outlineWidth === '0px') return null

	return Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset)
}

/**
 * The boxes that the focus ring of `panel` paints, as the reach of each out of
 * the box of the panel. An inset box-shadow on the `::after` box reaches 0.
 */
function ringReaches(panel: HTMLElement): number[] {
	const own = getComputedStyle(panel)

	const after = getComputedStyle(panel, '::after')

	const reaches = [outlineReach(own), outlineReach(after)]

	if (after.boxShadow !== 'none' && after.boxShadow.includes('inset')) reaches.push(0)

	if (own.boxShadow !== 'none' && own.boxShadow.includes('inset')) reaches.push(0)

	return reaches.filter((reach) => reach !== null)
}

/** The nearest ancestor of `node` that clips its overflow. */
function clipper(node: HTMLElement): HTMLElement | null {
	for (let parent = node.parentElement; parent; parent = parent.parentElement) {
		if (getComputedStyle(parent).overflow !== 'visible') return parent
	}

	return null
}

/** Tabs to the panel and checks that each part of its ring shows. */
async function expectRingShows() {
	await frames()

	await userEvent.keyboard('{Tab}{Tab}')

	const panel = present(document.activeElement, 'focused panel')

	expect(panel).toHaveRole('tabpanel')

	const reaches = ringReaches(panel)

	expect(reaches).not.toEqual([])

	const frame = clipper(panel)?.getBoundingClientRect()

	if (!frame) return

	const box = panel.getBoundingClientRect()

	for (const reach of reaches) {
		expect(box.left - reach).toBeGreaterThanOrEqual(frame.left)

		expect(box.top - reach).toBeGreaterThanOrEqual(frame.top)

		expect(box.right + reach).toBeLessThanOrEqual(frame.right)

		expect(box.bottom + reach).toBeLessThanOrEqual(frame.bottom)
	}
}

const panels = {
	'tabs with a fade': (
		<Tabs key="fade" defaultValue="a">
			<TabList aria-label="Sections">
				<Tab value="a">Alpha</Tab>
				<Tab value="b">Bravo</Tab>
			</TabList>
			<TabContents>
				<TabContent value="a">Text of Alpha</TabContent>
				<TabContent value="b">Text of Bravo</TabContent>
			</TabContents>
		</Tabs>
	),
	'tabs with a slide': (
		<Tabs key="slide" defaultValue="a">
			<TabList aria-label="Sections">
				<Tab value="a">Alpha</Tab>
				<Tab value="b">Bravo</Tab>
			</TabList>
			<TabContents animate="slide">
				<TabContent value="a">Text of Alpha</TabContent>
				<TabContent value="b">Text of Bravo</TabContent>
			</TabContents>
		</Tabs>
	),
	'tabs with no animation': (
		<Tabs key="still" defaultValue="a">
			<TabList aria-label="Sections">
				<Tab value="a">Alpha</Tab>
				<Tab value="b">Bravo</Tab>
			</TabList>
			<TabContents animate={false}>
				<TabContent value="a">Text of Alpha</TabContent>
				<TabContent value="b">Text of Bravo</TabContent>
			</TabContents>
		</Tabs>
	),
	'segment with panels': (
		<Segment key="segment" defaultValue="a">
			<SegmentControl aria-label="View">
				<SegmentItem value="a">List</SegmentItem>
				<SegmentItem value="b">Board</SegmentItem>
			</SegmentControl>
			<TabContents>
				<TabContent value="a">Text of List</TabContent>
				<TabContent value="b">Text of Board</TabContent>
			</TabContents>
		</Segment>
	),
}

describe('tab panel focus ring (real browser)', () => {
	it.for(Object.entries(panels))('%s: the ring of the panel shows', async ([, ui]) => {
		renderUI(<div className="p-4">{ui}</div>)

		expect(screen.getAllByRole('tab')).toHaveLength(2)

		await expectRingShows()
	})
})

describe('tab panel focus ring under forced colors (real browser)', () => {
	emulateForcedColors()

	it('the ring of a panel in an animating container shows', async () => {
		renderUI(<div className="p-4">{panels['tabs with a fade']}</div>)

		await expectRingShows()
	})
})
