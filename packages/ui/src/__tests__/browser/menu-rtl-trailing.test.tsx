import { afterEach, describe, expect, it } from 'vitest'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuShortcut,
	MenuSub,
} from '../../components/menu'
import { getSlot, present, renderUI, screen } from '../helpers'

/**
 * The trailing parts of a menu row sit at the inline end, in both directions.
 *
 * The shortcut and the submenu chevron used `ml-auto`, a physical margin. In a right-to-left
 * document they then stayed on the right, beside the label, and the chevron pointed into the
 * row. The row now uses `ms-auto`, and the chevron mirrors. Placement is a computed-layout claim,
 * so this rides the real browser.
 */
describe('menu row trailing parts (real browser)', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('dir')
	})

	function rows(dir: 'ltr' | 'rtl') {
		document.documentElement.dir = dir

		renderUI(
			<Menu defaultOpen>
				<MenuContent aria-label="Actions">
					<MenuItem>
						<MenuLabel>Copy</MenuLabel>
						<MenuShortcut>⌘C</MenuShortcut>
					</MenuItem>
					<MenuSub label="More">
						<MenuItem>Nested</MenuItem>
					</MenuSub>
				</MenuContent>
			</Menu>,
		)

		const copy = screen.getByRole('menuitem', { name: /Copy/ })

		const more = screen.getByRole('menuitem', { name: /More/ })

		const chevron = present(more.querySelector('svg'), 'chevron')

		/** The inner edges of a row's content box, inside its padding. */
		const content = (row: HTMLElement) => {
			const rect = row.getBoundingClientRect()

			const style = getComputedStyle(row)

			return {
				left: rect.left + Number.parseFloat(style.paddingLeft),
				right: rect.right - Number.parseFloat(style.paddingRight),
			}
		}

		return {
			row: content(copy),
			subRow: content(more),
			label: getSlot(copy, 'menu-label').getBoundingClientRect(),
			shortcut: getSlot(copy, 'menu-shortcut').getBoundingClientRect(),
			subLabel: getSlot(more, 'menu-label').getBoundingClientRect(),
			chevron: chevron.getBoundingClientRect(),
			scale: getComputedStyle(present(chevron.closest('[data-slot="icon"]') ?? chevron, 'icon'))
				.scale,
		}
	}

	it('keeps the shortcut and chevron at the right end in LTR', () => {
		const { row, subRow, label, shortcut, subLabel, chevron } = rows('ltr')

		expect(shortcut.left).toBeGreaterThan(label.right)

		expect(shortcut.right).toBeCloseTo(row.right, 0)

		expect(chevron.left).toBeGreaterThan(subLabel.right)

		expect(chevron.right).toBeCloseTo(subRow.right, 0)
	})

	it('moves the shortcut and chevron to the left end in RTL, and mirrors the chevron', () => {
		const { row, subRow, label, shortcut, subLabel, chevron, scale } = rows('rtl')

		expect(shortcut.right).toBeLessThan(label.left)

		expect(shortcut.left).toBeCloseTo(row.left, 0)

		expect(chevron.right).toBeLessThan(subLabel.left)

		expect(chevron.left).toBeCloseTo(subRow.left, 0)

		expect(scale).toMatch(/^-1\b/)
	})
})
