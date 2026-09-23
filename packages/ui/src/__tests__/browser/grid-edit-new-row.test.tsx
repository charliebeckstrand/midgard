import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../helpers'

/**
 * The new-row slot of an editable grid in a real browser. Sticky positioning
 * and the tab order are layout and focus facts that jsdom does not compute: it
 * has no scroll geometry, and its Tab moves no focus.
 */
describe('grid new row (real browser)', () => {
	type Row = { id: number; name: string; count: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		count: i,
	}))

	function renderGrid(
		editable: Partial<GridEditableConfig>,
		{ sticky = false, virtualize = true }: { sticky?: boolean; virtualize?: boolean } = {},
	) {
		const onRowAdd = vi.fn()

		const view = renderUI(
			<div style={{ width: '360px' }}>
				<Grid
					virtualize={virtualize ? { estimateSize: 36 } : undefined}
					maxHeight="220px"
					header={sticky ? { position: 'sticky' } : undefined}
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ session: 'managed', onRowAdd, onCommit: vi.fn(), ...editable }}
				/>
				<button type="button">after</button>
			</div>,
		)

		const scroll = present(
			view.container.querySelector<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		const slot = () =>
			present(
				view.container.querySelector<HTMLElement>('[data-slot="grid-new-row"] td'),
				'new-row cell',
			)

		const scrollTo = (top: number) => {
			scroll.scrollTop = top

			fireEvent.scroll(scroll)
		}

		return { ...view, onRowAdd, scroll, slot, scrollTo }
	}

	/** The visible box of the scroll container, less its horizontal scrollbar. */
	const viewport = (scroll: HTMLElement) => {
		const box = scroll.getBoundingClientRect()

		return { top: box.top, bottom: box.top + scroll.clientHeight }
	}

	it('pins the bottom row to the bottom edge while a virtualized body scrolls', async () => {
		const { scroll, slot, scrollTo } = renderGrid({ newRow: 'bottom' })

		await waitFor(() => expect(scroll.querySelector('tr[data-row-index="0"]')).not.toBeNull())

		for (const top of [0, 1_500, scroll.scrollHeight / 2]) {
			scrollTo(top)

			await waitFor(() =>
				expect(slot().getBoundingClientRect().bottom).toBeCloseTo(viewport(scroll).bottom, 0),
			)
		}

		// The row is outside the virtual window: the data rows scrolled away, and
		// the slot is still in the DOM, in view.
		expect(scroll.querySelector('tr[data-row-index="0"]')).toBeNull()
	})

	it('pins the top row under a sticky header while a virtualized body scrolls', async () => {
		const { scroll, slot, scrollTo, container } = renderGrid({ newRow: 'top' }, { sticky: true })

		await waitFor(() => expect(scroll.querySelector('tr[data-row-index="0"]')).not.toBeNull())

		// The header cells stick, not the `<thead>` around them.
		const head = present(container.querySelector('thead th'), 'thead th')

		for (const top of [0, 1_500, scroll.scrollHeight / 2]) {
			scrollTo(top)

			await waitFor(() =>
				expect(slot().getBoundingClientRect().top).toBeCloseTo(
					head.getBoundingClientRect().bottom,
					0,
				),
			)
		}

		expect(head.getBoundingClientRect().top).toBeCloseTo(viewport(scroll).top, 0)
	})

	/** The cell that the cursor names through `aria-activedescendant`. */
	const activeCell = () => {
		const id = screen.getByRole('grid').getAttribute('aria-activedescendant')

		return present(id ? document.getElementById(id) : null, 'the active cell')
	}

	// A virtualized body scrolls a row into its window by the virtualizer's own
	// offsets. The cursor's scroll margin is what keeps a cell in view in a body
	// that is not virtualized, so these cases take one.
	it('adds the top row to the scroll margin that clears the sticky header', async () => {
		const { slot, container } = renderGrid({ newRow: 'top' }, { sticky: true, virtualize: false })

		const header = present(container.querySelector<HTMLElement>('thead th'), 'thead th')

		screen.getByRole('grid').focus()

		await userEvent.keyboard('{ArrowDown}')

		expect(Number.parseFloat(activeCell().style.scrollMarginTop)).toBeCloseTo(
			header.getBoundingClientRect().height + slot().getBoundingClientRect().height,
			0,
		)
	})

	it('keeps the cursor cell clear of a bottom row as a page move scrolls down', async () => {
		const { slot } = renderGrid({ newRow: 'bottom' }, { sticky: true, virtualize: false })

		screen.getByRole('grid').focus()

		await userEvent.keyboard('{PageDown}')

		expect(Number.parseFloat(activeCell().style.scrollMarginBottom)).toBeCloseTo(
			slot().getBoundingClientRect().height,
			0,
		)

		await waitFor(() =>
			expect(activeCell().getBoundingClientRect().bottom).toBeLessThanOrEqual(
				slot().getBoundingClientRect().top + 1,
			),
		)
	})

	it('moves real Tab focus across the row, to the Add control, and out', async () => {
		const { onRowAdd } = renderGrid({ newRow: 'bottom' })

		const name = screen.getByRole('textbox', { name: 'Edit Name, new row' })

		await userEvent.click(name)

		await userEvent.keyboard('Carol')

		await userEvent.keyboard('{Tab}')

		const count = screen.getByRole('spinbutton', { name: 'Edit Count, new row' })

		expect(count).toHaveFocus()

		await userEvent.keyboard('{Tab}')

		const add = screen.getByRole('button', { name: 'Add row' })

		expect(add).toHaveFocus()

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		expect(count).toHaveFocus()

		// Nothing added on the way: Tab moves, and an add is explicit.
		expect(onRowAdd).not.toHaveBeenCalled()

		await userEvent.keyboard('{Tab}{Enter}')

		expect(onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol' })

		// The accepted add puts focus on the first editable cell for the next entry.
		await waitFor(() =>
			expect(screen.getByRole('textbox', { name: 'Edit Name, new row' })).toHaveFocus(),
		)

		await userEvent.keyboard('{Tab}{Tab}{Tab}')

		expect(screen.getByRole('button', { name: 'after' })).toHaveFocus()
	})
})
