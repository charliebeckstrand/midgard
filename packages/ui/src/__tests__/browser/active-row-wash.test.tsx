import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cdp, commands, userEvent } from 'vitest/browser'
import { Button } from '../../components/button'
import { CommandPalette, CommandPaletteItem } from '../../components/command-palette'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../components/menu'
import { noop, renderUI, screen, waitFor } from '../helpers'

/**
 * The wash of a roved row (real paint). A command palette and a dropdown menu
 * rove by `data-active`, and the row never takes focus. `hannou.active` is the
 * only rule that marks the roved row, so it must have the glass form and the
 * forced-colors form that the hover and focus washes have. jsdom compiles no
 * Tailwind and paints nothing, so only a real browser reads the fill back off
 * the row.
 */

/** `hannou.active`: the wash of a roved row on a plain surface. */
const ACTIVE = 0.05

/** The wash of a roved row inside a glass parent, the glass step of {@link ACTIVE}. */
const GLASS_ACTIVE = 0.1

/** The wash of a roved palette row under the pointer inside a glass parent, one glass step deeper. */
const GLASS_ACTIVE_HOVER = 0.2

/**
 * Alpha of an element's painted background. Chromium resolves the recipe's
 * `bg-zinc-950/5`, `/10`, and `/20` to the same `oklab()` color and separates
 * them only by alpha, which is the difference under test.
 */
function washOf(element: Element): number {
	const painted = getComputedStyle(element).backgroundColor

	const alpha = painted.match(/\/\s*([\d.]+)\s*\)$/)

	if (!alpha) throw new Error(`background-color carries no alpha: ${painted}`)

	return Number(alpha[1])
}

/**
 * The colors that the system gives to `Highlight` and `HighlightText` now. A
 * probe reads them, and goes before the function returns, so no node stays on
 * the page.
 */
function systemHighlight(): { background: string; color: string } {
	const probe = document.createElement('div')

	probe.style.cssText =
		'forced-color-adjust: none; background-color: Highlight; color: HighlightText'

	document.body.append(probe)

	const { backgroundColor, color } = getComputedStyle(probe)

	probe.remove()

	return { background: backgroundColor, color }
}

/** The two rows of an open command palette, the first one roved by the keyboard. */
async function rovedPaletteRow(glass: boolean): Promise<HTMLElement> {
	renderUI(
		<CommandPalette open onOpenChange={noop}>
			<CommandPaletteItem>Alpha</CommandPaletteItem>
			<CommandPaletteItem>Beta</CommandPaletteItem>
		</CommandPalette>,
		{ glass },
	)

	const row = screen.getByRole('option', { name: 'Alpha' })

	await userEvent.keyboard('{ArrowDown}')

	await waitFor(() => expect(row).toHaveAttribute('data-active'))

	return row
}

/**
 * The row of an open dropdown menu, roved by the pointer. A dropdown keeps
 * focus on its trigger, so the row takes `data-active` and not focus. The
 * pointer stays on the row. `sheet={false}` keeps the panel next to its
 * trigger at the narrow viewport of the suite, where a sheet roves by focus.
 */
async function rovedMenuRow(glass: boolean): Promise<HTMLElement> {
	renderUI(
		<Menu defaultOpen placement="bottom-start" sheet={false}>
			<MenuTrigger>
				<Button variant="outline">Options</Button>
			</MenuTrigger>
			<MenuContent aria-label="Actions">
				<MenuItem>Alpha</MenuItem>
			</MenuContent>
		</Menu>,
		{ glass },
	)

	const row = screen.getByRole('menuitem', { name: 'Alpha' })

	await userEvent.hover(row)

	await waitFor(() => expect(row).toHaveAttribute('data-active'))

	expect(row).not.toHaveFocus()

	return row
}

describe('roved row wash in a glass parent (real browser)', () => {
	it('deepens a roved command-palette row to the glass step', async () => {
		const row = await rovedPaletteRow(true)

		expect(washOf(row)).toBeCloseTo(GLASS_ACTIVE, 3)
	})

	it('keeps a roved command-palette row one glass step deeper under the pointer', async () => {
		const row = await rovedPaletteRow(true)

		await userEvent.hover(row)

		expect(washOf(row)).toBeCloseTo(GLASS_ACTIVE_HOVER, 3)
	})

	it('deepens a roved menu row to the glass step after the pointer leaves it', async () => {
		const row = await rovedMenuRow(true)

		await commands.parkPointer()

		expect(row).toHaveAttribute('data-active')

		expect(washOf(row)).toBeCloseTo(GLASS_ACTIVE, 3)
	})

	it('leaves a roved command-palette row on the plain wash outside a glass dialog', async () => {
		const row = await rovedPaletteRow(false)

		expect(washOf(row)).toBeCloseTo(ACTIVE, 3)
	})
})

describe('roved row under forced colors (real browser)', () => {
	// The instance shares one page across its files, and the emulation is page
	// state. Thus `afterAll` gives the feature back to the browser.
	beforeAll(() =>
		cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'forced-colors', value: 'active' }],
		}),
	)

	afterAll(() =>
		cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: '' }] }),
	)

	it('emulates forced colors', () => {
		expect(matchMedia('(forced-colors: active)').matches).toBe(true)
	})

	it('paints a roved command-palette row in the system highlight', async () => {
		const row = await rovedPaletteRow(false)

		const { backgroundColor: background, color } = getComputedStyle(row)

		expect({ background, color }).toEqual(systemHighlight())
	})

	// The glass dialog gives the row its strongest wash, the glass step under
	// the pointer, so the highlight must win over that rule too.
	it('keeps the system highlight on a roved command-palette row under the pointer in a glass dialog', async () => {
		const row = await rovedPaletteRow(true)

		await userEvent.hover(row)

		const { backgroundColor: background, color } = getComputedStyle(row)

		expect({ background, color }).toEqual(systemHighlight())
	})

	it('paints a roved menu row in the system highlight under the pointer', async () => {
		const row = await rovedMenuRow(false)

		const { backgroundColor: background, color } = getComputedStyle(row)

		expect({ background, color }).toEqual(systemHighlight())
	})
})
