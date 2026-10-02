import { describe, expect, it } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { renderUI, waitFor } from '../../helpers'

/**
 * Real-Motion check of a tab switch under a fading container. The other suites
 * mock `motion/react`, and the mock shows no opacity. This case reads the
 * opacity of the outgoing panel on each frame of a switch.
 */
describe('CurrentContents switch (real Motion)', () => {
	const opacityOf = (testId: string) => {
		const panel = document.querySelector(`[data-testid="${testId}"]`)?.parentElement

		return panel ? Number(getComputedStyle(panel).opacity) : null
	}

	it('removes the outgoing panel at once, with no partial fade-out', async () => {
		renderUI(
			<Tabs defaultValue="a">
				<TabList>
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a">
						<div data-testid="a">A</div>
					</TabContent>
					<TabContent value="b">
						<div data-testid="b">B</div>
					</TabContent>
				</TabContents>
			</Tabs>,
		)

		const tab = document.querySelectorAll<HTMLElement>('[role="tab"]')[1]

		if (!tab) throw new Error('tab B did not render')

		const seen: number[] = []

		tab.click()

		// Before the fix, the outgoing panel faded out over 100ms before the
		// incoming panel started, so the box showed almost nothing for a time.
		await waitFor(() => {
			const a = opacityOf('a')

			if (a !== null) seen.push(a)

			expect(a).toBeNull()

			expect(opacityOf('b')).toBe(1)
		})

		expect(seen.filter((a) => a > 0 && a < 1)).toEqual([])
	})
})
