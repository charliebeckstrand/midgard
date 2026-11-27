import { describe, expect, it } from 'vitest'
import { SidebarLayout, SidebarLayoutBody } from '../../layouts/sidebar'
import { StackedLayout, StackedLayoutBody } from '../../layouts/stacked'
import { renderUI, screen } from '../helpers'

/** Paragraphs of text, with no control, taller than a box of 200 px. */
const lines = (count: number) =>
	Array.from({ length: count }, (_, index) => `Line ${index + 1}`).map((line) => (
		<p key={line}>{line}</p>
	))

/**
 * A box of a layout that scrolls on its own is a Tab stop while it scrolls, so
 * a keyboard can scroll text that has no control in it. A box that fits adds no
 * Tab stop.
 *
 * Rides the real browser for the layout that decides whether the box scrolls.
 */
describe('the scroll stops of the layouts (real browser)', () => {
	it('makes a StackedLayoutBody that scrolls a Tab stop, and keeps its main landmark', async () => {
		renderUI(
			<StackedLayout className="h-[200px]">
				<StackedLayoutBody>{lines(40)}</StackedLayoutBody>
			</StackedLayout>,
		)

		const body = screen.getByRole('main')

		await expect.poll(() => body.getAttribute('tabindex')).toBe('0')

		expect(body).not.toHaveAttribute('aria-label')
	})

	it('adds no Tab stop to a StackedLayoutBody that fits', async () => {
		renderUI(
			<StackedLayout className="h-[200px]">
				<StackedLayoutBody>{lines(1)}</StackedLayoutBody>
			</StackedLayout>,
		)

		// The hook decides on the first frame after the ref attaches.
		await new Promise(requestAnimationFrame)

		expect(screen.getByRole('main')).not.toHaveAttribute('tabindex')
	})

	it('makes an aside that scrolls a Tab stop in the inline layout', async () => {
		const { container } = renderUI(
			<div className="h-[300px] @container-size overflow-auto">
				<SidebarLayout layout="inline" sidebar={<a href="/home">Home</a>} aside={lines(60)}>
					<SidebarLayoutBody>{lines(1)}</SidebarLayoutBody>
				</SidebarLayout>
			</div>,
		)

		const aside = container.querySelector('[data-slot=sidebar-aside]')

		await expect.poll(() => aside?.getAttribute('tabindex')).toBe('0')
	})
})
