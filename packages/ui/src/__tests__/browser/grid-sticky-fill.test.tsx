import type { CSSProperties } from 'react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { Card } from '../../components/card'
import { Drawer, DrawerPanel } from '../../components/drawer'
import { Grid, type GridColumn } from '../../modules/grid'
import { frames, renderUI } from '../helpers'

/**
 * The fill of the sticky grid cells (real paint). The sticky header and the
 * frozen columns must paint the fill of the surface under the grid. A fixed
 * color matched only one surface. A grid in a dashboard tile below `lg` showed
 * a header one shade darker than the tile. jsdom compiles no Tailwind and
 * resolves no custom property, so only a real browser reads the fill back.
 *
 * The suite runs at 414px, below `lg`, which is the width that showed the
 * defect. The suite has no dark mode, so a marker color on an outer element
 * shows which declaration the cells read.
 */
describe('grid sticky fill (real browser)', () => {
	type Row = { id: number; name: string; email: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'email', title: 'Email', cell: (row) => row.email },
	]

	const rows: Row[] = Array.from({ length: 20 }, (_, index) => ({
		id: index + 1,
		name: `Person ${index + 1}`,
		email: `person${index + 1}@example.com`,
	}))

	/** A color that no recipe paints, set as the fill of an outer element. */
	const MARKER = 'rgb(1, 2, 3)'

	const marked = { '--surface-fill': MARKER } as CSSProperties

	function grid() {
		return (
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				header={{ position: 'sticky' }}
				maxHeight="200px"
			/>
		)
	}

	/** The painted fill of the sticky header bar and of a frozen body cell. */
	function fills(container: HTMLElement) {
		const header = container.querySelector<HTMLElement>('thead th:not([style*="inset-inline"])')

		const pinned = container.querySelector<HTMLElement>('tbody td[style*="inset-inline"]')

		if (!header || !pinned) throw new Error('no sticky header cell or frozen body cell')

		return {
			header: getComputedStyle(header).backgroundColor,
			pinned: getComputedStyle(pinned).backgroundColor,
		}
	}

	it('paints the fill of the surface card that holds the grid', () => {
		const { container } = renderUI(
			<div style={marked}>
				<Card bg="surface">{grid()}</Card>
			</div>,
		)

		const card = container.querySelector<HTMLElement>('[data-slot=card]')

		if (!card) throw new Error('no card')

		const surface = getComputedStyle(card).backgroundColor

		// The nearest surface wins over the outer declaration.
		expect(surface).not.toBe(MARKER)

		expect(fills(container)).toEqual({ header: surface, pinned: surface })
	})

	it('paints an inherited surface fill', () => {
		const { container } = renderUI(<div style={marked}>{grid()}</div>)

		expect(fills(container)).toEqual({ header: MARKER, pinned: MARKER })
	})

	it('paints no fill on a glass panel over a page with a fill', async () => {
		// The panel renders in a portal under `<body>`, so the page fill is on `<body>`.
		document.body.style.setProperty('--surface-fill', MARKER)

		onTestFinished(() => {
			document.body.style.removeProperty('--surface-fill')
		})

		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel glass aria-label="Panel">
					{grid()}
				</DrawerPanel>
			</Drawer>,
		)

		await frames()

		const panel = document.querySelector<HTMLElement>('[role=dialog]')

		if (!panel) throw new Error('no panel')

		// The glass shows what is behind it, so a sticky cell with a fill shows as a box.
		expect(fills(panel)).toEqual({ header: 'rgba(0, 0, 0, 0)', pinned: 'rgba(0, 0, 0, 0)' })
	})

	it('falls back to the content host with no surface around the grid', () => {
		const { container } = renderUI(grid())

		// The light content host is white at every width.
		expect(fills(container)).toEqual({ header: 'rgb(255, 255, 255)', pinned: 'rgb(255, 255, 255)' })
	})
})
