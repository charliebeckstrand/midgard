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

import {
	DataGrid,
	type GridColDef,
	type GridFilterModel,
	type GridSortModel,
} from '@mui/x-data-grid'
import { AllCommunityModule, createGrid, type GridApi, ModuleRegistry } from 'ag-grid-community'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
	Grid,
	type GridColumn,
	type GridColumnFilterState,
	type GridSortState,
} from '../../modules/grid'
import type { QueryGroup } from '../../modules/query'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey } from '../fixtures'

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
	/** Applies a quick filter across every column; `''` clears it. */
	search: (query: string) => void
	/** Applies a `contains` filter to the carrier column; `''` clears it. The grid must mount with {@link MountOptions.filterable}. */
	filter: (text: string) => void
	/** Shows the page at `index`. The grid must mount with {@link MountOptions.paginated}. */
	page: (index: number) => void
	/** Opens the filter of the carrier column, which lists its values. Only a grid that mounts with {@link MountOptions.facets} has it. */
	openFacets?: () => void
	/** The vertical scroll element, or `null` where the tier cannot scroll the full set (MUI's MIT pagination). */
	scroller: () => HTMLElement | null
	destroy: () => void
}

/** How a scenario mounts a grid. */
export type MountOptions = {
	/** Makes the carrier column filterable, for the column-filter scenario. The other scenarios leave it off, so no filter affordance adds to their cost. */
	filterable?: boolean
	/** Pages the rows {@link PAGE_SIZE} at a time, for the pagination scenario. */
	paginated?: boolean
	/** Sums the loads and the weight in a grand-total row, for the grand-total scenario. */
	grandTotal?: boolean
	/** Gives the carrier column a filter that lists its values, for the facet scenario. */
	facets?: boolean
	/** Groups the rows by carrier, with every group open, for the grouping scenario. */
	grouped?: boolean
}

/** The rows on each page of a paginated grid: the cap of MUI's MIT tier, which AG's page-size list also offers. */
export const PAGE_SIZE = 100

/** One library's entry in a scenario: a name for the report and a mount. */
export type GridContender = {
	name: string
	mount: (host: HTMLElement, rows: Shipment[], options?: MountOptions) => MountedGrid
	/** The mount options that the free tier of the library cannot run. A scenario that sets one leaves the contender out. */
	unsupported?: (keyof MountOptions)[]
}

