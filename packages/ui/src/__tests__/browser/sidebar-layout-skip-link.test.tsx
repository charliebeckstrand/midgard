import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { SidebarLayout, SidebarLayoutBody } from '../../layouts/sidebar'
import { getSlot, renderUI, screen } from '../helpers'

/** A page with a link in the sidebar and a button in the main slot. */
const page = () =>
	renderUI(
		<SidebarLayout sidebar={<a href="/home">Home</a>} navbar="Navbar">
			<SidebarLayoutBody>
				<button type="button">In the content</button>
				<p>Text of the content</p>
				<button type="button">After the text</button>
			</SidebarLayoutBody>
		</SidebarLayout>,
	)

/**
 * A reader with a keyboard gets past the navigation with the first Tab and
 * Enter. The landmarks serve only a reader with a screen reader.
 */
describe('the skip link of SidebarLayout (real browser)', () => {
	it('shows with the first Tab, and hides without the focus', async () => {
		page()

		const link = screen.getByRole('link', { name: 'Skip to content' })

		expect(link.getBoundingClientRect().width).toBeLessThanOrEqual(1)

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(link)

		expect(link.getBoundingClientRect().width).toBeGreaterThan(1)

		expect(getComputedStyle(link).position).toBe('fixed')
	})

	it('moves the focus to the main slot with Enter, and the next Tab into the content', async () => {
		const { container } = page()

		await userEvent.keyboard('{Tab}')

		await userEvent.keyboard('{Enter}')

		expect(document.activeElement).toBe(getSlot(container, 'body'))

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'In the content' }))
	})

	it('continues the Tab order from a click on the text of the main slot', async () => {
		const { container } = page()

		await userEvent.click(screen.getByText('Text of the content'))

		expect(document.activeElement).not.toBe(getSlot(container, 'body'))

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After the text' }))
	})
})
