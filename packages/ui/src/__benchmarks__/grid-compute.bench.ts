// @vitest-environment node

import { bench, describe } from 'vitest'
import type { GridColumn } from '../modules/grid'
import { rowsToCsv } from '../modules/grid/engine/grid-export/csv'
import { rowsToHtmlTable } from '../modules/grid/engine/grid-export/html-table'
import { applyPinOverrides, type PinOverrides } from '../modules/grid/engine/grid-pin/overrides'
import { makeEscapeHeavyRows, type Shipment, shipmentColumns, shipments } from './fixtures'

// Pure grid compute that runs on the render hot path (pin overlay) or on an
// export, benched in a node env with no DOM. The column widths come from the
// browser (`readFitLayout`), so they have no pure compute to bench. Import each
// utility by path; the grid barrel does not re-export them.

const CSV_COLUMNS = shipmentColumns()

const NOISY_COLUMNS: GridColumn<Record<string, string>>[] = (
	['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
).map((id) => ({ id, title: id.toUpperCase() }))

describe('grid-export · rowsToCsv', () => {
	// The heaviest O(rows × cols) pure string builder. `plain` never trips the
	// RFC-4180 escape branch; `escape-heavy` forces it on every cell (a comma,
	// quote, and newline in each), the worst case.
	for (const count of [10, 50, 1_000]) {
		const plain = shipments(count)

		const noisy = makeEscapeHeavyRows(count)

		bench(`${count.toLocaleString()} rows × 8 cols · plain`, () => {
			rowsToCsv(CSV_COLUMNS, plain)
		})

		bench(`${count.toLocaleString()} rows × 8 cols · escape-heavy`, () => {
			rowsToCsv(NOISY_COLUMNS, noisy)
		})
	}
})

describe('grid-export · rowsToHtmlTable', () => {
	// Same shape as rowsToCsv (backs the Excel and print exporters); `escape-heavy`
	// forces `&<>` entity encoding on every cell.
	for (const count of [10, 50, 1_000]) {
		const plain = shipments(count)

		const noisy = makeEscapeHeavyRows(count)

		bench(`${count.toLocaleString()} rows × 8 cols · plain`, () => {
			rowsToHtmlTable(CSV_COLUMNS, plain)
		})

		bench(`${count.toLocaleString()} rows × 8 cols · escape-heavy`, () => {
			rowsToHtmlTable(NOISY_COLUMNS, noisy)
		})
	}
})

describe('grid-columns · applyPinOverrides', () => {
	// Overlays runtime pin changes onto static column flags each render. The
	// empty-overrides path returns the input by reference (the common case); a
	// full-override map clones every touched column (the worst case).
	for (const columnCount of [8, 50, 200]) {
		const columns: GridColumn<Shipment>[] = Array.from({ length: columnCount }, (_, i) => ({
			id: `col-${i}`,
			title: `Col ${i}`,
		}))

		const empty: PinOverrides = new Map()

		const full: PinOverrides = new Map(
			columns.map((column, i) => [String(column.id), i % 2 === 0 ? 'left' : 'right'] as const),
		)

		bench(`${columnCount} cols · no overrides (identity)`, () => {
			applyPinOverrides(columns, empty)
		})

		bench(`${columnCount} cols · all overridden (clone)`, () => {
			applyPinOverrides(columns, full)
		})
	}
})
