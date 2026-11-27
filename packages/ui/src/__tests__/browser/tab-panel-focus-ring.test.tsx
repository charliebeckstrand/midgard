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
 * the box of the panel, or the container cuts it off. A panel that scrolls
 * must keep its ring on its box while its content scrolls.
 */

interface Edges {
	left: number
	top: number
	right: number
	bottom: number
}

/** A box that the ring paints, how far the ring goes out of it, and the boxes that clip it. */
interface RingPart {
	box: Edges
	reach: number
	frames: Edges[]
}

/**
 * How far the ring of `style` goes out of its box: the width and the offset of
 * an outline, or 0 for an inset box-shadow. Null when `style` paints no ring.
 */
function ringReach(style: CSSStyleDeclaration): number | null {
	if (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') {
		return Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset)
	}

	if (style.boxShadow !== 'none' && style.boxShadow.includes('inset')) return 0

	return null
}

/** The nearest ancestor of `node` that clips its overflow. */
function clipper(node: HTMLElement): HTMLElement | null {
	for (let parent = node.parentElement; parent; parent = parent.parentElement) {
		if (getComputedStyle(parent).overflow !== 'visible') return parent
	}

	return null
}

/**
 * The parts of the focus ring of `panel`. An absolute `::after` box is content
 * of the panel, so in a panel that scrolls, it moves with the scroll offset,
 * and the panel clips it.
 */
function ringParts(panel: HTMLElement): RingPart[] {
	const own = getComputedStyle(panel)

	const after = getComputedStyle(panel, '::after')

	const box = panel.getBoundingClientRect()

	const outer = clipper(panel)?.getBoundingClientRect()

	const frames = outer ? [outer] : []

	const parts: RingPart[] = []

	const ownReach = ringReach(own)

	if (ownReach !== null) parts.push({ box, reach: ownReach, frames })

	const afterReach = ringReach(after)

	if (afterReach !== null) {
		const scrolls = own.overflow !== 'visible' && after.position === 'absolute'

		const dx = scrolls ? panel.scrollLeft : 0

		const dy = scrolls ? panel.scrollTop : 0

		parts.push({
			box: {
				left: box.left - dx,
				top: box.top - dy,
				right: box.right - dx,
				bottom: box.bottom - dy,
			},
			reach: afterReach,
			frames: scrolls ? [...frames, box] : frames,
		})
	}

	return parts
}

/** Tabs to the panel, runs `then`, and checks that each part of its ring shows. */
async function expectRingShows(then?: (panel: HTMLElement) => Promise<void>) {
	await frames()

	await userEvent.keyboard('{Tab}{Tab}')

	const panel = present(document.activeElement, 'focused panel')

	expect(panel).toHaveRole('tabpanel')

	await then?.(panel)

	const parts = ringParts(panel)

	expect(parts).not.toEqual([])

	for (const { box, reach, frames: clips } of parts) {
		for (const frame of clips) {
			expect(box.left - reach).toBeGreaterThanOrEqual(frame.left)

			expect(box.top - reach).toBeGreaterThanOrEqual(frame.top)

			expect(box.right + reach).toBeLessThanOrEqual(frame.right)

			expect(box.bottom + reach).toBeLessThanOrEqual(frame.bottom)
		}
	}
}

/** Scrolls the focused panel down with the keyboard. */
async function scrollDown(panel: HTMLElement) {
	await userEvent.keyboard('{PageDown}')

	await expect.poll(() => panel.scrollTop).toBeGreaterThan(0)
}

const longText = Array.from({ length: 40 }, (_, line) => `Line ${line + 1} of Alpha`).join('. ')

/** Two panels, and the first scrolls. */
function scrollingPanels(animate: 'fade' | false) {
	return (
		<Tabs key={`scroll-${animate}`} defaultValue="a">
			<TabList aria-label="Sections">
				<Tab value="a">Alpha</Tab>
				<Tab value="b">Bravo</Tab>
			</TabList>
			<TabContents animate={animate}>
				<TabContent value="a" className="max-h-20 overflow-auto">
					{longText}
				</TabContent>
				<TabContent value="b">Text of Bravo</TabContent>
			</TabContents>
		</Tabs>
	)
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

describe('tab panel focus ring in a panel that scrolls (real browser)', () => {
	it.for([
		['no animation', false],
		['a fade', 'fade'],
	] as const)('tabs with %s: the ring stays on the panel after a scroll', async ([, animate]) => {
		renderUI(<div className="w-80 p-4">{scrollingPanels(animate)}</div>)

		await expectRingShows(scrollDown)
	})
})

describe('tab panel focus ring under forced colors (real browser)', () => {
	emulateForcedColors()

	it('the ring of a panel in an animating container shows', async () => {
		renderUI(<div className="p-4">{panels['tabs with a fade']}</div>)

		await expectRingShows()
	})

	it('the ring of a panel that scrolls stays on the panel after a scroll', async () => {
		renderUI(<div className="w-80 p-4">{scrollingPanels('fade')}</div>)

		await expectRingShows(scrollDown)
	})
})
