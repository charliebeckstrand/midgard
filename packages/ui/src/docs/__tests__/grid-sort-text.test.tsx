// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { GridColumn } from 'ui/grid'
import { LocaleProvider } from 'ui/providers/locale'
import { describe, expect, it } from 'vitest'
import { CI } from '../../../vitest.base.ts'
import { columnAccessor } from '../../modules/grid/engine/grid-column/accessor.ts'
import { catalogs } from '../app/catalogs.ts'

// A column of a grid demo sorts by the text that its cell shows. The client
// sort reads the `value` of a column, or else the row field of its id. A cell
// that shows the word of a key, such as a role, must give that word as its
// `value`. Else the column sorts by the English key, and the Spanish page
// shows the rows out of order. The mock server of a demo sorts the same way.

// The first import of a module in a language runs the docs plugin on it,
// which is slow when the other test files run too.
const TIMEOUT = CI ? 180_000 : 60_000

type DataModule = typeof import('../pages/modules/grid/data.tsx')

type PeopleModule = typeof import('../pages/modules/grid/editing/people.tsx')

/** The grid data of the demos and the editing columns, in `locale`. */
async function loadGridData(locale: string): Promise<[DataModule, PeopleModule]> {
	if (locale === 'en') {
		return Promise.all([
			import('../pages/modules/grid/data.tsx'),
			import('../pages/modules/grid/editing/people.tsx'),
		])
	}

	return Promise.all([
		import(/* @vite-ignore */ `../pages/modules/grid/data.tsx?lang=${locale}`),
		import(/* @vite-ignore */ `../pages/modules/grid/editing/people.tsx?lang=${locale}`),
	])
}

/** The default export of a demo module in `locale`. */
async function loadDemo(path: string, locale: string): Promise<ComponentType> {
	const module: { default: ComponentType } = await import(
		/* @vite-ignore */ `../pages/modules/grid/${path}?lang=${locale}`
	)

	return module.default
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

/** The text of each body cell of the column at `index`, in row order. */
function columnText(container: HTMLElement, index: number): string[] {
	return [...container.querySelectorAll('tbody tr')].map(
		(row) => row.querySelectorAll('td')[index]?.textContent ?? '',
	)
}

/** Sorts the grid by the column at `index`, as a press of its header does. */
function pressHeader(container: HTMLElement, index: number) {
	const header = container.querySelectorAll('thead th')[index]

	const button = header?.querySelector('button')

	if (!button) throw new Error(`The header at ${index} has no sort button.`)

	fireEvent.click(button)
}

/** `texts` in the order of the collator of `locale`. */
function collated(texts: readonly string[], locale: string): string[] {
	return texts.toSorted(new Intl.Collator(locale, { numeric: true }).compare)
}

describe.each(['en', 'es'])('the grid demo columns in %s', { timeout: TIMEOUT }, (locale) => {
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

describe('the sort of a grid demo on the Spanish page', { timeout: TIMEOUT }, () => {
	const locale = 'es'

	it('sorts the in-cell sparklines by the shown metric', async () => {
		const Demo = await loadDemo('sparkline/in-cell-sparklines.tsx', locale)

		const { container } = render(
			<LocaleProvider locale={locale} catalogs={catalogs}>
				<Demo />
			</LocaleProvider>,
		)

		const before = columnText(container, 0)

		pressHeader(container, 0)

		await waitFor(() => expect(columnText(container, 0)).toEqual(collated(before, locale)))

		expect(collated(before, locale)).not.toEqual(before)
	})

	it('sorts the server rows by the shown role', async () => {
		const Demo = await loadDemo('sorting/server-side-sorting.tsx', locale)

		const { container } = render(
			<LocaleProvider locale={locale} catalogs={catalogs}>
				<Demo />
			</LocaleProvider>,
		)

		const role = 2

		pressHeader(container, role)

		await waitFor(
			() => {
				const roles = columnText(container, role)

				expect(roles).toEqual(collated(roles, locale))

				expect(new Set(roles).size).toBeGreaterThan(2)
			},
			{ timeout: 5000 },
		)

		const names = columnText(container, 0)

		expect(names).not.toEqual(collated(names, locale))
	})
})
