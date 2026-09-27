/**
 * The mount/update/sort/scroll adapter of the ui grid. The grid renders through
 * React (`createRoot` + `flushSync`), which is the synchronous commit that the
 * handler of a consumer pays. It draws the shipment rows into a fixed 960×600
 * box, with the animations off and fixed 120px columns.
 *
 * Each operation is timed until {@link painted} sees the expected cell text in
 * the live DOM. React commits under `flushSync`, but a part of the grid can
 * draw on a later animation frame. The paint probe charges the grid for each
 * frame that it defers, and it does not trust a "ready" signal.
 */

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

export const GRID_WIDTH = 960

export const GRID_HEIGHT = 600

/** The sort direction that a scenario applies through the sort state of the grid. */
export type SortDirection = 'asc' | 'desc'

/** A mounted grid under bench control; operations settle via {@link painted}. */
export type MountedGrid = {
	/** Swaps in a replacement dataset of the same shape (same ids, new values). */
	update: (rows: Shipment[]) => void
	/** Applies a whole-column sort on `id` through the sort state of the grid. */
	sort: (direction: SortDirection) => void
	/** Applies a quick filter across every column; `''` clears it. */
	search: (query: string) => void
	/** Applies a `contains` filter to the carrier column; `''` clears it. The grid must mount with {@link MountOptions.filterable}. */
	filter: (text: string) => void
	/** Shows the page at `index`. The grid must mount with {@link MountOptions.paginated}. */
	page: (index: number) => void
	/** Opens the filter of the carrier column, which lists its values. The grid must mount with {@link MountOptions.facets}. */
	openFacets: () => void
	/** The vertical scroll element. */
	scroller: () => HTMLElement
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

/** The rows on each page of a paginated grid. */
export const PAGE_SIZE = 100

/** One entry in a scenario: a name for the report and a mount. */
export type GridSubject = {
	name: string
	mount: (host: HTMLElement, rows: Shipment[], options?: MountOptions) => MountedGrid
}

/**
 * Settles an operation by paint evidence: resolves once every `marker` string
 * is present in the host's text, waiting one animation frame between looks.
 * A windowed grid holds only a viewport of cells, so the probe scans that
 * viewport and not the dataset. The first look is synchronous, so a grid that commits its DOM
 * before it returns settles at zero frames.
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
	// A ui column renders nothing without a `cell`.
	cell: (row) => row[id],
	// The quick search scans the columns that declare a `value`, so each column
	// declares one and the search reads all eight.
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

/** The element at `selector` inside `box`. It throws when no element matches, for example after a rename of the anchor. */
function mustFind(box: HTMLElement, selector: string): HTMLElement {
	const found = box.querySelector<HTMLElement>(selector)

	if (!found) throw new Error(`grid bench found no scroller at ${selector}`)

	return found
}

/** Sizes the box of the grid inside the fixed-height host. */
function fillBox(host: HTMLElement): HTMLElement {
	const box = document.createElement('div')

	box.style.height = '100%'

	host.append(box)

	return box
}

/** The ui grid: React renders, virtualized rows, controlled sort. */
function uiGrid(): GridSubject {
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

/** The grids that each scenario runs. */
export function grids(): GridSubject[] {
	return [uiGrid()]
}
