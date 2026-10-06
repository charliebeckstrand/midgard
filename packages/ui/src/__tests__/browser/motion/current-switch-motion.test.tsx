import { describe, expect, it } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { renderUI, waitFor } from '../../helpers'

/**
 * Real-Motion check of a tab switch under a fading container. The other suites
 * mock `motion/react`, and the mock moves nothing. These cases read the two
 * panels on each frame of a switch, under `fade` and under `slide`.
 */
describe('CurrentContents switch (real Motion)', () => {
	const panelOf = (testId: string) =>
		document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.parentElement ?? null

	const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

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

		tab.click()

		while (
			panelOf(outgoing) ||
			Number(getComputedStyle(panelOf(incoming) as Element).opacity) < 1
		) {
			await frame()

			const panels = [panelOf(incoming), panelOf(outgoing)]

			const opacities = panels.map((panel) => (panel ? Number(getComputedStyle(panel).opacity) : 0))

			frames.push({
				incoming: panels[0]?.getBoundingClientRect() ?? null,
				outgoing: panels[1]?.getBoundingClientRect() ?? null,
				shown: Math.max(...opacities),
				both: opacities.every((opacity) => opacity > 0),
			})
		}

		return frames
	}

	it('fades the outgoing panel out, then the incoming panel in, with no double image', async () => {
		renderTabs('fade')

		await waitFor(() => expect(panelOf('a')).not.toBeNull())

		const outgoing: number[] = []

		const tab = document.querySelectorAll<HTMLElement>('[role="tab"]')[1]

		if (!tab) throw new Error('tab 1 did not render')

		const doubled: number[][] = []

		tab.click()

		while (panelOf('a') || Number(getComputedStyle(panelOf('b') as Element).opacity) < 1) {
			await frame()

			const opacities = [panelOf('a'), panelOf('b')].map((panel) =>
				panel ? Number(getComputedStyle(panel).opacity) : 0,
			)

			outgoing.push(opacities[0] ?? 0)

			if (opacities.every((opacity) => opacity > 0.25)) doubled.push(opacities)
		}

		// Before, the outgoing panel went at once, with no fade-out.
		expect(outgoing.some((opacity) => opacity > 0 && opacity < 1)).toBe(true)

		// The incoming panel fades in only as the outgoing panel nears transparent.
		expect(doubled).toEqual([])
	})

	it('slides the two panels side by side and never shows an empty box', async () => {
		renderTabs('slide')

		await waitFor(() => expect(panelOf('a')).not.toBeNull())

		const frames = await switchTo(1, 'b', 'a')

		// Before the fix, the outgoing panel went at once and the incoming panel
		// waited a frame at opacity 0, so the box showed nothing.
		expect(frames.filter((f) => f.shown === 0)).toEqual([])

		// The two panels never show over each other, so no double image shows.
		expect(
			frames.filter(
				(f) => f.both && f.incoming && f.outgoing && f.incoming.left < f.outgoing.right,
			),
		).toEqual([])

		// The incoming panel comes from the trailing side, toward which tab B lies.
		expect(frames.some((f) => f.incoming && f.outgoing && f.incoming.left > f.outgoing.left)).toBe(
			true,
		)
	})

	it('slides back from the leading side', async () => {
		renderTabs('slide')

		await waitFor(() => expect(panelOf('a')).not.toBeNull())

		await switchTo(1, 'b', 'a')

		const frames = await switchTo(0, 'a', 'b')

		expect(frames.filter((f) => f.shown === 0)).toEqual([])

		expect(
			frames.some((f) => f.incoming && f.outgoing && f.incoming.right < f.outgoing.left + 0.5),
		).toBe(true)

		// At rest the panel takes no transform, so it is no containing block.
		await waitFor(() => expect(getComputedStyle(panelOf('a') as Element).transform).toBe('none'))
	})
})
