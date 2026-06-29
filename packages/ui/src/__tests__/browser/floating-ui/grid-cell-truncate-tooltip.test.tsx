import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

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

	it('mounts no floating-ui portal while every cell tooltip is closed', async () => {
		const many = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `${longName} ${i}` }))

		// Context menu off so its portal can't mask the per-cell count.
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

		await screen.findByText(`${longName} 0`)

		await new Promise((resolve) => setTimeout(resolve, 100))

		// Twenty truncated cells, all closed — no portal nodes left in the DOM.
		expect(document.querySelectorAll('[data-floating-ui-portal]')).toHaveLength(0)
	})

	it('clips every row consistently under auto-fit past the content cap', async () => {
		// Content this wide exceeds the autosizer's per-column content cap, so the
		// column settles at the cap rather than growing to fit — and every row clips.
		const huge = `${longName} ${longName} ${longName}`

		const many = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `${huge} ${i}` }))

		// Resizable + uncontrolled sizing exercises auto-fit (as the demo does).
		const { container } = renderUI(
			<div style={{ maxWidth: '240px' }}>
				<Grid resizable columns={[nameCol]} rows={many} getKey={getKey} />
			</div>,
		)

		await screen.findByText(`${huge} 0`)

		await new Promise((resolve) => setTimeout(resolve, 200))

		const spans = container.querySelectorAll<HTMLElement>('td[data-grid-col="name"] span.truncate')

		expect(spans).toHaveLength(5)

		// Every cell overflows its box (clipped), not just some rows.
		for (const span of spans) {
			expect(span.scrollWidth).toBeGreaterThan(span.clientWidth)
		}
	})

	it('reveals the tooltip for a cell clipped by a sub-pixel amount', async () => {
		// A pointer drag lands on fractional widths. Find one where the cell clips by
		// a fraction of a pixel: scroll/client round equal (the integer test reads
		// "fits") yet a Range measures the content wider than its box — the ellipsis
		// is painted. The prior half-pixel slack left exactly this cell without a
		// tooltip until the column shrank further; the tooltip must now arm here.
		const measureOverflow = (span: HTMLElement) => {
			const range = document.createRange()

			range.selectNodeContents(span)

			return range.getBoundingClientRect().width - span.getBoundingClientRect().width
		}

		let deadZone: number | undefined

		for (let w = 124; w >= 118 && deadZone === undefined; w -= 0.1) {
			const { container, unmount } = renderUI(
				<Grid
					resizable
					columns={[nameCol]}
					columnSizing={{ value: { name: w } }}
					rows={[{ id: 1, name: 'Wade Cooper' }]}
					getKey={getKey}
				/>,
			)

			await screen.findByText('Wade Cooper')

			await new Promise((resolve) => setTimeout(resolve, 20))

			const span = container.querySelector<HTMLElement>('td[data-grid-col="name"] span.truncate')

			// The former dead zone: integer-equal (scroll backstop misses it) yet the
			// Range shows a clip the old half-pixel slack swallowed.
			if (span && span.scrollWidth === span.clientWidth) {
				const overflow = measureOverflow(span)

				if (overflow > 0.15 && overflow < 0.45) deadZone = w
			}

			unmount()
		}

		// A sub-pixel dead-zone width must exist for the assertion to mean anything.
		if (deadZone === undefined) throw new Error('no sub-pixel clip width found in sweep')

		renderUI(
			<Grid
				resizable
				columns={[nameCol]}
				columnSizing={{ value: { name: deadZone } }}
				rows={[{ id: 1, name: 'Wade Cooper' }]}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText('Wade Cooper'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent('Wade Cooper')
	})

	it('suppresses the tooltip while a column drag-resize is in flight', async () => {
		const { container } = renderUI(
			<Grid resizable columns={[nameCol]} columnSizing={narrow} rows={rows} getKey={getKey} />,
		)

		// Baseline: the clipped cell arms its tooltip on hover.
		await userEvent.hover(screen.getByText(longName))

		await screen.findByRole('tooltip')

		// Press the column's resize handle and drag, without releasing.
		const separator = container.querySelector<HTMLElement>(
			'[role="separator"][aria-label="Resize Name"]',
		)

		if (!separator) throw new Error('resize separator not found')

		const rect = separator.getBoundingClientRect()

		const x = rect.left + rect.width / 2

		const y = rect.top + 4

		fireEvent.mouseDown(separator, { clientX: x, clientY: y })

		fireEvent.mouseMove(document, { clientX: x - 30, clientY: y })

		// The in-flight resize holds the overflow tooltip closed, though the cell is
		// still clipped and still hovered.
		await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())

		fireEvent.mouseUp(document, { clientX: x - 30, clientY: y })
	})

	it('clips rows of differing length uniformly at a narrow width', async () => {
		// The demo names, at a width none of them fits — every row must clip with an
		// ellipsis, not just the longer ones.
		const named = [
			{ id: 1, name: 'Wade Cooper' },
			{ id: 2, name: 'Arlene McCoy' },
			{ id: 3, name: 'Devon Webb' },
		]

		const { container } = renderUI(
			<Grid
				resizable
				columns={[nameCol]}
				columnSizing={{ value: { name: 90 } }}
				rows={named}
				getKey={getKey}
			/>,
		)

		await screen.findByText('Wade Cooper')

		await new Promise((resolve) => setTimeout(resolve, 100))

		const spans = container.querySelectorAll<HTMLElement>('td[data-grid-col="name"] span.truncate')

		expect(spans).toHaveLength(3)

		for (const span of spans) {
			expect(span.scrollWidth).toBeGreaterThan(span.clientWidth)
		}
	})
})
