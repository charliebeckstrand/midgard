import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * A virtualized fill-height grid whose rows arrive asynchronously (loading
 * skeleton first, data a tick later) — the carriers-list shape. Regression: the
 * default context menu used to unmount with no data and mount when rows
 * arrived, remounting the whole table region; the virtualizer's layout effect
 * then ran before the new scroll container's ref attached (React commits
 * bottom-up), captured `null`, and rendered an empty window forever. Guarded
 * now on both sides: the menu stands down behaviorally (never structurally),
 * and `useVirtualWindow` re-syncs a diverged scroll element after commit.
 */
describe('grid virtualized fill with async rows', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	function AsyncGrid({
		useLoading = true,
		useInfinite = true,
		useVirtualize = true,
	}: {
		useLoading?: boolean
		useInfinite?: boolean
		useVirtualize?: boolean
	} = {}) {
		const [rows, setRows] = useState<Row[]>([])
		const [loading, setLoading] = useState(true)

		useEffect(() => {
			const t = setTimeout(() => {
				setRows(Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` })))
				setLoading(false)
			}, 50)

			return () => clearTimeout(t)
		}, [])

		return (
			<div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
				<Grid<Row>
					maxHeight="fill"
					header={{ position: 'sticky' }}
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					loading={useLoading ? loading : false}
					virtualize={useVirtualize}
					infiniteScroll={
						useInfinite
							? {
									onLoadMore: () => {},
									hasMore: false,
									stableColumnWidths: true,
									loadingIndicator: true,
								}
							: undefined
					}
					footer={{ rowTotal: true }}
				/>
			</div>
		)
	}

	it('renders the rows once they load', async () => {
		renderUI(<AsyncGrid />)

		await waitFor(() => expect(screen.getByText('Row 1')).toBeInTheDocument(), { timeout: 3000 })

		expect(screen.getByText('Row 2')).toBeInTheDocument()
	})

	it('variant: without the loading skeleton', async () => {
		renderUI(<AsyncGrid useLoading={false} />)

		await waitFor(() => expect(screen.getByText('Row 1')).toBeInTheDocument(), { timeout: 3000 })
	})

	it('variant: without infiniteScroll', async () => {
		renderUI(<AsyncGrid useInfinite={false} />)

		await waitFor(() => expect(screen.getByText('Row 1')).toBeInTheDocument(), { timeout: 3000 })
	})

	it('variant: without virtualize (or infinite)', async () => {
		renderUI(<AsyncGrid useVirtualize={false} useInfinite={false} />)

		await waitFor(() => expect(screen.getByText('Row 1')).toBeInTheDocument(), { timeout: 3000 })
	})

	/** Rows (data or skeleton) in the grid's data `<tbody>`, excluding the window's spacers. */
	const bodyRows = (container: HTMLElement) =>
		container.querySelectorAll('tbody[data-slot="table-body"] tr:not([data-slot="grid-spacer"])')
			.length

	const dataCells = (container: HTMLElement) =>
		container.querySelectorAll('tbody[data-slot="table-body"] td[data-grid-col]').length

	/**
	 * The window is empty for the commit (or commits) before the virtualizer
	 * resolves and measures its scroll element, and for as long as that element
	 * measures zero. The body holds the loading skeleton across those frames rather
	 * than rendering an empty `<tbody>`, which used to leave a headers-only, rowless
	 * table on screen between the skeleton being dropped and the first rows landing.
	 */
	it('holds the loading skeleton until the window has rows', async () => {
		const { container } = renderUI(
			<div style={{ height: '400px', display: 'none' }}>
				<Grid<Row>
					maxHeight="fill"
					columns={columns}
					rows={Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }))}
					getKey={(row) => row.id}
					virtualize
				/>
			</div>,
		)

		// A hidden grid measures zero, so the window stays empty: the skeleton stands
		// in, and no data row is rendered to size or read.
		expect(bodyRows(container)).toBe(1)

		expect(dataCells(container)).toBe(0)

		expect(container.querySelectorAll('[data-slot="placeholder"]').length).toBeGreaterThan(0)

		const wrapper = container.firstElementChild as HTMLElement

		wrapper.style.display = 'block'

		// Revealed, the container measures and the window fills with real rows.
		await waitFor(() => expect(screen.getByText('Row 1')).toBeInTheDocument(), { timeout: 3000 })
	})
})
