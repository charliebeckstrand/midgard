// @vitest-environment node

import { bench, describe } from 'vitest'
import type { GridColumn } from '../modules/grid'
import { rowsToCsv } from '../modules/grid/export/export-csv'
import { rowsToHtmlTable } from '../modules/grid/export/export-html-table'
import { allocateColumnWidths } from '../modules/grid/grid-column-allocate'
import { applyPinOverrides, type PinOverrides } from '../modules/grid/grid-pin-overrides'
import {
	makeColumnSizeProfiles,
	makeEscapeHeavyRows,
	makeShipments,
	type Shipment,
} from './fixtures'

// Pure grid compute that runs on the render hot path (column allocation, pin
// overlay) or on an export, benched in a node env with no DOM. The DOM-bound
// measurer (measureColumnIntrinsics) is excluded — its pure downstream
// allocateColumnWidths is benched with synthetic profiles instead. Import each
// utility by path; the grid barrel does not re-export them.

describe('grid-layout · allocateColumnWidths', () => {
	// The one non-trivial numeric algorithm outside sort: a 50-iteration bisection
	// (surplus regime) or a largest-remainder rounding sort (deficit regime), run
	// once per measurement pass. Cost scales with columns, not rows.
	for (const cols of [4, 8, 20, 50, 200]) {
		const profiles = makeColumnSizeProfiles(cols)

		const totalContent = profiles.reduce((sum, p) => sum + p.content, 0)

		// Surplus: available exceeds desired → the bisection level-up path.
		const surplus = Math.round(totalContent * 2)

		// Deficit: available below desired → hold at content, sort-only rounding.
		const deficit = Math.round(totalContent * 0.5)

		bench(`${cols} cols · surplus (level-up)`, () => {
			allocateColumnWidths(profiles, surplus)
		})

		bench(`${cols} cols · deficit (hold + round)`, () => {
			allocateColumnWidths(profiles, deficit)
		})
	}
})

const CSV_COLUMNS: GridColumn<Shipment>[] = [
	{ id: 'id', title: 'ID' },
	{ id: 'reference', title: 'Reference' },
	{ id: 'origin', title: 'Origin' },
	{ id: 'destination', title: 'Destination' },
	{ id: 'status', title: 'Status' },
	{ id: 'carrier', title: 'Carrier' },
	{ id: 'loads', title: 'Loads' },
	{ id: 'weight', title: 'Weight' },
]

const NOISY_COLUMNS: GridColumn<Record<string, string>>[] = (
	['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
).map((id) => ({ id, title: id.toUpperCase() }))

describe('grid-export · rowsToCsv', () => {
	// The heaviest O(rows × cols) pure string builder. `plain` never trips the
	// RFC-4180 escape branch; `escape-heavy` forces it on every cell (a comma,
	// quote, and newline in each), the worst case.
	for (const n of [10, 50, 1_000]) {
		const plain = makeShipments(n)

		const noisy = makeEscapeHeavyRows(n)

		bench(`${n.toLocaleString()} rows × 8 cols · plain`, () => {
			rowsToCsv(CSV_COLUMNS, plain)
		})

		bench(`${n.toLocaleString()} rows × 8 cols · escape-heavy`, () => {
			rowsToCsv(NOISY_COLUMNS, noisy)
		})
	}
})

describe('grid-export · rowsToHtmlTable', () => {
	// Same shape as rowsToCsv (backs the Excel and print exporters); `escape-heavy`
	// forces `&<>` entity encoding on every cell.
	for (const n of [10, 50, 1_000]) {
		const plain = makeShipments(n)

		const noisy = makeEscapeHeavyRows(n)

		bench(`${n.toLocaleString()} rows × 8 cols · plain`, () => {
			rowsToHtmlTable(CSV_COLUMNS, plain)
		})

		bench(`${n.toLocaleString()} rows × 8 cols · escape-heavy`, () => {
			rowsToHtmlTable(NOISY_COLUMNS, noisy)
		})
	}
})

describe('grid-columns · applyPinOverrides', () => {
	// Overlays runtime pin changes onto static column flags each render. The
	// empty-overrides path returns the input by reference (the common case); a
	// full-override map clones every touched column (the worst case).
	for (const cols of [8, 50, 200]) {
		const columns: GridColumn<Shipment>[] = Array.from({ length: cols }, (_, i) => ({
			id: `col-${i}`,
			title: `Col ${i}`,
		}))

		const empty: PinOverrides = new Map()

		const full: PinOverrides = new Map(
			columns.map((col, i) => [String(col.id), i % 2 === 0 ? 'left' : 'right'] as const),
		)

		bench(`${cols} cols · no overrides (identity)`, () => {
			applyPinOverrides(columns, empty)
		})

		bench(`${cols} cols · all overridden (clone)`, () => {
			applyPinOverrides(columns, full)
		})
	}
})
