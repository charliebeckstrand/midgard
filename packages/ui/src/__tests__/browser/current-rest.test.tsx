import { describe, expect, it } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Real-browser check of the fade-held rest hold. Under a fading container with
 * `mount="always"`, an inactive panel should sleep in `<Activity mode="hidden">`
 * (`display: none`) once its fade-out lands, wake for the crossfade when it
 * becomes current again, and stay in the DOM throughout. This needs a real
 * browser — jsdom never completes the Motion fade that sets the rest latch.
 */
describe('fade-held panel rest (real browser)', () => {
	it('rests an inactive held panel after its fade-out and wakes it on return', async () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents mount="always">
					<TabContent value="a">Panel A</TabContent>
					<TabContent value="b">Panel B</TabContent>
				</TabContents>
			</Tabs>,
		)

		// Panel B mounts inactive, so it rests hidden from the start — present in
		// the DOM but display: none.
		const panelB = screen.getByText('Panel B')

		await waitFor(() => expect(getComputedStyle(panelB).display).toBe('none'))

		const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]')

		// Switching to B wakes it for the crossfade; once A's fade-out lands, A
		// rests hidden in turn while staying mounted.
		tabs[1]?.click()

		await waitFor(() => expect(getComputedStyle(panelB).display).not.toBe('none'))

		const panelA = screen.getByText('Panel A')

		await waitFor(() => expect(getComputedStyle(panelA).display).toBe('none'))

		// And back: A wakes again, B rests.
		tabs[0]?.click()

		await waitFor(() => expect(getComputedStyle(panelA).display).not.toBe('none'))

		await waitFor(() => expect(getComputedStyle(panelB).display).toBe('none'))
	})
})
