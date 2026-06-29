import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Column-header truncation tooltip against the real floating engine and real
 * layout. The jsdom suite can't see overflow (`scrollWidth`/`clientWidth` are 0)
 * and mocks `@floating-ui/react`, so the hover tooltip only surfaces here. A
 * narrow controlled column width forces the header to truncate (auto-fit stands
 * down while `columnSizing` is controlled). Both the sortable path (title inside
 * the sort button) and the plain path are exercised.
 */
describe('grid header truncation tooltip (real browser)', () => {
	type Row = { id: number; name: string }

	const longTitle = 'A very long column title that overflows its narrow header'

	const rows: Row[] = [{ id: 1, name: 'Ada' }]

	const getKey = (row: Row) => row.id

	const narrow = { value: { name: 80 } }

	it('shows a tooltip with the full title when a sortable header is truncated', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: longTitle, cell: (row) => row.name }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText(longTitle))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(longTitle)
	})

	it('shows a tooltip with the full title when a non-sortable header is truncated', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: longTitle, sortable: false, cell: (row) => row.name }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText(longTitle))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(longTitle)
	})

	it('suppresses the tooltip while a column drag-resize is in flight', async () => {
		const { container } = renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: longTitle, cell: (row) => row.name }]}
				columnSizing={narrow}
				rows={rows}
				getKey={getKey}
			/>,
		)

		// Baseline: the clipped title arms its tooltip on hover.
		await userEvent.hover(screen.getByText(longTitle))

		await screen.findByRole('tooltip')

		// Press the column's resize handle and drag, without releasing.
		const separator = container.querySelector<HTMLElement>('[role="separator"]')

		if (!separator) throw new Error('resize separator not found')

		const rect = separator.getBoundingClientRect()

		const x = rect.left + rect.width / 2

		const y = rect.top + 4

		fireEvent.mouseDown(separator, { clientX: x, clientY: y })

		fireEvent.mouseMove(document, { clientX: x - 30, clientY: y })

		// The in-flight resize holds the overflow tooltip closed, though the title is
		// still clipped and still hovered.
		await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())

		fireEvent.mouseUp(document, { clientX: x - 30, clientY: y })
	})

	it('reveals the header tooltip for a title clipped by a sub-tenth-of-a-pixel amount', async () => {
		// The header shares the cell's overflow detector, so it shared the dead zone:
		// a title clipped by a fraction of a pixel (the ellipsis painted) read as
		// fitting, withholding the tooltip until the column shrank further. The
		// detector now arms at the first device sub-pixel of overflow, so target the
		// band the prior tenth-of-a-pixel slack missed: a clip under 0.1px where
		// scroll/client still round equal yet a Range measures the title wider.
		const measureOverflow = (span: HTMLElement) => {
			const range = document.createRange()

			range.selectNodeContents(span)

			return range.getBoundingClientRect().width - span.getBoundingClientRect().width
		}

		const titleSpan = (root: HTMLElement) =>
			root.querySelector<HTMLElement>('th[data-grid-col="name"] span.truncate')

		const column = { id: 'name', title: longTitle, cell: (row: Row) => row.name } as const

		// Probe: title content width and the fixed header chrome (sort/resize/padding).
		const probe = renderUI(
			<Grid
				resizable
				columns={[column]}
				columnSizing={{ value: { name: 300 } }}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await screen.findByText(longTitle)

		await new Promise((resolve) => setTimeout(resolve, 30))

		const probed = titleSpan(probe.container)

		if (!probed) throw new Error('header title span not found')

		const boundary = probed.scrollWidth + (300 - probed.clientWidth)

		probe.unmount()

		let deadZone: number | undefined

		// Step finely (the device sub-pixel is ~1/64px) across the fit boundary — the
		// integer-rounded chrome estimate can sit a fraction off — to land a clip
		// under a tenth of a pixel, what the old slack let slip.
		for (let w = boundary + 0.6; w >= boundary - 1.5 && deadZone === undefined; w -= 0.02) {
			const { container, unmount } = renderUI(
				<Grid
					resizable
					columns={[column]}
					columnSizing={{ value: { name: w } }}
					rows={rows}
					getKey={getKey}
				/>,
			)

			await screen.findByText(longTitle)

			await new Promise((resolve) => setTimeout(resolve, 20))

			const span = titleSpan(container)

			if (span && span.scrollWidth === span.clientWidth) {
				const overflow = measureOverflow(span)

				if (overflow > 0.02 && overflow < 0.1) deadZone = w
			}

			unmount()
		}

		if (deadZone === undefined) throw new Error('no sub-tenth-pixel clip width found in sweep')

		renderUI(
			<Grid
				resizable
				columns={[column]}
				columnSizing={{ value: { name: deadZone } }}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText(longTitle))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(longTitle)
	})

	it('shows no tooltip when the title fits the header (precise detection)', async () => {
		renderUI(
			<Grid
				resizable
				columns={[{ id: 'name', title: 'Name', cell: (row) => row.name }]}
				columnSizing={{ value: { name: 360 } }}
				rows={rows}
				getKey={getKey}
			/>,
		)

		await userEvent.hover(screen.getByText('Name'))

		// A short title in a wide header does not overflow; no tooltip should open
		// even after the hover delay (guards against a sub-pixel false positive).
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(screen.queryByRole('tooltip')).toBeNull()
	})
})
