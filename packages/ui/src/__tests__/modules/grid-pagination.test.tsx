import { startTransition, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { act, renderUI, screen, userEvent } from '../helpers'

describe('Grid pagination', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const many: Row[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }))

	const getKey = (row: Row) => row.id

	it('renders no pagination footer when pagination is omitted', () => {
		renderUI(<Grid columns={columns} rows={many} getKey={getKey} />)

		expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()

		// Every row renders — the grid did not slice.
		expect(screen.getByText('Row 25')).toBeInTheDocument()
	})

	it('hides the navigation when there is only one page', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={many.slice(0, 3)}
				getKey={getKey}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 10 } }}
			/>,
		)

		expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
	})

	describe('client mode', () => {
		it('renders only the first page of rows', () => {
			renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
				/>,
			)

			expect(screen.getByText('Row 1')).toBeInTheDocument()

			expect(screen.getByText('Row 5')).toBeInTheDocument()

			expect(screen.queryByText('Row 6')).not.toBeInTheDocument()
		})

		it('advances to the next page (uncontrolled)', async () => {
			const user = userEvent.setup()

			renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
				/>,
			)

			await user.click(screen.getByRole('button', { name: 'Next page' }))

			expect(screen.getByText('Row 6')).toBeInTheDocument()

			expect(screen.queryByText('Row 1')).not.toBeInTheDocument()
		})

		it('advances two pages when two clicks land on one render', async () => {
			renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 10 } }}
				/>,
			)

			// Both clicks dispatch before React commits either, which is what a
			// double-click on the control does. A control that reads its target from
			// the rendered page index computes the same page twice and advances one.
			await act(async () => {
				screen.getByRole('button', { name: 'Next page' }).click()

				screen.getByRole('button', { name: 'Next page' }).click()
			})

			expect(screen.getByRole('button', { current: 'page' })).toHaveTextContent('3')
		})

		it('stops at the last page when two clicks land on one render', async () => {
			renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ defaultValue: { pageIndex: 1, pageSize: 10 } }}
				/>,
			)

			// The second updater applies to the index the first one left, one past
			// the last page. The engine sets no page count in client mode, so it
			// clamps only the lower bound.
			await act(async () => {
				screen.getByRole('button', { name: 'Next page' }).click()

				screen.getByRole('button', { name: 'Next page' }).click()
			})

			expect(screen.getByRole('button', { current: 'page' })).toHaveTextContent('3')

			expect(screen.getByText('21–25 of 25')).toBeInTheDocument()
		})
	})

	describe('server (manual) mode', () => {
		it('shows the supplied page verbatim without slicing', () => {
			// Page 3 (rows 11–15) handed in directly, as a server would return it.
			renderUI(
				<Grid
					columns={columns}
					rows={many.slice(10, 15)}
					getKey={getKey}
					pagination={{ value: { pageIndex: 2, pageSize: 5 }, rowCount: 25 }}
				/>,
			)

			expect(screen.getByText('Row 11')).toBeInTheDocument()

			expect(screen.getByText('Row 15')).toBeInTheDocument()
		})
	})

	describe('controlled binding', () => {
		it('fires onValueChange with the next page index on Next', async () => {
			const user = userEvent.setup()

			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ value: { pageIndex: 0, pageSize: 5 }, onValueChange }}
				/>,
			)

			await user.click(screen.getByRole('button', { name: 'Next page' }))

			expect(onValueChange).toHaveBeenLastCalledWith({ pageIndex: 1, pageSize: 5 })
		})

		it('fires onValueChange with the clicked page index', async () => {
			const user = userEvent.setup()

			const onValueChange = vi.fn()

			renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ value: { pageIndex: 0, pageSize: 5 }, onValueChange }}
				/>,
			)

			await user.click(screen.getByRole('button', { name: '3' }))

			expect(onValueChange).toHaveBeenLastCalledWith({ pageIndex: 2, pageSize: 5 })
		})

		it('restores focus when the consumer commits the page in a transition', async () => {
			const user = userEvent.setup()

			function Deferred() {
				const [pageIndex, setPageIndex] = useState(1)

				return (
					<Grid
						columns={columns}
						rows={many}
						getKey={getKey}
						pagination={{
							value: { pageIndex, pageSize: 10 },
							onValueChange: (next) => startTransition(() => setPageIndex(next.pageIndex)),
						}}
					/>
				)
			}

			renderUI(<Deferred />)

			// Page 2 of 3. The click commits once before the transition does, while
			// Next is still enabled; the transition's commit then disables it.
			await user.click(screen.getByRole('button', { name: 'Next page' }))

			expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()

			expect(document.activeElement).toBe(screen.getByRole('button', { current: 'page' }))
		})

		it('leaves focus outside the nav when a rejected navigation precedes a page change', async () => {
			const user = userEvent.setup()

			function Rejecting() {
				const [pageIndex, setPageIndex] = useState(0)

				return (
					<>
						<button type="button" onClick={() => setPageIndex(2)}>
							Jump
						</button>

						<Grid
							columns={columns}
							rows={many}
							getKey={getKey}
							pagination={{ value: { pageIndex, pageSize: 10 }, onValueChange: () => {} }}
						/>
					</>
				)
			}

			renderUI(<Rejecting />)

			// The consumer drops the reader's Next, then drives a page change of its
			// own from a control outside the nav.
			await user.click(screen.getByRole('button', { name: 'Next page' }))

			await user.click(screen.getByRole('button', { name: 'Jump' }))

			expect(screen.getByRole('button', { current: 'page' })).toHaveTextContent('3')

			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Jump' }))
		})
	})

	describe('bounds', () => {
		it('disables Previous on the first page and Next on the last', () => {
			const { rerender } = renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ value: { pageIndex: 0, pageSize: 5 } }}
				/>,
			)

			expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

			expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled()

			rerender(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ value: { pageIndex: 4, pageSize: 5 } }}
				/>,
			)

			expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()

			expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled()
		})
	})

	describe('status', () => {
		it('shows the row range for the current page and tracks navigation (client mode)', async () => {
			const user = userEvent.setup()

			renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
				/>,
			)

			// 25 rows at size 5 → "1–5 of 25" on the first page.
			expect(screen.getByText('1–5 of 25')).toBeInTheDocument()

			await user.click(screen.getByRole('button', { name: 'Next page' }))

			expect(screen.getByText('6–10 of 25')).toBeInTheDocument()
		})

		it('counts from the supplied total in server mode', () => {
			// Page 3 (rows 11–15) handed in directly against a total of 25.
			renderUI(
				<Grid
					columns={columns}
					rows={many.slice(10, 15)}
					getKey={getKey}
					pagination={{ value: { pageIndex: 2, pageSize: 5 }, rowCount: 25 }}
				/>,
			)

			expect(screen.getByText('11–15 of 25')).toBeInTheDocument()
		})
	})

	describe('page-size picker', () => {
		it('renders only when pageSizeOptions is supplied', () => {
			const { rerender } = renderUI(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 }, pageSizeOptions: [5, 10] }}
				/>,
			)

			// The trigger carries the "Rows per page" accessible name and a compact
			// "{n} / page" label.
			expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeInTheDocument()

			expect(screen.getByText('5 / page')).toBeInTheDocument()

			rerender(
				<Grid
					columns={columns}
					rows={many}
					getKey={getKey}
					pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
				/>,
			)

			expect(screen.queryByRole('combobox', { name: 'Rows per page' })).not.toBeInTheDocument()
		})
	})
})