/** Whether `contender` can run a scenario that mounts with `options`. */
export function supports(contender: GridContender, options: MountOptions | undefined): boolean {
	return !contender.unsupported?.some((option) => options?.[option])
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

const UI_COLUMNS: GridColumn<Shipment>[] = SHIPMENT_FIELDS.map(([id, title]) => ({
	id,
	title,
	sortable: true,
	width: '120px',
	// A ui column renders nothing without a `cell`; the competitors bind
	// their `field` automatically, so this is the same accessor spelled out.
	cell: (row) => row[id],
	// The quick search scans the columns declaring a `value`; AG's quick filter
	// and MUI's `quickFilterValues` scan every bound field by default, so every
	// column declares one and all three search the same eight.
	value: (row) => row[id],
}))

/** The columns that a grand total sums. */
const TOTALED = new Set(['loads', 'weight'])

/** {@link UI_COLUMNS} with a sum on the loads and the weight. */
const UI_TOTAL_COLUMNS: GridColumn<Shipment>[] = UI_COLUMNS.map((col) =>
	TOTALED.has(String(col.id)) ? { ...col, aggFunc: 'sum' } : col,
)

/** {@link UI_COLUMNS} with a carrier filter that lists the carriers of the rows. */
const UI_FACET_COLUMNS: GridColumn<Shipment>[] = UI_COLUMNS.map((col) =>
	col.id === 'carrier' ? { ...col, filterable: true, filterType: 'select' } : col,
)

/** {@link UI_COLUMNS} with a filterable carrier column. */
const UI_FILTER_COLUMNS: GridColumn<Shipment>[] = UI_COLUMNS.map((col) =>
	col.id === 'carrier' ? { ...col, filterable: true } : col,
)

/** The applied filters of a `contains` rule on the carrier column, or none for `''`. */
function carrierFilter(text: string): GridColumnFilterState[] {
	if (!text) return []

	const rule = { id: 'rule', type: 'rule', field: 'carrier', operator: 'contains', value: text }

	return [{ id: 'carrier', value: { id: 'root', type: 'group', children: [rule] } as QueryGroup }]
}

const AG_COLUMNS = SHIPMENT_FIELDS.map(([field, headerName]) => ({ field, headerName, width: 120 }))

const MUI_COLUMNS: GridColDef<Shipment>[] = SHIPMENT_FIELDS.map(([field, headerName]) => ({
	field,
	headerName,
	width: 120,
}))

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
		mount(host, rows, options) {
			const box = fillBox(host)

			const root = createRoot(box)

			let current = rows

			let sort: GridSortState[] = []

			let search = ''

			let filters: GridColumnFilterState[] = []

			let pageIndex = 0

			const filterable = options?.filterable ?? false

			const paginated = options?.paginated ?? false

			const grandTotal = options?.grandTotal ?? false

			const facets = options?.facets ?? false

			const columns = facets
				? UI_FACET_COLUMNS
				: filterable
					? UI_FILTER_COLUMNS
					: grandTotal
						? UI_TOTAL_COLUMNS
						: UI_COLUMNS

			const draw = () =>
				flushSync(() =>
					root.render(
						<Grid
							columns={columns}
							grandTotalRow={grandTotal || undefined}
							groupBy={options?.grouped ? { value: 'carrier' } : undefined}
							rows={current}
							getKey={shipmentKey}
							virtualize
							maxHeight={`${GRID_HEIGHT}px`}
							sort={{ value: sort }}
							search={{ value: search }}
							columnFilters={filterable ? { value: filters } : undefined}
							pagination={paginated ? { value: { pageIndex, pageSize: PAGE_SIZE } } : undefined}
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
				search(query) {
					search = query

					draw()
				},
				filter(text) {
					filters = carrierFilter(text)

					draw()
				},
				page(index) {
					pageIndex = index

					draw()
				},
				openFacets() {
					const button = box.querySelector<HTMLElement>('button[aria-label="Filter Carrier"]')

					if (!button) throw new Error('grid bench found no carrier filter button')

					flushSync(() => button.click())
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
		// The grand-total row, the set filter, and the row grouping of AG Grid are
		// Enterprise features.
		unsupported: ['grandTotal', 'facets', 'grouped'],
		mount(host, rows, options) {
			const box = fillBox(host)

			const api: GridApi<Shipment> = createGrid<Shipment>(box, {
				columnDefs: options?.filterable
					? AG_COLUMNS.map((col) => (col.field === 'carrier' ? { ...col, filter: true } : col))
					: AG_COLUMNS,
				...(options?.paginated ? { pagination: true, paginationPageSize: PAGE_SIZE } : {}),
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
				search: (query) => api.setGridOption('quickFilterText', query),
				filter: (text) =>
					api.setFilterModel(
						text ? { carrier: { filterType: 'text', type: 'contains', filter: text } } : null,
					),
				page: (index) => api.paginationGoToPage(index),
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
		// The aggregation and the row grouping of MUI X are Premium features, and
		// its filter lists no values.
		unsupported: ['grandTotal', 'facets', 'grouped'],
		mount(host, rows, options) {
			const box = fillBox(host)

			const root = createRoot(box)

			let current = rows

			let sortModel: GridSortModel = []

			let page = 0

			let filterModel: GridFilterModel = { items: [] }

			const draw = () =>
				flushSync(() =>
					root.render(
						<DataGrid
							columns={MUI_COLUMNS}
							rows={current}
							sortModel={sortModel}
							filterModel={filterModel}
							{...(options?.paginated ? { paginationModel: { page, pageSize: PAGE_SIZE } } : {})}
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
					sortModel = [{ field: 'id', sort: direction }]

					draw()
				},
				search(query) {
					// MUI's quick filter is its filter model's `quickFilterValues`,
					// which ANDs the terms across every bound field — the same scan
					// AG's `quickFilterText` and the ui grid's `search` run.
					filterModel = { items: [], quickFilterValues: query ? [query] : [] }

					draw()
				},
				filter(text) {
					filterModel = {
						items: text ? [{ field: 'carrier', operator: 'contains', value: text }] : [],
					}

					draw()
				},
				page(index) {
					page = index

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
