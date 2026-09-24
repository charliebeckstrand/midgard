/**
 * The client-grouped and master-detail bodies under `virtualize`. Each body
 * windows one item list through the measured path of `useVirtualWindow`. The
 * mount scenarios time one mount plus teardown per iteration. The toggle
 * scenarios time one group toggle, or one detail toggle, on a mounted grid.
 *
 * jsdom lays nothing out, and a window over a zero-height viewport holds no
 * rows. `modelLayout` from the harness gives the scroller a viewport and each
 * row a height, as `chat-render.bench.tsx` does for the transcript. The model patches
 * `HTMLElement.prototype`, so it lives in this file alone and the flat-body
 * scenarios of `grid.bench.tsx` keep the jsdom layout they measured before.
 */

import { act } from '@testing-library/react'
import { describe } from 'vitest'
import { Grid, type GridColumn } from '../modules/grid'
import { type Shipment, shipmentColumns, shipmentKey, shipments } from './fixtures'
import { modelLayout, mountBenches, persistentTree } from './harness'

/** The modelled viewport of the grid scroller, in pixels. */
const VIEWPORT = 600

/** The modelled height of each row, in pixels. It matches the snug estimate. */
const ROW = 44

/** The modelled height of each detail panel, in pixels. */
const DETAIL = 150

// The scroller has a fixed viewport, each window row has the row height, and
// each detail panel has a fixed height.
modelLayout({
	isScroller: (element) => element.dataset.slot === 'grid-scroll',
	viewport: VIEWPORT,
	width: 1000,
	rowHeight: (element) => {
		if (element.tagName !== 'TR' || !element.hasAttribute('data-index')) return 0

		return element.hasAttribute('data-detail-row') ? DETAIL : ROW
	},
})

const COLUMNS = shipmentColumns()

const EXPANDER: GridColumn<Shipment>[] = [{ id: 'expand', expander: true }, ...COLUMNS]

const SIZES = [1_000, 5_000, 10_000] as const

const CASES = SIZES.map((size) => ({
	label: `${size.toLocaleString('en-US')} rows`,
	rows: shipments(size),
}))

const detail = (row: Shipment) => <div>Detail for {row.reference}</div>

function grouped(rows: Shipment[]) {
	return (
		<Grid
			columns={COLUMNS}
			rows={rows}
			getKey={shipmentKey}
			groupBy={{ value: 'carrier' }}
			virtualize
			maxHeight="600px"
		/>
	)
}

function masterDetail(rows: Shipment[]) {
	return (
		<Grid
			columns={EXPANDER}
			rows={rows}
			getKey={shipmentKey}
			expandable={{ render: detail }}
			virtualize
			maxHeight="600px"
		/>
	)
}

/** Finds the toggle a scenario clicks, and fails when the window holds no rows. */
function toggleIn(container: HTMLElement, selector: string): HTMLElement {
	const toggle = container.querySelector<HTMLElement>(selector)

	if (!toggle) throw new Error(`the window rendered no toggle (${selector})`)

	return toggle
}

describe('Grid · grouped · virtualize (modelled 600px viewport)', () => {
	mountBenches(
		CASES,
		({ label }) => `mount ${label}`,
		({ rows }) => grouped(rows),
	)

	for (const { label, rows } of CASES) {
		// Each iteration toggles the first group, so the runs alternate a collapse
		// and an expand.
		persistentTree(grouped(rows), (container) =>
			toggleIn(container, '[data-group-row] button'),
		).bench(`toggle ${label}`, (toggle) => act(() => toggle.click()))
	}
})

describe('Grid · master-detail · virtualize (modelled 600px viewport)', () => {
	mountBenches(
		CASES,
		({ label }) => `mount ${label}`,
		({ rows }) => masterDetail(rows),
	)

	for (const { label, rows } of CASES) {
		// Each iteration toggles the first panel, so the runs alternate an open and
		// a close.
		persistentTree(masterDetail(rows), (container) =>
			toggleIn(container, 'button[aria-controls^="grid-detail-"]'),
		).bench(`toggle ${label}`, (toggle) => act(() => toggle.click()))
	}
})
