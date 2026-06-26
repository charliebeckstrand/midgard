import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Cell truncation reveal against real layout. The default (`auto`) reveal uses
 * the native `title` attribute — no floating-ui portal per cell — so it is
 * asserted on the attribute; a column's custom `cellTooltip` node keeps the
 * styled floating tooltip (the real engine), surfaced on hover. jsdom can't
 * measure overflow (`scrollWidth`/`clientWidth` are 0), so this only resolves in
 * the browser.
 */
describe('grid cell truncation reveal (real browser)', () => {
	type Row = { id: number; name: string }

	const longName = 'A very long name that overflows its narrow column'

	const rows: Row[] = [{ id: 1, name: longName }]

	const getKey = (row: Row) => row.id

	const nameCol: GridColumn<Row> = { id: 'name', title: 'Name', cell: (row) => row.name }

	const narrow = { value: { name: 80 } }

	it('reveals the full content via the native title when the cell is truncated', async () => {
		renderUI(
			<Grid resizable columns={[nameCol]} columnSizing={narrow} rows={rows} getKey={getKey} />,
		)

		await waitFor(() => expect(screen.getByText(longName)).toHaveAttribute('title', longName))
	})

	it('mounts no floating-ui portal per truncated cell', async () => {
		const many = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `${longName} ${i}` }))

		// Context menu off so its single portal can't mask the per-cell count.
		renderUI(
			<Grid
				resizable
				contextMenu={false}
				columns={[nameCol]}
				columnSizing={narrow}
				rows={many}
				getKey={getKey}
			/>,
		)

		// Let layout settle and truncation measure across the rows.
		await screen.findByText(`${longName} 0`)

		await new Promise((resolve) => setTimeout(resolve, 100))

		// The auto reveal is a native title; 30 truncated cells add zero portals.
		expect(document.querySelectorAll('[data-floating-ui-portal]')).toHaveLength(0)
	})

	it('shows a styled tooltip from a custom cellTooltip node', async () => {
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

	it('reveals nothing when cellTooltip returns null', async () => {
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

		// Past the would-be hover delay: neither a native title nor a floating tooltip.
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.getByText(longName)).not.toHaveAttribute('title')

		expect(screen.queryByRole('tooltip')).toBeNull()
	})

	it('reveals nothing when the content fits the column (precise detection)', async () => {
		renderUI(
			<Grid
				resizable
				columns={[nameCol]}
				columnSizing={{ value: { name: 360 } }}
				rows={[{ id: 1, name: 'Ada' }]}
				getKey={getKey}
			/>,
		)

		await screen.findByText('Ada')

		// A short value in a wide column does not overflow (guards a sub-pixel false positive).
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.getByText('Ada')).not.toHaveAttribute('title')
	})

	it('clears the title after the column widens past its content', async () => {
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

		await waitFor(() => expect(screen.getByText(longName)).toHaveAttribute('title', longName))

		await userEvent.click(screen.getByRole('button', { name: 'Widen' }))

		// The observer (still attached to the unremounted span) clears truncation.
		await waitFor(() => expect(screen.getByText(longName)).not.toHaveAttribute('title'))
	})

	it('does not truncate or reveal when truncate is false', async () => {
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

		await screen.findByText(longName)

		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.getByText(longName)).not.toHaveAttribute('title')

		expect(screen.queryByRole('tooltip')).toBeNull()
	})
})
