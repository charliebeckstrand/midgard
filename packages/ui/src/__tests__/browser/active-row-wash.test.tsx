import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { getSlot, screen } from '../helpers'
import { rovedMenuRow, rovedPaletteRow } from './helpers/roved-rows'

/**
 * The wash of a roved row (real paint). A command palette roves by
 * `data-active`, and the row never takes focus. `hannou.active` is the only
 * rule that marks that row, so it must have the glass form and the
 * forced-colors form that the hover and focus washes have. A dropdown menu
 * roves by real focus, and the focus wash marks its row. jsdom compiles no
 * Tailwind and paints nothing, so only a real browser reads the fill back off
 * the row. The forced half is `forced/active-row-wash.test.tsx`.
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
function readWash(element: Element): number {
	const painted = getComputedStyle(element).backgroundColor

	const alpha = painted.match(/\/\s*([\d.]+)\s*\)$/)

	if (!alpha) throw new Error(`background-color carries no alpha: ${painted}`)

	return Number(alpha[1])
}

describe('roved row wash in a glass parent (real browser)', () => {
	it('deepens a roved command-palette row to the glass step', async () => {
		const row = await rovedPaletteRow(true)

		expect(readWash(row)).toBeCloseTo(GLASS_ACTIVE, 3)
	})

	it('keeps a roved command-palette row one glass step deeper under the pointer', async () => {
		const row = await rovedPaletteRow(true)

		await userEvent.hover(row)

		expect(readWash(row)).toBeCloseTo(GLASS_ACTIVE_HOVER, 3)
	})

	// The pointer that leaves the rows takes the cursor with it, so the pointer
	// moves from the row to the gap below it, which is still among the rows.
	// The row then keeps the cursor with no hover wash under it.
	it('deepens a roved menu row to the glass step after the pointer leaves it', async () => {
		const row = await rovedMenuRow(true)

		const rows = getSlot(screen.getByRole('menu', { name: 'Actions' }), 'menu-viewport')

		await userEvent.hover(rows, {
			position: {
				x: rows.clientWidth / 2,
				y: row.offsetTop - rows.offsetTop + row.offsetHeight + 1,
			},
		})

		expect(row.matches(':hover')).toBe(false)

		expect(row).toHaveFocus()

		expect(readWash(row)).toBeCloseTo(GLASS_ACTIVE, 3)
	})

	it('leaves a roved command-palette row on the plain wash outside a glass dialog', async () => {
		const row = await rovedPaletteRow(false)

		expect(readWash(row)).toBeCloseTo(ACTIVE, 3)
	})
})
