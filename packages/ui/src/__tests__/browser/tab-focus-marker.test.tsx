import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Tab, TabList, Tabs } from '../../components/tabs'
import { renderUI } from '../helpers'

/** The color of the focus marker that a focused underline tab paints on `::after`. */
function marker(): string {
	const tab = document.activeElement as HTMLElement

	expect(tab.dataset.slot).toBe('tab')

	return getComputedStyle(tab, '::after').backgroundColor
}

describe('underline tab focus marker (real browser)', () => {
	// The current tab takes focus first on Tab entry. Its marker must be the
	// same color as the marker of the other tabs.
	it('paints one color on the current tab and on the other tabs', async () => {
		renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a">Alpha</Tab>
					<Tab value="b">Bravo</Tab>
				</TabList>
			</Tabs>,
		)

		await userEvent.keyboard('{Tab}')
		const current = marker()
		await userEvent.keyboard('{ArrowRight}')
		const other = marker()

		expect(current).not.toBe('rgba(0, 0, 0, 0)')
		expect(current).toBe(other)
	})
})
