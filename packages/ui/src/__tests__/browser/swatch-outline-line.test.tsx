import { describe, expect, it } from 'vitest'
import { Swatch } from '../../components/swatch'
import { bySlot, present, renderUI } from '../helpers'

/**
 * An `outline` swatch frames its mark around a core in the surface color. A
 * line is only 2px tall, so a 2px border on each edge filled it. The line then
 * grew to 4px and read as a thick solid bar. It must keep a hollow core.
 */
describe('outline line Swatch (real browser)', () => {
	it.each(['xs', 'sm', 'md', 'lg', 'xl'] as const)('keeps a hollow core at size %s', (size) => {
		const { container } = renderUI(
			<Swatch shape="line" variant="outline" size={size} color="blue" />,
		)
		const el = present(bySlot(container, 'swatch'), 'swatch')
		const style = getComputedStyle(el)
		const edges =
			Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth)

		expect(el.getBoundingClientRect().height).toBeGreaterThan(edges)
	})
})
