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
									showLoadingIndicator: true,
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
})
