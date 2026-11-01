import { beforeAll, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Grid, type GridCellRefusal, type GridColumn } from '../../../modules/grid'
import { deferred, frames, renderUI, screen, waitFor } from '../../helpers'

/**
 * A refusal in the new-row slot keeps the page where it is, on the real
 * floating engine. The error message floats below the cell. Floating UI places
 * the message after it mounts, and until then the message is at the origin of
 * the page. A scroll of the message into view at that point moved the page to
 * the top. Focus goes to the first refused cell, also with no scroll.
 */
beforeAll(() => page.viewport(1280, 800))

describe('grid new row refusal scroll (real browser)', () => {
	type Row = { id: number; name: string; email: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			field: 'name',
			cell: (row) => row.name,
			required: true,
			validate: (value) => (String(value ?? '').trim() === '' ? 'Enter a name' : null),
		},
		{
			id: 'email',
			title: 'Email',
			field: 'email',
			cell: (row) => row.email,
			validate: (value) => (String(value).includes('@') ? null : 'Enter an email'),
		},
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', email: 'alice@example.com' },
		{ id: 2, name: 'Bruno', email: 'bruno@example.com' },
	]

	/** The space above the grid, so the page scrolls to show it. */
	const SPACE = 2000

	/**
	 * Renders the grid below a tall space, and scrolls the page to the grid.
	 *
	 * @returns The page scroll after the scroll to the grid.
	 */
	async function renderGrid(onRowAdd: (values: Record<string, unknown>) => unknown) {
		renderUI(
			<div style={{ width: 600, marginInline: 'auto' }}>
				<div style={{ height: SPACE }} />
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{
						session: 'managed',
						scope: 'cell',
						newRow: 'bottom',
						onRowAdd: onRowAdd as never,
						onCommit: () => {},
					}}
				/>
				<div style={{ height: SPACE }} />
			</div>,
		)

		screen.getByRole('textbox', { name: 'Edit Name, new row' }).scrollIntoView({ block: 'center' })

		await waitFor(() => expect(window.scrollY).toBeGreaterThan(SPACE / 2))

		return window.scrollY
	}

	it('blocks an add with an empty required cell, focuses it, and keeps the page scroll', async () => {
		const onRowAdd = vi.fn()

		const top = await renderGrid(onRowAdd)

		await userEvent.click(screen.getByRole('textbox', { name: 'Edit Email, new row' }))

		await userEvent.keyboard('carol@example.com')

		await userEvent.click(screen.getByRole('button', { name: 'Add row' }))

		await frames()

		expect(onRowAdd).not.toHaveBeenCalled()

		const name = screen.getByRole('textbox', { name: 'Edit Name, new row' })

		expect(name).toHaveFocus()

		expect(screen.getByRole('alert')).toHaveTextContent('Enter a name')

		expect(window.scrollY).toBe(top)
	})

	it('keeps the page scroll as the error of a typed value shows', async () => {
		const top = await renderGrid(vi.fn())

		await userEvent.click(screen.getByRole('textbox', { name: 'Edit Email, new row' }))

		await userEvent.keyboard('carol')

		await frames()

		expect(screen.getByRole('alert')).toHaveTextContent('Enter an email')

		expect(window.scrollY).toBe(top)
	})

	it('focuses the refused cell of an async add, and keeps the page scroll', async () => {
		const flight = deferred<GridCellRefusal[]>()

		const top = await renderGrid(() => flight.promise)

		await userEvent.click(screen.getByRole('textbox', { name: 'Edit Name, new row' }))

		await userEvent.keyboard('Carol')

		await userEvent.click(screen.getByRole('textbox', { name: 'Edit Email, new row' }))

		await userEvent.keyboard('alice@example.com{Enter}')

		flight.resolve([{ rowKey: 'new', columnId: 'email', error: 'Email taken' }])

		// The editors mount again with the refusal, so each query reads the new editor.
		await waitFor(() =>
			expect(screen.getByRole('textbox', { name: 'Edit Email, new row' })).toHaveFocus(),
		)

		await frames()

		expect(screen.getByRole('alert')).toHaveTextContent('Email taken')

		expect(window.scrollY).toBe(top)
	})
})
