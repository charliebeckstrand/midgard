import { describe, expect, it } from 'vitest'
import { Code } from '../../../components/code'
import { Kbd } from '../../../components/kbd'
import { bySlot, present, renderUI } from '../../helpers'

/**
 * An inline mark is as wide as its text. A flex or grid parent stretches its
 * items across the cross axis, so a mark that is a flex or grid item filled
 * the parent before the mark took `w-fit`.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('inline mark width (real browser)', () => {
	it.each([
		['Code', 'code', <Code key="code">pnpm install</Code>],
		['Kbd', 'kbd', <Kbd key="kbd">⌘K</Kbd>],
	])('keeps a %s at the width of its text in a flex column', (_, slot, mark) => {
		const { container } = renderUI(
			<div className="flex flex-col" style={{ width: 600 }}>
				{mark}
			</div>,
		)

		const width = present(bySlot(container, slot), slot).getBoundingClientRect().width

		expect(width).toBeLessThan(200)
	})

	it('keeps a Code at the width of its text in a grid cell', () => {
		const { container } = renderUI(
			<div className="grid" style={{ width: 600 }}>
				<Code>pnpm install</Code>
			</div>,
		)

		const width = present(bySlot(container, 'code'), 'code').getBoundingClientRect().width

		expect(width).toBeLessThan(200)
	})
})
