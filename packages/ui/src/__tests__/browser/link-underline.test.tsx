import { describe, expect, it } from 'vitest'
import { Link } from '../../components/link'
import { getSlot, renderUI } from '../helpers'

/**
 * `underline` gives a link a mark at rest. With the default `color: current`, the
 * link has the color of the text around it, so the underline is the only thing
 * that tells the reader it is a link (WCAG 1.4.1).
 *
 * Rides the real browser because the claim is a computed style, which jsdom
 * does not compute.
 */
describe('Link underline (real browser)', () => {
	it.each([
		[true, 'underline'],
		[false, 'none'],
	] as const)('with underline=%s, draws %s at rest', (underline, line) => {
		const { container } = renderUI(
			<Link href="/terms" underline={underline}>
				Terms
			</Link>,
		)

		expect(getComputedStyle(getSlot(container, 'link')).textDecorationLine).toBe(line)
	})
})
