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
			expect(drawer({ height }).base).toContain(bottom)
		}
	})

	it('pads each sheet side on the edge it meets', () => {
		expect(sheet({ side: 'bottom' }).base).toContain(bottom)

		expect(sheet({ side: 'top' }).base).toContain('env(safe-area-inset-top)')

		expect(sheet.layout.side.right.flush).toContain(bottom)

		expect(sheet.layout.side.left.flush).toContain(bottom)
	})

	// `browser/density-contract.test.tsx` holds the length of this inset at each step.
	it('pads the dialog where it docks to the bottom edge, at each density step', () => {
		const classes = dialog({}).base.split(' ')

		expect(classes).not.toContain('density-pb-[4,5,6,7,8]')

		expect(classes).toContain('density-set-[4,5,6,7,8]/[--ui-panel-bottom]')

		expect(classes).toContain('pb-[calc(var(--ui-panel-bottom)+var(--ui-panel-safe,0px))]')

		expect(dialog.align.panel.bottom).toContain(`[--ui-panel-safe:${bottom}]`)

		expect(dialog.align.panel.center).toContain('[--ui-panel-safe:0px]')
	})

	it('pads each drawer height by the inset alone', () => {
		for (const height of ['auto', 'fit', 'half', 'full'] as const) {
			expect(drawer({ height }).base).toContain(`pb-[${bottom}]`)
		}

		expect(sheet({ side: 'bottom' }).base).toContain(`pb-[${bottom}]`)
	})

	it('pads the toast stack at both ends', () => {
		const className = toast.viewport.join(' ')

		expect(className).toContain('env(safe-area-inset-top)')

		expect(className).toContain(bottom)
	})
})
