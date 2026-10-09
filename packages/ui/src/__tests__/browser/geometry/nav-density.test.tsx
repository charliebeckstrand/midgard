import { House, Plus } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Icon } from '../../../components/icon'
import { Nav, NavItem, NavList } from '../../../components/nav'
import { DensityProvider } from '../../../providers/density'
import { present, renderUI } from '../../helpers'

/**
 * The height, the text, and the icon of a NavItem take the step of the nearest
 * density scope. A prefix or a suffix slot is a scope one step below the item.
 * Before, the item kept the `md` chrome at each step, and each slot was a fixed
 * `sm` scope (V21). At `snug` (`md`) the values are the values from before the
 * change.
 */

type Density = 'compact' | 'snug' | 'loose'

const EXPECTED = {
	compact: { height: 34, text: 14, icon: 18, slotIcon: 16, slotInset: 6 },
	snug: { height: 40, text: 16, icon: 20, slotIcon: 18, slotInset: 8 },
	loose: { height: 46, text: 18, icon: 22, slotIcon: 20, slotInset: 10 },
} as const

function measure(density: Density) {
	const { container } = renderUI(
		<DensityProvider density={density}>
			<Nav aria-label="Primary">
				<NavList orientation="vertical">
					<NavItem href="#home" icon={<House />} suffix={<Icon icon={<Plus />} aria-label="Add" />}>
						Home
					</NavItem>
				</NavList>
			</Nav>
		</DensityProvider>,
	)

	const inner = present(container.querySelector('[data-slot="nav-item-inner"]'), 'the item')

	const icon = present(inner.querySelector('[data-slot="icon"]'), 'the item icon')

	const suffix = present(container.querySelector('[data-slot="nav-item-suffix"]'), 'the suffix')

	const slotIcon = present(suffix.querySelector('[data-slot="icon"]'), 'the suffix icon')

	return {
		height: inner.getBoundingClientRect().height,
		text: Number.parseFloat(getComputedStyle(inner).fontSize),
		icon: icon.getBoundingClientRect().width,
		slotIcon: slotIcon.getBoundingClientRect().width,
		slotInset: Number.parseFloat(getComputedStyle(suffix).marginInlineEnd),
	}
}

describe('NavItem density', () => {
	it.each(['compact', 'snug', 'loose'] as const)(
		'sizes the item and its slot at the step of a %s provider',
		(density) => {
			expect(measure(density)).toEqual(EXPECTED[density])
		},
	)
})
