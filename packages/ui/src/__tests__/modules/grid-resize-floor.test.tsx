import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, present, renderUI, screen } from '../helpers'

type Row = { id: number; name: string; note: string }

const rows: Row[] = [{ id: 1, name: 'Alice', note: 'x' }]

const getKey = (row: Row) => row.id

/** Drags the resize handle of `label` from x 500 to x 0, then returns the width of its `<col>`. */
function dragToZero(container: HTMLElement, label: string, index: number): string {
	fireEvent.mouseDown(screen.getByRole('separator', { name: label }), { button: 0, clientX: 500 })

	fireEvent.mouseMove(document, { clientX: 0 })

	fireEvent.mouseUp(document, { clientX: 0 })

	return present(container.querySelectorAll<HTMLElement>('colgroup col')[index], 'col').style.width
}

/**
 * A pointer drag stops at the same floor as the keyboard and the separator's
 * `aria-valuemin`: the column's `minWidth`, else 40px, or a declared width
 * below 40px.
 */
describe('Grid resize floor', () => {
	it('stops a drag at 40px for a column with no minWidth', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', field: 'name', width: 200 },
			{ id: 'note', title: 'Note', field: 'note', width: 200 },
		]

		const { container } = renderUI(
			<Grid resizable columns={columns} rows={rows} getKey={getKey} columnSizing={{}} />,
		)

		expect(screen.getByRole('separator', { name: 'Resize Name' })).toHaveAttribute(
			'aria-valuemin',
			'40',
		)

		expect(dragToZero(container, 'Resize Name', 0)).toBe('40px')
	})

	it('keeps a declared width below 40px as the floor of that column', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', field: 'name', width: 200 },
			{ id: 'note', title: 'N', field: 'note', width: 30 },
		]

		const { container } = renderUI(
			<Grid resizable columns={columns} rows={rows} getKey={getKey} columnSizing={{}} />,
		)

		expect(
			present(container.querySelectorAll<HTMLElement>('colgroup col')[1], 'col').style.width,
		).toBe('30px')

		expect(dragToZero(container, 'Resize N', 1)).toBe('30px')
	})
})
