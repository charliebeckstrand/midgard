import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { LocaleProvider } from '../../providers/locale/locale'
import { renderUI } from '../helpers'

type Row = { id: number; name: string }

const rows: Row[] = [
	{ id: 1, name: 'ä' },
	{ id: 2, name: 'z' },
	{ id: 3, name: 'a' },
]

const getKey = (row: Row) => row.id

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
]

/** The text order of the body cells. */
function bodyOrder(container: HTMLElement): string[] {
	return [...container.querySelectorAll('tbody td')].map((cell) => cell.textContent ?? '')
}

/**
 * The string sort collates in the locale of the nearest `LocaleProvider`, as
 * the formatted values of the grid do. Swedish sorts `ä` after `z`.
 */
describe('Grid sort locale', () => {
	it('collates the string sort in the locale of the provider', () => {
		const grid = (
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ defaultValue: [{ column: 'name', direction: 'asc' }] }}
			/>
		)

		const swedish = renderUI(<LocaleProvider locale="sv">{grid}</LocaleProvider>)

		expect(bodyOrder(swedish.container)).toEqual(['a', 'z', 'ä'])

		swedish.unmount()

		const english = renderUI(<LocaleProvider locale="en">{grid}</LocaleProvider>)

		expect(bodyOrder(english.container)).toEqual(['a', 'ä', 'z'])
	})
})
