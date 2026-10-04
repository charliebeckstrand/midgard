import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Badge } from '../../components/badge'
import { present, renderUI } from '../helpers'

/**
 * A badge that is a link answers the pointer and shows the focus ring. A badge that is a label
 * does not answer the pointer.
 *
 * A link badge had no hover state and no focus ring of its own. The keyboard user saw the thin
 * default ring of the browser, not the ring of each other control in the library.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet, and
 * `:hover` is not a state that it can enter.
 */
describe('a link badge (real browser)', () => {
	async function backgroundBeforeAndAfterHover(href: string | undefined) {
		const { container } = renderUI(
			href === undefined ? (
				<Badge variant="soft" color="blue">
					Label
				</Badge>
			) : (
				<Badge variant="soft" color="blue" href={href}>
					Label
				</Badge>
			),
		)

		const badge = present(container.querySelector('[data-slot="badge"]'), 'badge')

		const before = getComputedStyle(badge).backgroundColor

		await userEvent.hover(badge)

		return { before, after: getComputedStyle(badge).backgroundColor }
	}

	it('washes a link badge under the pointer', async () => {
		const { before, after } = await backgroundBeforeAndAfterHover('/docs')

		expect(after).not.toBe(before)
	})

	it('keeps the fill of a label badge under the pointer', async () => {
		const { before, after } = await backgroundBeforeAndAfterHover(undefined)

		expect(after).toBe(before)
	})

	it('shows the focus ring of the library on a link badge that the keyboard focuses', async () => {
		const { container } = renderUI(<Badge href="/docs">Docs</Badge>)

		await userEvent.tab()

		const badge = present(container.querySelector('a[data-slot="badge"]'), 'badge')

		expect(badge).toHaveFocus()

		const style = getComputedStyle(badge)

		expect(style.outlineStyle).toBe('solid')

		// The default ring of the browser is `auto` and 1px wide.
		expect(style.outlineWidth).toBe('2px')
	})
})
