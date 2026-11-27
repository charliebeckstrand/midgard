import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { gridCases } from '../../a11y/cases/grids'
import { present, renderUI, waitFor } from '../../helpers'
import { eachAuthorScheme, systemColor } from '../helpers/forced-colors'

/**
 * The cursor of a navigable Grid on each kind of row, under forced colors. The ring of the
 * cursor is a box-shadow, which forced colors remove, so the active cell draws a 2 px
 * `Highlight` outline in its place. A group row, a total row, and a detail row have one stop
 * cell, and each of these cells must take the ring too. The focus sweep reads only the first
 * stop of a grid, so this case moves the cursor down each row.
 */

const navigable = gridCases.filter(
	(gridCase) => (gridCase.element.props as { navigable?: boolean }).navigable,
)

describe('grid cursor on each row under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it.each(navigable.map((gridCase) => [gridCase.name, gridCase.element] as const))(
			'outlines the active cell on each row of %s',
			async (_name, element) => {
				const { container } = renderUI(element)

				const table = present(container.querySelector<HTMLElement>('table'), 'the table')

				await userEvent.tab()

				expect(document.activeElement).toBe(table)

				const rowCount = container.querySelectorAll('tbody tr, tfoot tr').length

				const unmarked: string[] = []

				for (let step = 0; step < rowCount; step++) {
					const active = await waitFor(() =>
						present(container.querySelector<HTMLElement>('[data-active]'), 'the active cell'),
					)

					const style = getComputedStyle(active)

					if (
						`${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}` !==
						`solid 2px ${systemColor('Highlight')}`
					) {
						unmarked.push(active.closest('tr')?.textContent?.trim() ?? '')
					}

					await userEvent.keyboard('{ArrowDown}')
				}

				expect(unmarked).toEqual([])
			},
		)
	})
})
