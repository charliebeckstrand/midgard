import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { act, attach, getSlot } from '../helpers'

// The tiles of the docs playground: three stats on one row, two charts under them.
const layout: DashboardLayoutItem[] = [
	{ id: 'revenue', x: 0, y: 0, w: 8, h: 20 },
	{ id: 'units', x: 8, y: 0, w: 8, h: 20 },
	{ id: 'sold', x: 16, y: 0, w: 8, h: 20 },
	{ id: 'regions', x: 0, y: 20, w: 12 },
	{ id: 'mix', x: 12, y: 20, w: 12 },
]

const board = (
	<Dashboard aria-label="Sales" layout={{ defaultValue: layout }}>
		<DashboardTile id="revenue" title="Revenue" minWidth={200}>
			Revenue
		</DashboardTile>
		<DashboardTile id="units" title="Units" minWidth={200}>
			Units
		</DashboardTile>
		<DashboardTile id="sold" title="Sold" minWidth={160}>
			Sold
		</DashboardTile>
		<DashboardTile id="regions" title="Regions" ratio={16 / 9}>
			Regions
		</DashboardTile>
		<DashboardTile id="mix" title="Mix" ratio={16 / 9}>
			Mix
		</DashboardTile>
	</Dashboard>
)

/** Parses the server markup of the board in a box `width` px wide, with no script run. */
function parseServerMarkup(width: number): HTMLElement {
	const container = attach(document.createElement('div'))

	container.style.width = `${width}px`

	container.innerHTML = renderToString(board)

	return container
}

/** The box of each tile, by its text, relative to the canvas. */
function tileBoxes(container: HTMLElement): Record<string, [number, number, number, number]> {
	const canvas = getSlot(container, 'dashboard-canvas').getBoundingClientRect()

	const boxes: Record<string, [number, number, number, number]> = {}

	for (const tile of container.querySelectorAll<HTMLElement>('[data-slot="dashboard-tile"]')) {
		const box = tile.getBoundingClientRect()

		boxes[tile.textContent ?? ''] = [
			box.left - canvas.left,
			box.top - canvas.top,
			box.width,
			box.height,
		]
	}

	return boxes
}

/**
 * The server knows no width, so the inline grid area of each tile is its saved
 * cell. The style sheet of the board puts each tile at the cell of the re-pack
 * with a container query. The first paint therefore draws the final layout: a
 * stack in a phone-wide box, shared shelves between, and the saved layout when
 * each tile fits. The hydrated board keeps that layout when its measurement lands.
 */
describe('dashboard first paint (real browser)', () => {
	it.each([
		{ width: 340, stack: true },
		{ width: 480, stack: false },
		{ width: 600, stack: false },
		{ width: 960, stack: false },
	])('paints the tiles of a $width px box before and after hydration', async ({ width, stack }) => {
		const container = parseServerMarkup(width)

		const before = tileBoxes(container)

		const canvasWidth = getSlot(container, 'dashboard-canvas').getBoundingClientRect().width

		if (stack) {
			for (const [, , w] of Object.values(before)) expect(w).toBeNear(canvasWidth, 1)
		}

		const error = vi.spyOn(console, 'error')

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, board)
		})

		onTestFinished(() => act(() => root?.unmount()))

		// The measurement lands after hydration. Let the observer report.
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

		expect(error).not.toHaveBeenCalled()

		const after = tileBoxes(container)

		expect(Object.keys(after)).toEqual(Object.keys(before))

		for (const [id, box] of Object.entries(after)) {
			box.forEach((value, index) => {
				expect(value, `${id} [${index}]`).toBeNear(before[id]?.[index] ?? Number.NaN, 1)
			})
		}

		// The rules of the first paint stand down, and the inline cells of the store hold.
		expect(getSlot(container, 'dashboard-canvas').hasAttribute('data-measured')).toBe(true)
	})
})
