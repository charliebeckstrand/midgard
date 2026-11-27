import { House, Plus } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Icon } from '../../../components/icon'
import { Nav, NavItem, NavList } from '../../../components/nav'
import { type DensityLevel, DensityProvider, densityLevels } from '../../../providers/density'
import { getSlot, renderUI } from '../../helpers'

/**
 * The height, the text, and the icon of a NavItem take the step of the nearest
 * density scope. A prefix or a suffix slot is a scope one step below the item.
 * Before, the item kept the `md` chrome at each step, and each slot was a fixed
 * `sm` scope (V21). At `snug` (`md`) the values are the values from before the
 * change.
 */

const levels = densityLevels.map(({ value }) => value)

const EXPECTED = {
	compact: { height: 34, text: 14, icon: 18, slotIcon: 16, slotInset: 6 },
	snug: { height: 40, text: 16, icon: 20, slotIcon: 18, slotInset: 8 },
	loose: { height: 46, text: 18, icon: 22, slotIcon: 20, slotInset: 10 },
} as const

function measure(density: DensityLevel) {
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

	const inner = getSlot(container, 'nav-item-inner')

	const icon = getSlot(inner, 'icon')

	const suffix = getSlot(container, 'nav-item-suffix')

	const slotIcon = getSlot(suffix, 'icon')

	return {
		height: inner.getBoundingClientRect().height,
		text: Number.parseFloat(getComputedStyle(inner).fontSize),
		icon: icon.getBoundingClientRect().width,
		slotIcon: slotIcon.getBoundingClientRect().width,
		slotInset: Number.parseFloat(getComputedStyle(suffix).marginInlineEnd),
	}
}

describe('NavItem density', () => {
	it.each(levels)('sizes the item and its slot at the step of a %s provider', (density) => {
		expect(measure(density)).toEqual(EXPECTED[density])
	})
})
