import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Menu, MenuContent, MenuItem } from '../../components/menu'
import { Option } from '../../primitives/option'
import { DensityProvider, densityLevels } from '../../providers/density'
import { renderUI, screen } from '../helpers'

/**
 * A Menu row and an Option row take the padding of the step of the nearest density scope at a
 * desktop width.
 *
 * The suite runs at 414px, below the `sm` breakpoint. A plain `sm:` padding on a row is outside
 * the density layers, so it wins over the stepped padding only at 640px and wider. Thus this file
 * runs at a desktop width.
 */
beforeAll(() => page.viewport(1280, 800))

const ROW_PADDING_PX = { compact: 4, snug: 6, loose: 10 } as const

const levels = densityLevels.map(({ value }) => value)

const paddingOf = (node: Element) => Number.parseFloat(getComputedStyle(node).paddingTop)

describe('item rows at a desktop width (real browser)', () => {
	it.each(levels)('pads an option row at the step of a %s provider', (density) => {
		renderUI(
			<DensityProvider density={density}>
				<Option selected={false} onSelect={() => {}}>
					Option
				</Option>
			</DensityProvider>,
		)

		expect(paddingOf(screen.getByRole('option'))).toBe(ROW_PADDING_PX[density])
	})

	it.each(levels)('pads a menu row at the step of a %s provider', async (density) => {
		renderUI(
			<DensityProvider density={density}>
				<Menu defaultOpen>
					<MenuContent aria-label="Actions">
						<MenuItem>Copy</MenuItem>
					</MenuContent>
				</Menu>
			</DensityProvider>,
		)

		const row = await screen.findByRole('menuitem', { name: 'Copy' })

		expect(paddingOf(row)).toBe(ROW_PADDING_PX[density])
	})
})
