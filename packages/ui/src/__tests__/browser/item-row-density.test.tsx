import { Check } from 'lucide-react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuItem } from '../../components/menu'
import { writeRootDensity } from '../../core/density'
import { Option } from '../../primitives/option/option'
import { DensityProvider, densityLevels } from '../../providers/density'
import { present, renderUI, screen } from '../helpers'

/**
 * A Menu row and an Option row take the padding and the icon size of the step of the nearest
 * density scope.
 *
 * The suite runs at 414px, below the `sm` breakpoint. A plain `sm:` padding on a row is outside
 * the density layers, so it wins over the stepped padding only at 640px and wider. Thus this file
 * runs at a desktop width.
 */
beforeAll(() => page.viewport(1280, 800))

const ROW_PADDING_PX = { compact: 4, snug: 6, loose: 10 } as const

const ICON_PX = { compact: 18, snug: 20, loose: 22 } as const

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

	it.each(levels)('sizes a menu row icon at the step of a %s provider', async (density) => {
		renderUI(
			<DensityProvider density={density}>
				<Menu defaultOpen>
					<MenuContent aria-label="Actions">
						<MenuItem>
							<Icon icon={<Check />} />
							Copy
						</MenuItem>
					</MenuContent>
				</Menu>
			</DensityProvider>,
		)

		const row = await screen.findByRole('menuitem', { name: 'Copy' })

		const icon = present(row.querySelector('[data-slot="icon"]'), 'menu row icon')

		expect(Number.parseFloat(getComputedStyle(icon).width)).toBe(ICON_PX[density])
	})

	describe('under an xs root', () => {
		afterEach(() => {
			writeRootDensity(document.documentElement, 'md')
		})

		// The text and the icon of a row take the `xs` step.
		it('sizes a menu row icon at xs', async () => {
			writeRootDensity(document.documentElement, 'xs')

			renderUI(
				<Menu defaultOpen>
					<MenuContent aria-label="Actions">
						<MenuItem>
							<Icon icon={<Check />} />
							Copy
						</MenuItem>
					</MenuContent>
				</Menu>,
			)

			const row = await screen.findByRole('menuitem', { name: 'Copy' })

			const icon = present(row.querySelector('[data-slot="icon"]'), 'menu row icon')

			expect(Number.parseFloat(getComputedStyle(row).fontSize)).toBe(12)

			expect(Number.parseFloat(getComputedStyle(icon).width)).toBe(16)
		})
	})
})
