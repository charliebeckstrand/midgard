import { describe, expect, it, vi } from 'vitest'
import {
	type GridMenuResolution,
	openKeyboardMenu,
} from '../../modules/grid/engine/grid-menu-targeting'
import { attach } from '../helpers'

const MENU: GridMenuResolution = {
	items: [{ label: 'Copy', onAction: () => {} }],
	name: 'Cell menu',
}

/**
 * An outer grid whose first row holds a detail panel with a nested grid, and
 * whose second row comes after the panel. Each grid marks the cell of its
 * own cursor with `data-active`, so the nested cell comes first in document
 * order.
 */
function nestedGrids({ outerActive }: { outerActive: boolean }) {
	const root = attach(document.createElement('div'))

	root.innerHTML = `
		<div role="grid" tabindex="0" data-testid="outer">
			<table>
				<tbody>
					<tr data-grid-row="1"><td role="gridcell" data-grid-col="name">Outer 1</td></tr>
					<tr>
						<td>
							<div role="grid" tabindex="0">
								<table>
									<tbody>
										<tr data-grid-row="1">
											<td role="gridcell" data-grid-col="name" data-active>Nested 1</td>
										</tr>
									</tbody>
								</table>
							</div>
						</td>
					</tr>
					<tr data-grid-row="2">
						<td role="gridcell" data-grid-col="name" ${outerActive ? 'data-active' : ''} data-testid="outer-cell">Outer 2</td>
					</tr>
				</tbody>
			</table>
		</div>
	`

	const get = (id: string) => {
		const node = root.querySelector<HTMLElement>(`[data-testid="${id}"]`)

		if (!node) throw new Error(`no node ${id}`)

		return node
	}

	return { outer: get('outer'), outerCell: get('outer-cell') }
}

describe('openKeyboardMenu', () => {
	// A nested grid keeps its cursor mark while the outer grid has focus. Its
	// column ids and row keys name nothing in the outer grid.
	it('opens the menu of the active cell of this grid, not of a nested grid', () => {
		const { outer, outerCell } = nestedGrids({ outerActive: true })

		const resolveItems = vi.fn(() => MENU)

		const commit = vi.fn()

		openKeyboardMenu(outer, resolveItems, () => null, commit, { current: null })

		expect(resolveItems).toHaveBeenCalledExactlyOnceWith(outerCell)

		expect(commit).toHaveBeenCalledExactlyOnceWith(
			MENU,
			outerCell,
			expect.any(Number),
			expect.any(Number),
		)
	})

	it('opens no menu when only a nested grid has an active cell', () => {
		const { outer } = nestedGrids({ outerActive: false })

		const resolveItems = vi.fn(() => MENU)

		const commit = vi.fn()

		openKeyboardMenu(outer, resolveItems, () => null, commit, { current: null })

		expect(resolveItems).not.toHaveBeenCalled()

		expect(commit).not.toHaveBeenCalled()
	})
})
