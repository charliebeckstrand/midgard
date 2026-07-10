/**
 * One mount/update/sort/scroll adapter per library, so every grid bench
 * times the same task through each contender's idiomatic API: the ui module
 * and MUI X render through React (`createRoot` + `flushSync` — the
 * synchronous commit a consumer's handler pays), AG Grid through its vanilla
 * `createGrid` factory. Every grid draws the same shipment rows into the
 * same fixed 960×600 box with animations off and fixed 120px columns, so no
 * contender wins by rendering fewer cells.
 *
 * The settle contract is shared rather than per-library: each operation is
 * timed until {@link painted} sees the expected cell text in the live DOM.
 * The libraries split on when they draw — React commits synchronously under
 * `flushSync`, AG batches row DOM onto animation frames — and a uniform
 * paint probe charges each one for exactly the frames it defers, without
 * trusting any library's own "ready" signal.
 *
 * MUI X ships its MIT tier paginated — `pageSize` is capped at 100 and the
 * unpaginated scroll of the Pro tier is license-gated — so its adapter
 * returns no scroller and the scroll sweep pits the ui module against AG
 * alone. The other scenarios stand: mount, update, and sort all process the
 * full dataset through MUI's client-side model; only the painted window is
 * page-shaped.
 */

import { DataGrid, type GridColDef, type GridSortModel } from '@mui/x-data-grid'
import { AllCommunityModule, createGrid, type GridApi, ModuleRegistry } from 'ag-grid-community'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Grid, type GridColumn, type SortState } from '../../modules/grid'
import type { Shipment } from '../fixtures'

// AG Grid draws nothing until its feature modules register; the community
// bundle is the library's own quick-start baseline.
ModuleRegistry.registerModules([AllCommunityModule])

export const GRID_WIDTH = 960

export const GRID_HEIGHT = 600

/** Sort direction applied through each library's programmatic sort API. */
export type SortDirection = 'asc' | 'desc'

/** A mounted grid under bench control; operations settle via {@link painted}. */
export type MountedGrid = {
	/** Swaps in a replacement dataset of the same shape (same ids, new values). */
	update: (rows: Shipment[]) => void
	/** Applies a whole-column sort on `id` through the library's sort state. */
	sort: (direction: SortDirection) => void
	/** The vertical scroll element, or `null` where the tier cannot scroll the full set (MUI's MIT pagination). */
	scroller: () => HTMLElement | null
	destroy: () => void
}

/** One library's entry in a scenario: a name for the report and a mount. */
export type GridContender = {
	name: string
	mount: (host: HTMLElement, rows: Shipment[]) => MountedGrid
}

/**
 * Settles an operation by paint evidence: resolves once every `marker` string
 * is present in the host's text, waiting one animation frame between looks.
 * All three grids window their rows, so the probe scans a viewport of cells,
 * not the dataset. The first look is synchronous — a contender that commits
 * its DOM before returning settles at zero frames.
 */
export async function painted(host: HTMLElement, markers: string[]): Promise<void> {
	for (let frame = 0; frame < 600; frame++) {
		const text = host.textContent ?? ''

		if (markers.every((marker) => text.includes(marker))) return

		await new Promise(requestAnimationFrame)
	}

	throw new Error(`grid bench never painted: ${markers.join(', ')}`)
}

const COLUMN_FIELDS = [
	['id', 'ID'],
	['reference', 'Reference'],
	['origin', 'Origin'],
	['destination', 'Destination'],
	['status', 'Status'],
	['carrier', 'Carrier'],
	['loads', 'Loads'],
	['weight', 'Weight'],
] as const

const UI_COLUMNS: GridColumn<Shipment>[] = COLUMN_FIELDS.map(([id, title]) => ({
	id,
	title,
	sortable: true,
	width: '120px',
	// A ui column renders nothing without a `cell`; the competitors bind
	// their `field` automatically, so this is the same accessor spelled out.
	cell: (row) => row[id],
}))

const AG_COLUMNS = COLUMN_FIELDS.map(([field, headerName]) => ({ field, headerName, width: 120 }))

const MUI_COLUMNS: GridColDef<Shipment>[] = COLUMN_FIELDS.map(([field, headerName]) => ({
	field,
	headerName,
	width: 120,
}))

const getKey = (row: Shipment) => row.id

/** A scrollable contender's scroll element; throws rather than letting a renamed class silently drop the contender from the sweep. */
function mustFind(box: HTMLElement, selector: string): HTMLElement {
	const found = box.querySelector<HTMLElement>(selector)

	if (!found) throw new Error(`grid bench found no scroller at ${selector}`)

	return found
}

/** Sizes a contender's own box inside the shared fixed-height host. */
function fillBox(host: HTMLElement): HTMLElement {
	const box = document.createElement('div')

	box.style.height = '100%'

	host.append(box)

	return box
}

/** The ui grid: React renders, virtualized rows, controlled sort. */
function uiContender(): GridContender {
	return {
		name: 'ui Grid',
		mount(host, rows) {
			const box = fillBox(host)

			const root = createRoot(box)

			let current = rows

			let sort: SortState[] = []

			const draw = () =>
				flushSync(() =>
					root.render(
						<Grid
							columns={UI_COLUMNS}
							rows={current}
							getKey={getKey}
							virtualize
							maxHeight={`${GRID_HEIGHT}px`}
							sort={{ value: sort }}
						/>,
					),
				)

			draw()

			return {
				update(next) {
					current = next

					draw()
				},
				sort(direction) {
					sort = [{ column: 'id', direction }]

					draw()
				},
				scroller: () => mustFind(box, '[data-slot="grid-scroll"]'),
				destroy: () => {
					root.unmount()

					box.remove()
				},
			}
		},
	}
}

/** AG Grid through the vanilla factory; row data and sort move through the grid API. */
function agContender(): GridContender {
	return {
		name: 'AG Grid',
		mount(host, rows) {
			const box = fillBox(host)

			const api: GridApi<Shipment> = createGrid<Shipment>(box, {
				columnDefs: AG_COLUMNS,
				rowData: rows,
				getRowId: ({ data }) => data.id,
				animateRows: false,
			})

			return {
				update: (next) => api.setGridOption('rowData', next),
				sort(direction) {
					api.applyColumnState({
						state: [{ colId: 'id', sort: direction }],
						defaultState: { sort: null },
					})
				},
				scroller: () => mustFind(box, '.ag-grid-viewport'),
				destroy: () => {
					api.destroy()

					box.remove()
				},
			}
		},
	}
}

/** MUI X DataGrid: React renders, the MIT tier's paginated window, controlled sort. */
function muiContender(): GridContender {
	return {
		name: 'MUI X DataGrid',
		mount(host, rows) {
			const box = fillBox(host)

			const root = createRoot(box)

			let current = rows

			let sortModel: GridSortModel = []

			const draw = () =>
				flushSync(() =>
					root.render(<DataGrid columns={MUI_COLUMNS} rows={current} sortModel={sortModel} />),
				)

			draw()

			return {
				update(next) {
					current = next

					draw()
				},
				sort(direction) {
					sortModel = [{ field: 'id', sort: direction }]

					draw()
				},
				scroller: () => null,
				destroy: () => {
					root.unmount()

					box.remove()
				},
			}
		},
	}
}

/** All three contenders, in the report's fixed order. */
export function gridContenders(): GridContender[] {
	return [uiContender(), agContender(), muiContender()]
}
