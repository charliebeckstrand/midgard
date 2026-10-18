import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { LocaleProvider } from '../../providers/locale'
import { bySlot, fireEvent, present, renderUI, screen, waitFor } from '../helpers'

type Row = { id: number; name: string; count: number }

const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
	id: i + 1,
	name: `Row ${i + 1}`,
	count: i + 1,
}))

const getKey = (row: Row) => row.id

const columns: GridColumn<Row>[] = [
	{ id: 'select', selectable: true },
	{ id: 'name', title: 'Name', sortable: true, cell: (row) => row.name, value: (row) => row.name },
	{ id: 'count', title: 'Count', aggFunc: 'sum', value: (row) => row.count },
]

const editColumns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
]

/** Wraps a grid in a Spanish locale. */
const inSpanish = (grid: ReactNode) => <LocaleProvider locale="es-ES">{grid}</LocaleProvider>

/** The first data cell of a column. */
const firstCell = (container: HTMLElement, column: string) =>
	present(container.querySelector<HTMLElement>(`td[data-grid-col="${column}"]`), `a ${column} cell`)

describe('Grid surface in a locale', () => {
	it('names the header, the search, and the counts in the language of the locale', () => {
		const { container } = renderUI(
			inSpanish(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					search={{ defaultValue: 'Row 1' }}
					footer={{ rowTotal: true }}
					grandTotalRow
				/>,
			),
		)

		expect(screen.getByRole('button', { name: 'Ordenar por Name' })).toBeInTheDocument()

		expect(
			screen.getByRole('checkbox', { name: 'Seleccionar todas las filas' }),
		).toBeInTheDocument()

		expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveAttribute(
			'placeholder',
			'Buscar',
		)

		// "Row 1" keeps Row 1 and Row 10.
		expect(present(bySlot(container, 'grid-footer-status'), 'the count region')).toHaveTextContent(
			'2 de 10 filas visibles',
		)

		expect(screen.getByRole('rowheader', { name: 'Total' })).toBeInTheDocument()
	})

	it('names the reorder grip of a header and its role in the language of the locale', () => {
		renderUI(inSpanish(<Grid columns={columns} rows={rows} getKey={getKey} reorder />))

		expect(screen.getByRole('button', { name: 'Reordenar Name' })).toHaveAttribute(
			'aria-roledescription',
			'ordenable',
		)
	})

	it('counts the selection in the language of the locale', () => {
		const { container } = renderUI(
			inSpanish(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					selection={{ defaultValue: new Set<number>([1, 2]) }}
					footer={{ selectedTotal: true }}
				/>,
			),
		)

		expect(present(bySlot(container, 'grid-footer-status'), 'the count region')).toHaveTextContent(
			'2 de 10 filas seleccionadas',
		)
	})

	it('names the pages and the page status in the language of the locale', () => {
		renderUI(
			inSpanish(
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					tableProps={{ 'aria-label': 'Pedidos' }}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 }, pageSizeOptions: [5, 10] }}
				/>,
			),
		)

		expect(screen.getByRole('navigation', { name: 'Paginación de Pedidos' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Página anterior' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeInTheDocument()

		expect(screen.getByRole('combobox', { name: 'Filas por página' })).toHaveTextContent(
			'5 por página',
		)

		expect(screen.getByText('1–5 de 10')).toBeInTheDocument()

		expect(
			screen.getByRole('checkbox', { name: 'Seleccionar todas las filas de esta página' }),
		).toBeInTheDocument()
	})

	it('announces the load and its result in the language of the locale', async () => {
		const { container, rerender } = renderUI(
			inSpanish(<Grid columns={columns} rows={[]} getKey={getKey} loading />),
		)

		const status = present(bySlot(container, 'grid-busy-status'), 'the busy status')

		expect(status).toHaveTextContent('Cargando')

		rerender(inSpanish(<Grid columns={columns} rows={rows} getKey={getKey} />))

		await waitFor(() => expect(status).toHaveTextContent('10 filas'))
	})

	it('names a load failure in the language of the locale', () => {
		renderUI(inSpanish(<Grid columns={columns} rows={[]} getKey={getKey} error />))

		expect(screen.getByText('No se pudieron cargar los datos')).toBeInTheDocument()
	})

	it('names the editor and its settle controls in the language of the locale', () => {
		const { container } = renderUI(
			inSpanish(
				<Grid
					columns={editColumns}
					rows={rows}
					getKey={getKey}
					editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
				/>,
			),
		)

		expect(screen.getByRole('grid', { name: 'Cuadrícula de datos' })).toBeInTheDocument()

		fireEvent.doubleClick(firstCell(container, 'name'))

		expect(screen.getByRole('textbox', { name: 'Editar Name, fila 1' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Guardar Name, fila 1' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Descartar Name, fila 1' })).toBeInTheDocument()
	})

	it('shows the refusal of the grid in the language of the locale', async () => {
		const { container } = renderUI(
			inSpanish(
				<Grid
					columns={editColumns}
					rows={rows}
					getKey={getKey}
					editable={{ session: 'managed', onCommit: () => Promise.reject(new Error('')) }}
				/>,
			),
		)

		fireEvent.doubleClick(firstCell(container, 'name'))

		const input = screen.getByRole('textbox', { name: 'Editar Name, fila 1' })

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó el cambio')
	})
})
