import { describe, expect, it } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { renderUI, waitFor } from '../../helpers'

/** A panel whose render holds the main thread, as a large panel does on a phone. */
function SlowPanel() {
	const end = performance.now() + 60

	while (performance.now() < end) {
		// Hold the main thread.
	}

	return <div data-testid="b">B</div>
}

/**
 * Real-Motion check of the start of the panel fade. The other suites mock
 * `motion/react`, and the mock starts no animation.
 */
describe('CurrentContents fade start (real Motion)', () => {
	it('starts the fade only after the first frame of the incoming panel', async () => {
		renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a">
						<div data-testid="a">A</div>
					</TabContent>
					<TabContent value="b">
						<SlowPanel />
					</TabContent>
				</TabContents>
			</Tabs>,
		)

		const tab = document.querySelectorAll<HTMLElement>('[role="tab"]')[1]

		if (!tab) throw new Error('tab B did not render')

		tab.click()

		const panel = () => document.querySelector('[data-testid="b"]')?.parentElement

		// Before the fix, Motion created the fade in the task of the switch, and
		// timed it from that task. The render of the panel then counted as fade
		// time, so the first frame showed the fade partway.
		const fadesAtFirstFrame = await new Promise<number | undefined>((resolve) =>
			requestAnimationFrame(() => resolve(panel()?.getAnimations().length)),
		)

		expect(fadesAtFirstFrame).toBe(0)

		await waitFor(() => expect(panel()?.getAnimations().length).toBe(1))
	})
})
