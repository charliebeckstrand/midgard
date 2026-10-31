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
	it.for([
		['Code', 'flex column', 'code', 'flex flex-col', <Code key="code">pnpm install</Code>],
		['Kbd', 'flex column', 'kbd', 'flex flex-col', <Kbd key="kbd">⌘K</Kbd>],
		['Code', 'grid cell', 'code', 'grid', <Code key="code">pnpm install</Code>],
	] as const)('keeps a %s at the width of its text in a %s', ([, , slot, parent, mark]) => {
		const { container } = renderUI(
			<div className={parent} style={{ width: 600 }}>
				{mark}
			</div>,
		)

		const width = present(bySlot(container, slot), slot).getBoundingClientRect().width

		expect(width).toBeLessThan(200)
	})
})
