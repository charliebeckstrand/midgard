import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid } from '../../../modules/grid'
import { renderUI, screen } from '../../helpers'

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

	it('reveals the header tooltip for a title clipped by a sub-pixel amount', async () => {
		// The header shares the cell's overflow detector, so it shared the dead zone:
		// a title clipped by a fraction of a pixel (the ellipsis painted) read as
		// fitting, withholding the tooltip until the column shrank further. Probe the
		// title width + header chrome, then find a width where the title clips
		// sub-pixel — scroll/client round equal yet a Range measures it wider.
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

		for (let w = boundary + 1; w >= boundary - 2 && deadZone === undefined; w -= 0.1) {
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

				if (overflow > 0.15 && overflow < 0.45) deadZone = w
			}

			unmount()
		}

		if (deadZone === undefined) throw new Error('no sub-pixel clip width found in sweep')

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
