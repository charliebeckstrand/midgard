import { describe, expect, it } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { renderUI, waitFor } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/**
 * Real-Motion check of a tab switch under a fading container. The other suites
 * mock `motion/react`, and the mock moves nothing. These cases read the two
 * panels on each frame of a switch, under `fade` and under `slide`.
 */
describe('CurrentContents switch (real Motion)', () => {
	const getPanel = (testId: string) =>
		document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.parentElement ?? null

	const opacity = (panel: Element | null) => (panel ? Number(getComputedStyle(panel).opacity) : 0)

	/** Whether the outgoing panel is gone and the incoming panel shows in full. */
	const landed = ([incoming, outgoing]: (HTMLElement | null)[]) =>
		!outgoing && opacity(incoming ?? null) >= 1

	function renderTabs(animate: 'fade' | 'slide') {
		renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents animate={animate}>
					<TabContent value="a">
						<div data-testid="a">A</div>
					</TabContent>
					<TabContent value="b">
						<div data-testid="b">B</div>
					</TabContent>
				</TabContents>
			</Tabs>,
		)
	}

	/** Clicks a tab and records each panel on each frame until the switch lands. */
	async function switchTo(index: number, incoming: string, outgoing: string) {
		const tab = document.querySelectorAll<HTMLElement>('[role="tab"]')[index]

		if (!tab) throw new Error(`tab ${index} did not render`)

		const frames: {
			incoming: DOMRect | null
			outgoing: DOMRect | null
			shown: number
			// Both panels show at once.
			both: boolean
		}[] = []

		await sampleMotionFrames(
			() => {
				const panels = [getPanel(incoming), getPanel(outgoing)]

				const opacities = panels.map(opacity)

				frames.push({
					incoming: panels[0]?.getBoundingClientRect() ?? null,
					outgoing: panels[1]?.getBoundingClientRect() ?? null,
					shown: Math.max(...opacities),
					both: opacities.every((value) => value > 0),
				})

				return panels
			},
			landed,
			{ during: async () => tab.click(), deadline: budget(5000) },
		)

		return frames
	}

	it('fades the outgoing panel out, then the incoming panel in, with no double image', async () => {
		renderTabs('fade')

		await waitFor(() => expect(getPanel('a')).not.toBeNull())

		const outgoing: number[] = []

		const tab = document.querySelectorAll<HTMLElement>('[role="tab"]')[1]

		if (!tab) throw new Error('tab 1 did not render')

		const doubled: number[][] = []

		await sampleMotionFrames(
			() => {
				const panels = [getPanel('b'), getPanel('a')]

				const [incoming = 0, leaving = 0] = panels.map(opacity)

				outgoing.push(leaving)

				if (incoming > 0.25 && leaving > 0.25) doubled.push([leaving, incoming])

				return panels
			},
			landed,
			{ during: async () => tab.click(), deadline: budget(5000) },
		)

		// Before, the outgoing panel went at once, with no fade-out.
		expect(outgoing.some((opacity) => opacity > 0 && opacity < 1)).toBe(true)

		// The incoming panel fades in only as the outgoing panel nears transparent.
		expect(doubled).toEqual([])
	})

	it('slides the two panels side by side and never shows an empty box', async () => {
		renderTabs('slide')

		await waitFor(() => expect(getPanel('a')).not.toBeNull())

		const frames = await switchTo(1, 'b', 'a')

		// Before the fix, the outgoing panel went at once and the incoming panel
		// waited a frame at opacity 0, so the box showed nothing.
		expect(frames.filter((sample) => sample.shown === 0)).toEqual([])

		// The two panels never show over each other, so no double image shows.
		expect(
			frames.filter(
				(sample) =>
					sample.both &&
					sample.incoming &&
					sample.outgoing &&
					sample.incoming.left < sample.outgoing.right,
			),
		).toEqual([])

		// The incoming panel comes from the trailing side, toward which tab B lies.
		expect(
			frames.some(
				(sample) =>
					sample.incoming && sample.outgoing && sample.incoming.left > sample.outgoing.left,
			),
		).toBe(true)
	})

	it('slides back from the leading side', async () => {
		renderTabs('slide')

		await waitFor(() => expect(getPanel('a')).not.toBeNull())

		await switchTo(1, 'b', 'a')

		const frames = await switchTo(0, 'a', 'b')

		expect(frames.filter((sample) => sample.shown === 0)).toEqual([])

		expect(
			frames.some(
				(sample) =>
					sample.incoming && sample.outgoing && sample.incoming.right < sample.outgoing.left + 0.5,
			),
		).toBe(true)

		// At rest the panel takes no transform, so it is no containing block.
		await waitFor(() => expect(getComputedStyle(getPanel('a') as Element).transform).toBe('none'))
	})

	it('settles the incoming panel without a jump to its rest and back', async () => {
		renderTabs('slide')

		await waitFor(() => expect(getPanel('a')).not.toBeNull())

		const tab = document.querySelectorAll<HTMLElement>('[role="tab"]')[1]

		if (!tab) throw new Error('tab 1 did not render')

		const box = document.querySelector('[data-slot="tab-contents"]')

		if (!box) throw new Error('the tab contents did not render')

		const lefts: number[] = []

		await sampleMotionFrames(
			() => {
				const panel = getPanel('b')

				const moving = panel !== null && getComputedStyle(panel).transform !== 'none'

				if (moving) lefts.push(panel.getBoundingClientRect().left)

				return panel !== null && !moving
			},
			(rest) => rest,
			{ during: async () => tab.click(), deadline: budget(5000) },
		)

		const rest = box.getBoundingClientRect().left

		const first = lefts.findIndex((left) => Math.abs(left - rest) < 0.01)

		// The frames after the first frame at rest.
		const landed = first === -1 ? [] : lefts.slice(first)

		// Before the fix, the spring curve went to the rest at the top of its
		// overshoot and then went back past it, about 0.4% of the slide.
		expect(landed.filter((left) => Math.abs(left - rest) > 0.1)).toEqual([])
	})
})
