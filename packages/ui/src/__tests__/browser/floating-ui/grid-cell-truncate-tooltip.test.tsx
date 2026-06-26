import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI, screen } from '../../helpers'

/**
 * Cell truncation tooltip against the real floating engine and real layout. The
 * jsdom suite can't see overflow (`scrollWidth`/`clientWidth` are 0) and mocks
 * `@floating-ui/react`, so the hover tooltip only surfaces here. A narrow
 * controlled column width forces the cell to truncate (auto-fit stands down
 * while `columnSizing` is controlled).
 */
describe('grid cell truncation tooltip (real browser)', () => {
	type Row = { id: number; name: string }

	const longName = 'A very long name that overflows its narrow column'

	const rows: Row[] = [{ id: 1, name: longName }]

	const getKey = (row: Row) => row.id

	const nameCol: GridColumn<Row> = { id: 'name', title: 'Name', cell: (row) => row.name }

	const narrow = { value: { name: 80 } }

	it('shows a tooltip with the full content when the cell is truncated', async () => {
		renderUI(
			<Grid resizable columns={[nameCol]} columnSizing={narrow} rows={rows} getKey={getKey} />,
		)

		await userEvent.hover(screen.getByText(longName))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(longName)
	})

	it('supersedes the tooltip content with a cellTooltip node', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ ...nameCol, cellTooltip: () => 'Full name on file' }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText(longName))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent('Full name on file')
	})

	it('disables the tooltip when cellTooltip returns null', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ ...nameCol, cellTooltip: () => null }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText(longName))

		// The tooltip would open at the 250ms hover delay if enabled; wait past it
		// (no pointer-leave to cancel) and assert none surfaced.
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.queryByRole('tooltip')).toBeNull()
	})

	it('shows no tooltip when the content fits the column (precise detection)', async () => {
		renderUI(
			<Grid
				resizable
				columns={[nameCol]}
				columnSizing={{ value: { name: 360 } }}
				rows={[{ id: 1, name: 'Ada' }]}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText('Ada'))

		// A short value in a wide column does not overflow; no tooltip should open
		// even after the hover delay (guards against a sub-pixel false positive).
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.queryByRole('tooltip')).toBeNull()
	})

	it('stops showing the tooltip after the column widens past its content', async () => {
		function Harness() {
			const [name, setName] = useState(80)

			return (
				<>
					<button type="button" onClick={() => setName(800)}>
						Widen
					</button>

					<Grid
						resizable
						columns={[nameCol]}
						columnSizing={{ value: { name } }}
						rows={rows}
						getKey={getKey}
					/>
				</>
			)
		}

		renderUI(<Harness />)

		// Narrow column: the cell truncates and tooltips on hover.
		await userEvent.hover(screen.getByText(longName))

		await screen.findByRole('tooltip')

		// Widen past the content (the click also moves the pointer off the cell).
		await userEvent.click(screen.getByRole('button', { name: 'Widen' }))

		// Re-hover: the cell now fits, so the overflow observer (still attached to
		// the unremounted span) has cleared truncation and no tooltip surfaces.
		await userEvent.hover(screen.getByText(longName))

		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.queryByRole('tooltip')).toBeNull()
	})

	it('does not truncate or tooltip when truncate is false', async () => {
		renderUI(
			<Grid
				resizable
				truncate={false}
				columns={[nameCol]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText(longName))

		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.queryByRole('tooltip')).toBeNull()
	})
})
