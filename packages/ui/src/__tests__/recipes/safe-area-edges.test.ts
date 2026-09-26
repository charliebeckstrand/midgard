// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { k as dialog } from '../../recipes/kata/dialog'
import { k as drawer } from '../../recipes/kata/drawer'
import { k as sheet } from '../../recipes/kata/sheet'
import { k as toast } from '../../recipes/kata/toast'

/**
 * Each surface that sits on a screen edge keeps its content clear of the safe-area inset.
 *
 * Without `viewport-fit=cover` each inset is zero. In a page with it, such as a home-screen web
 * app, a drawer footer sat on the home indicator. This reads the resolved class of each surface,
 * so a merge that drops the inset fails here.
 */
describe('safe-area insets on edge surfaces', () => {
	const bottom = 'env(safe-area-inset-bottom)'

	it('pads the drawer at every height', () => {
		for (const height of ['auto', 'fit', 'half', 'full'] as const) {
			expect(drawer.panel({ height })).toContain(bottom)
		}
	})

	it('pads each sheet side on the edge it meets', () => {
		expect(sheet.panel({ side: 'bottom' })).toContain(bottom)

		expect(sheet.panel({ side: 'top' })).toContain('env(safe-area-inset-top)')

		expect(sheet.panel({ side: 'right' })).toContain(bottom)

		expect(sheet.panel({ side: 'left' })).toContain(bottom)
	})

	it('pads the dialog where it docks to the bottom edge', () => {
		expect(dialog.panel({})).toContain(`max-sm:pb-[calc(1.5rem+${bottom})]`)
	})

	it('pads the toast stack at both ends', () => {
		for (const position of ['top-right', 'bottom-left'] as const) {
			const cls = toast.viewport({ position })

			expect(cls).toContain('env(safe-area-inset-top)')

			expect(cls).toContain(bottom)
		}
	})
})
