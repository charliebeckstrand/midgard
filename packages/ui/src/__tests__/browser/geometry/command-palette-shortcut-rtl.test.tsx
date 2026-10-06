import { describe, expect, it } from 'vitest'
import {
	CommandPalette,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteShortcut,
} from '../../../components/command-palette'
import { LocaleProvider } from '../../../providers/locale'
import { getSlot, noop, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The shortcut of a command palette row sits at the inline end, in both
 * directions.
 *
 * The shortcut used `ml-auto`, a physical margin. A row that holds only a
 * label and a shortcut has no slot that takes the free width. In a right-to-left
 * scope the margin then pushed the shortcut against the label, not to the end
 * of the row. Placement is a computed-layout claim, so this case uses the real
 * browser.
 */
describe('command palette row shortcut (real browser)', () => {
	function row(dir: 'ltr' | 'rtl') {
		renderUI(
			<LocaleProvider dir={dir}>
				<CommandPalette open onOpenChange={noop}>
					<CommandPaletteGroup>
						<CommandPaletteItem>
							<CommandPaletteLabel>Copy</CommandPaletteLabel>
							<CommandPaletteShortcut>⌘C</CommandPaletteShortcut>
						</CommandPaletteItem>
					</CommandPaletteGroup>
				</CommandPalette>
			</LocaleProvider>,
		)

		const item = screen.getByRole('option', { name: /Copy/ })

		const rect = item.getBoundingClientRect()

		const style = getComputedStyle(item)

		return {
			direction: style.direction,
			// The inner edges of the content box of the row, inside its padding.
			content: {
				left: rect.left + Number.parseFloat(style.paddingLeft),
				right: rect.right - Number.parseFloat(style.paddingRight),
			},
			label: getSlot(item, 'command-palette-label').getBoundingClientRect(),
			shortcut: getSlot(item, 'command-palette-shortcut').getBoundingClientRect(),
		}
	}

	it('keeps the shortcut at the right end in LTR', () => {
		const { direction, content, label, shortcut } = row('ltr')

		expect(direction).toBe('ltr')

		expect(shortcut.left).toBeGreaterThan(label.right)

		expect(shortcut.right).toBeNear(content.right, HALF_PIXEL)
	})

	it('moves the shortcut to the left end in RTL', () => {
		const { direction, content, label, shortcut } = row('rtl')

		expect(direction).toBe('rtl')

		expect(shortcut.right).toBeLessThan(label.left)

		expect(shortcut.left).toBeNear(content.left, HALF_PIXEL)
	})
})
