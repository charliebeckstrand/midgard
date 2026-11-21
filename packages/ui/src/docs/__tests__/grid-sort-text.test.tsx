// @vitest-environment jsdom
import type { GridColumn } from 'ui/grid'
import { describe, expect, it } from 'vitest'
import { columnAccessor } from '../../modules/grid/engine/grid-column/accessor.ts'
import { LOCALES } from '../app/language.ts'
import { COPY_TIMEOUT, loadCopy } from './copy.tsx'

// A column of a grid demo sorts by the text that its cell shows. The client
// sort reads the `value` of a column, or else the row field of its id. A cell
// that shows the word of a key, such as a role, must give that word as its
// `value`. Else the column sorts by the English key, and a translated page
// shows the rows out of order. The mock server of a demo sorts the same way.

type DataModule = typeof import('../pages/modules/grid/data.tsx')

type PeopleModule = typeof import('../pages/modules/grid/editing/people.tsx')

/** The grid data of the demos and the editing columns, in `locale`. */
function loadGridData(locale: string): Promise<[DataModule, PeopleModule]> {
	return Promise.all([
		loadCopy<DataModule>('../pages/modules/grid/data.tsx', locale),
		loadCopy<PeopleModule>('../pages/modules/grid/editing/people.tsx', locale),
	])
}

/** Each column whose cell shows a string, and its rows. */
function textCells<T>(columns: readonly GridColumn<T>[], rows: readonly T[]) {
	return columns.flatMap((column) =>
		rows.flatMap((row) => {
			const cell = column.cell?.(row)

			return typeof cell === 'string'
				? [{ column: column.id, cell, value: columnAccessor(column)(row) }]
				: []
		}),
	)
}

describe.each(LOCALES)('the grid demo columns in %s', { timeout: COPY_TIMEOUT }, (locale) => {
	it('give each text cell its shown text as the sort value', async () => {
		const [data, editing] = await loadGridData(locale)

		const cells = [
			...textCells(data.columns, data.people),
			...textCells(data.employeeColumns, data.employees),
			...textCells(editing.personColumns, editing.initialPeople),
		]

		expect(cells.length).toBeGreaterThan(0)

		for (const { column, cell, value } of cells) {
			expect({ column, value }).toEqual({ column, value: cell })
		}
	})

	it('reads a paste of a copied role as the key of the role', async () => {
		const [, editing] = await loadGridData(locale)

		const role = editing.personColumns.find((column) => column.id === 'role')

		for (const row of editing.initialPeople) {
			const copied = String(role && columnAccessor(role)(row))

			expect(role?.parse?.(copied, row)).toBe(row.role)
		}
	})
})
