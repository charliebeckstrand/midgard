import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, present, renderUI, waitFor } from '../helpers'

/**
 * The grid chrome in a right-to-left grid. Each edge, margin, and alignment
 * that the recipes name is logical, so it lands on the inline start or end.
 * Only a real browser resolves a logical class to a physical side.
 */
beforeAll(() => page.viewport(1280, 900))

type Sale = { id: number; region: string; units: number }

const sales: Sale[] = [
	{ id: 1, region: 'West', units: 10 },
	{ id: 2, region: 'West', units: 30 },
	{ id: 3, region: 'East', units: 20 },
]

const columns: GridColumn<Sale>[] = [
	{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
	{ id: 'units', title: 'Units', cell: (row) => row.units, value: (row) => row.units },
]

describe('grid group rail in a right-to-left grid (real browser)', () => {
	it('draws the rail at the inline start of the group header cell', () => {
		const { container } = renderUI(
			<div dir="rtl" style={{ width: 600 }}>
				<Grid
					columns={columns}
					rows={sales}
					getKey={(row) => row.id}
					groupBy={{ value: 'region' }}
				/>
			</div>,
		)

		const cell = present(
			container.querySelector<HTMLElement>('tr[data-group-row] > td'),
			'a group header cell',
		)

		const style = getComputedStyle(cell)

		expect(style.borderRightWidth).toBe('2px')

		expect(style.borderLeftWidth).toBe('0px')
	})
})

describe('grid toolbar and footer layout in a right-to-left grid (real browser)', () => {
	const rows: Sale[] = Array.from({ length: 30 }, (_, i) => ({
		id: i + 1,
		region: i % 2 ? 'West' : 'East',
		units: i,
	}))

	/** The distance from the inline end of `box` to the inline end of `row`: the physical left. */
	const fromEnd = (box: HTMLElement, row: HTMLElement) =>
		box.getBoundingClientRect().left - row.getBoundingClientRect().left

	it('pushes the toolbar content to the inline end', () => {
		const { getByText } = renderUI(
			<div dir="rtl" style={{ width: 900 }}>
				<Grid columns={columns} rows={rows} getKey={(row) => row.id} toolbar={<span>Extra</span>} />
			</div>,
		)

		const content = present(getByText('Extra').parentElement, 'the toolbar content')

		const bar = present(content.parentElement, 'the toolbar row')

		expect(Math.abs(fromEnd(content, bar))).toBeLessThanOrEqual(1)
	})

	it('pushes the table tools to the inline end', () => {
		const { getByRole } = renderUI(
			<div dir="rtl" style={{ width: 900 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					columnManager={{ toolbar: true }}
				/>
			</div>,
		)

		const tools = getByRole('toolbar', { name: 'Table tools' })

		const bar = present(tools.parentElement, 'the toolbar row')

		expect(Math.abs(fromEnd(tools, bar))).toBeLessThanOrEqual(1)
	})

	it('pushes the footer content to the inline end', () => {
		const { getByText } = renderUI(
			<div dir="rtl" style={{ width: 900 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					footer={{ rowTotal: true, content: () => <span>Extra</span> }}
				/>
			</div>,
		)

		const trailing = present(getByText('Extra').parentElement, 'the footer content')

		const bar = present(trailing.parentElement, 'the footer bar')

		expect(Math.abs(fromEnd(trailing, bar))).toBeLessThanOrEqual(1)
	})

	it('aligns the page status to the inline end', () => {
		const { getAllByRole } = renderUI(
			<div dir="rtl" style={{ width: 1100 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
				/>
			</div>,
		)

		// The page status names the row range, such as "1–5 of 30".
		const status = present(
			getAllByRole('status').find((element) => / of 30/.test(element.textContent ?? '')),
			'the page status',
		)

		expect(getComputedStyle(status).textAlign).toBe('end')
	})
})

describe('grid cell editor in a right-to-left grid (real browser)', () => {
	type Row = { id: number; name: string }

	const editColumns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			field: 'name',
			cell: (row) => row.name,
			validate: (value) => (value === 'bad' ? 'Enter a valid name' : null),
		},
	]

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	/** Opens the editor of the name cell, and gives it an invalid value. */
	async function openInvalidEditor() {
		const { container } = renderUI(
			<div dir="rtl" style={{ width: 600 }}>
				<Grid
					columns={editColumns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
				/>
			</div>,
		)

		await userEvent.dblClick(
			present(container.querySelector<HTMLElement>('td[data-grid-col="name"]'), 'the name cell'),
		)

		const input = await waitFor(() =>
			present<HTMLInputElement>(
				container.querySelector('[data-slot="grid-edit-input"]'),
				'the edit input',
			),
		)

		fireEvent.change(input, { target: { value: 'bad' } })

		const message = await waitFor(() =>
			present(container.querySelector<HTMLElement>('[role="alert"]'), 'the error message'),
		)

		const host = present(message.parentElement, 'the editor host')

		return { input, message, host }
	}

	it('spaces the settle pair from the editor at its inline start', async () => {
		const { input, message, host } = await openInvalidEditor()

		// The settle pair follows the editor, so it sits to its left.
		const settle = present(
			Array.from(host.children).find(
				(child) => child !== message && child.querySelector('button') !== null,
			) as HTMLElement | undefined,
			'the settle pair',
		)

		const gap = input.getBoundingClientRect().left - settle.getBoundingClientRect().right

		expect(gap).toBeGreaterThanOrEqual(3)
	})

	it('hangs the error message from the inline start of the editor', async () => {
		const { message, host } = await openInvalidEditor()

		expect(
			Math.abs(message.getBoundingClientRect().right - host.getBoundingClientRect().right),
		).toBeLessThanOrEqual(1)
	})
})
