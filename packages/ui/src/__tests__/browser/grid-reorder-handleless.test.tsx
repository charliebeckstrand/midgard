import { beforeAll, describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { loadGridReorderKit } from '../../modules/grid/grid-region'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

// The grid loads its drag and drop module as it mounts. The load before the
// cases gives each case the state of a page that already loaded the module,
// so a drag right after the render reaches a sortable.
beforeAll(() => loadGridReorderKit())

/**
 * `reorder={{ handle: false }}` drops the grip and makes the whole column header
 * the drag handle: the header cell itself carries the grab cursor and the
 * pointer/keyboard drag activator, while a sortable column's sort control keeps
 * its pointer cursor as a more specific child. That split — grab on the cell,
 * pointer on the nested sort button — is a real computed-cursor and focus
 * question, so this runs in the browser suite.
 */
describe('grid column reorder: whole-header handle (real browser)', () => {
	type Row = { id: number; a: string; b: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', sortable: true, cell: (r) => r.a, width: '120px' },
		{ id: 'b', title: 'B', sortable: true, cell: (r) => r.b, width: '120px' },
	]

	const rows: Row[] = [
		{ id: 1, a: 'a1', b: 'b1' },
		{ id: 2, a: 'a2', b: 'b2' },
	]

	function header(id: string): HTMLElement {
		const cell = document.querySelector(`th[data-grid-col="${id}"]`)

		if (!cell) throw new Error(`no th for column ${id}`)

		return cell as HTMLElement
	}

	it('drops the grip and makes the header the grab handle, sort control aside', async () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder={{ handle: false }} />,
		)

		// No grip button — the header itself is the handle.
		expect(screen.queryByRole('button', { name: 'Reorder A' })).toBeNull()

		const headerA = header('a')

		// The header cell carries the grab cursor...
		expect(getComputedStyle(headerA).cursor).toBe('grab')

		// ...while its sort control keeps the pointer cursor: set on the button
		// itself, it out-resolves the inherited grab cursor on that child.
		const sortButton = screen.getByRole('button', { name: 'Sort by A' })

		expect(getComputedStyle(sortButton).cursor).toBe('pointer')

		// The cell is its own drag activator: focus it and start a keyboard drag.
		headerA.focus()

		expect(document.activeElement).toBe(headerA)

		// dnd-kit's keyboard sensor activates on the activator's `code` (Space starts it).
		fireEvent.keyDown(headerA, { code: 'Space' })

		await waitFor(() => expect(headerA).toHaveAttribute('data-dragging'))

		// The cell stays a columnheader through the drag. dnd-kit's `aria-pressed`
		// is not allowed on it, and its roledescription would hide "column header".
		expect(headerA).not.toHaveAttribute('role')

		expect(headerA).not.toHaveAttribute('aria-pressed')

		expect(headerA).not.toHaveAttribute('aria-roledescription')

		expect(headerA).toHaveAttribute('tabindex', '0')

		// Drop the drag so the held column doesn't outlive the test.
		fireEvent.keyDown(headerA, { code: 'Escape' })
	})

	it('keeps the grip when handle defaults to true', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(r) => r.id} reorder={{}} />)

		// The object form with the default `handle` still renders the grip button.
		const grip = screen.getByRole('button', { name: 'Reorder A' })

		// The grip is a native `<button>`, so it carries no redundant `role="button"`.
		expect(grip).not.toHaveAttribute('role')
	})
})
