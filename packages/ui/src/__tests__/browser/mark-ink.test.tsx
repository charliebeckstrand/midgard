import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Code } from '../../components/code'
import { Kbd } from '../../components/kbd'
import { getSlot, renderUI } from '../helpers'

/**
 * A mark (`<Code>`, `<Kbd>`) on a solid fill keeps the text color of the fill,
 * with an outline in place of its fill.
 *
 * A mark has the default text color, because its fill lowers the contrast of
 * muted and intent text below 4.5:1 (WCAG 1.4.3). The geometry corpus
 * (`marks in text`) measures that case with axe. The default text color is
 * correct on the page only: on a solid fill, it is dark text on a dark fill.
 * axe cannot measure a mark in a button, because the layers of the button
 * cover the mark, so this file compares the computed colors.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no
 * stylesheet.
 */
describe('the ink of a mark (real browser)', () => {
	it.each([
		[
			'a key in a solid button',
			<Button key="solid" suffix={<Kbd>K</Kbd>}>
				Open
			</Button>,
			'button',
			'kbd',
		],
		[
			'a key in a solid amber button',
			<Button key="amber" color="amber" suffix={<Kbd>K</Kbd>}>
				Open
			</Button>,
			'button',
			'kbd',
		],
		[
			'code in a solid badge',
			<Badge key="badge" variant="solid" color="blue">
				<Code>v2</Code>
			</Badge>,
			'badge',
			'code',
		],
	])('keeps the text color of the fill for %s', (_name, element, fill, mark) => {
		const { container } = renderUI(element)

		const ink = getComputedStyle(getSlot(container, fill)).color

		expect(getComputedStyle(getSlot(container, mark)).color).toBe(ink)
	})

	// An own fill of the mark moves toward its text or away from it. Thus the
	// mark has no fill on a solid fill, and its text has the contrast of the
	// text of the fill. An outline shows the edge of the mark.
	it.each([
		[
			'a key in a solid button',
			<Button key="solid" suffix={<Kbd>K</Kbd>}>
				Open
			</Button>,
			'kbd',
		],
		[
			'code in a solid badge',
			<Badge key="badge" variant="solid" color="blue">
				<Code>v2</Code>
			</Badge>,
			'code',
		],
	])('has no fill and an outline for %s', (_name, element, mark) => {
		const { container } = renderUI(element)

		const style = getComputedStyle(getSlot(container, mark))

		expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')

		expect(style.boxShadow).not.toBe('none')
	})
})
