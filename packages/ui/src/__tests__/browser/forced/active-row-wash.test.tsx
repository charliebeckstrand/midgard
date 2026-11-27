import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { eachAuthorScheme, systemColor } from '../helpers/forced-colors'
import { rovedMenuRow, rovedPaletteRow } from '../helpers/roved-rows'

/**
 * The roved row of a command palette and of a menu under forced colors. Forced
 * colors replace each wash with a system color, so the row must take the
 * `Highlight` and `HighlightText` pair, over the hover and the glass washes too.
 * The fine half is `../active-row-wash.test.tsx`.
 */
describe('roved row under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('paints a roved command-palette row in the system highlight', async () => {
			const row = await rovedPaletteRow(false)

			const { backgroundColor: background, color } = getComputedStyle(row)

			expect({ background, color }).toEqual({
				background: systemColor('Highlight'),
				color: systemColor('HighlightText'),
			})
		})

		// The glass dialog gives the row its strongest wash, the glass step under
		// the pointer, so the highlight must win over that rule too.
		it('keeps the system highlight on a roved command-palette row under the pointer in a glass dialog', async () => {
			const row = await rovedPaletteRow(true)

			await userEvent.hover(row)

			const { backgroundColor: background, color } = getComputedStyle(row)

			expect({ background, color }).toEqual({
				background: systemColor('Highlight'),
				color: systemColor('HighlightText'),
			})
		})

		it('paints a roved menu row in the system highlight under the pointer', async () => {
			const row = await rovedMenuRow(false)

			const { backgroundColor: background, color } = getComputedStyle(row)

			expect({ background, color }).toEqual({
				background: systemColor('Highlight'),
				color: systemColor('HighlightText'),
			})
		})
	})
})
