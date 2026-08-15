import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { CommandPalette, CommandPaletteItem } from '../../components/command-palette'
import { Menu, MenuContent, MenuItem } from '../../components/menu'
import { bySlot, noop, present, renderUI, screen } from '../helpers'

/**
 * Glass item wash (real paint). `hannou.glassItem` deepens a row's hover fill
 * from `hannou.tint`'s 5% to 10% inside a glass parent. jsdom compiles no
 * Tailwind and paints no `:hover`, so a class-string assertion cannot tell the
 * two washes apart. Only a real browser reads the fill back off the row.
 *
 * Covers each panel that holds rows: the popover a menu opens, and the dialog a
 * command palette's rows hover inside.
 */
describe('Glass item wash (real browser)', () => {
	/** `hannou.tint` — the wash every row takes on a plain surface. */
	const TINT = 0.05

	/** `hannou.glassItem` — the deeper wash a row takes inside a glass parent. */
	const GLASS_WASH = 0.1

	/**
	 * Alpha of an element's painted background. Chromium resolves the recipe's
	 * `bg-zinc-950/5` and `/10` to the same `oklab()` colour and separates them
	 * only by alpha, which is exactly the difference under test.
	 */
	function washOf(element: Element): number {
		const painted = getComputedStyle(element).backgroundColor

		const alpha = painted.match(/\/\s*([\d.]+)\s*\)$/)

		if (!alpha) throw new Error(`background-color carries no alpha: ${painted}`)

		return Number(alpha[1])
	}

	/** The single row of an open menu, rendered on the flat or the glass surface. */
	function menuRow(glass: boolean): HTMLElement {
		renderUI(
			<Menu defaultOpen>
				<MenuContent aria-label="Actions">
					<MenuItem>Alpha</MenuItem>
				</MenuContent>
			</Menu>,
			{ glass },
		)

		return screen.getByRole('menuitem', { name: 'Alpha' })
	}

	/** The single row of an open command palette, which hovers inside a Dialog. */
	function paletteRow(glass: boolean): HTMLElement {
		renderUI(
			<CommandPalette open onOpenChange={noop}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
			</CommandPalette>,
			{ glass },
		)

		return screen.getByRole('option', { name: 'Alpha' })
	}

	it('deepens a menu row to the glass wash, and drops it with the attribute', async () => {
		const row = menuRow(true)

		await userEvent.hover(row)

		expect(washOf(row)).toBeCloseTo(GLASS_WASH, 3)

		const panel = present(bySlot(document.body, 'popover-panel'), 'the popover panel')

		expect(panel).toHaveClass('group/glass')

		// The state the bug shipped in: the class, no attribute. Stripping it off
		// the still-classed panel pins the pairing on the one node.
		panel.removeAttribute('data-glass')

		expect(washOf(row)).toBeCloseTo(TINT, 3)
	})

	it('leaves a menu row on the plain tint outside a glass panel', async () => {
		const row = menuRow(false)

		await userEvent.hover(row)

		expect(washOf(row)).toBeCloseTo(TINT, 3)
	})

	it('deepens a command-palette row to the glass wash inside a glass dialog', async () => {
		const row = paletteRow(true)

		await userEvent.hover(row)

		expect(washOf(row)).toBeCloseTo(GLASS_WASH, 3)
	})

	it('leaves a command-palette row on the plain tint outside a glass dialog', async () => {
		const row = paletteRow(false)

		await userEvent.hover(row)

		expect(washOf(row)).toBeCloseTo(TINT, 3)
	})
})
