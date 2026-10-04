import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { BreadcrumbLink } from '../../components/breadcrumb'
import { present, renderUI } from '../helpers'

/**
 * Only a crumb that is a link answers the pointer.
 *
 * A crumb with no `href` renders a `<span>`, but it took the hover color of a link. Its text
 * darkened under the pointer, so it looked like a link that a click could follow.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet, and
 * `:hover` is not a state that it can enter.
 */
describe('a breadcrumb crumb under the pointer (real browser)', () => {
	async function colorBeforeAndAfterHover(href: string | undefined) {
		const { container } = renderUI(
			href === undefined ? (
				<BreadcrumbLink>Crumb</BreadcrumbLink>
			) : (
				<BreadcrumbLink href={href}>Crumb</BreadcrumbLink>
			),
		)

		const crumb = present(container.querySelector('[data-slot="breadcrumb-link"]'), 'crumb')

		const before = getComputedStyle(crumb).color

		await userEvent.hover(crumb)

		return { before, after: getComputedStyle(crumb).color }
	}

	it('keeps the color of a text crumb', async () => {
		const { before, after } = await colorBeforeAndAfterHover(undefined)

		expect(after).toBe(before)
	})

	/** The hover still exists. A fix that removed it everywhere would pass the case above. */
	it('darkens a link crumb', async () => {
		const { before, after } = await colorBeforeAndAfterHover('/docs')

		expect(after).not.toBe(before)
	})
})
