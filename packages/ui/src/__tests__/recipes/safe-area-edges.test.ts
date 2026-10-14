// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { utilityTable } from '../../core/density/utility-table'
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

	// `browser/density-contract.test.tsx` holds the length of this inset at each step.
	it('pads the dialog where it docks to the bottom edge, at each density step', () => {
		const classes = dialog.panel({}).split(' ')

		expect(classes).toContain('density-pb-[4,5,6,7,8]')

		expect(classes).toContain('max-sm:density-pb-safe-[4,5,6,7,8]')

		expect(utilityTable['pb-safe'].add).toContain(bottom)
	})

	it('pads each drawer height by the inset alone', () => {
		for (const height of ['auto', 'fit', 'half', 'full'] as const) {
			expect(drawer.panel({ height })).toContain(`pb-[${bottom}]`)
		}

		expect(sheet.panel({ side: 'bottom' })).toContain(`pb-[${bottom}]`)
	})

	it('pads the toast stack at both ends', () => {
		for (const position of ['top-right', 'bottom-left'] as const) {
			const className = toast.viewport({ position })

			expect(className).toContain('env(safe-area-inset-top)')

			expect(className).toContain(bottom)
		}
	})
})
