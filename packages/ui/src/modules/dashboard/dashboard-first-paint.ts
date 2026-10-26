import {
	type DashboardCell,
	type DashboardLayoutItem,
	type DashboardTileDemands,
	gridArea,
	resolveLayout,
	sameCell,
} from './engine/dashboard-layout'
import { projectionSteps } from './engine/dashboard-responsive'

/** The inputs of the first paint of one board. */
type FirstPaintOptions = {
	/** The saved layout. */
	layout: readonly DashboardLayoutItem[]
	/** The demands that the children of the board declare, by tile id. */
	demands: ReadonlyMap<string, DashboardTileDemands>
	/** The column count. */
	columns: number
	/** The gutter in px. */
	gap: number
}

/**
 * `value` as a quoted CSS string. Each character that is not a letter, a digit,
 * `_`, or `-` takes a hex escape, so no id closes the string or the `<style>`.
 */
function cssString(value: string): string {
	const escaped = value.replace(/[^\w-]/gu, (char) => `\\${char.codePointAt(0)?.toString(16)} `)

	return `"${escaped}"`
}

/** A length in px, with no more than three decimals. */
function px(value: number): string {
	return `${Number(value.toFixed(3))}px`
}

/**
 * The style sheet of the first paint of a board: a container query for each
 * step of the responsive projection, which puts each tile at its projected cell.
 *
 * The server cannot measure the container, so its markup holds each tile at its
 * saved cell. On a narrow container the store then paints a re-pack. These
 * rules paint that re-pack from the first frame. Each rule applies only while
 * the canvas has no `data-measured`, and it takes `!important` to pass the
 * inline grid area of the tile. After the first measurement, the inline grid
 * area of the store takes over, with the same cells.
 *
 * @remarks
 * Only the tiles that the children declare and that have a saved entry get a
 * rule. A tile that a component renders, or a tile with no entry, keeps the
 * paint of the store. A rule selects a tile by `data-tile-id`, under the board
 * whose `data-dashboard` is `scope`. The canvas spans the container plus one
 * gutter, so each step reads the container at its width less the gutter.
 *
 * @internal
 */
export function firstPaintRules(
	scope: string,
	{ layout, demands, columns, gap }: FirstPaintOptions,
): string {
	const saved = new Set(layout.map((item) => item.id))

	const shown = new Map([...demands].filter(([id]) => saved.has(id)))

	const cells = resolveLayout(layout, shown, columns)

	const steps = projectionSteps(cells, { gap, columns, demands: shown })

	const tile = `[data-dashboard=${cssString(scope)}]>[data-slot=dashboard-canvas]:not([data-measured])>[data-tile-id=`

	// The cell that the rules before this step give each tile. The first step writes each tile.
	const painted = new Map<string, DashboardCell>()

	let sheet = ''

	for (const step of steps) {
		let rules = ''

		for (const cell of step.cells) {
			const before = painted.get(cell.id)

			if (before !== undefined && sameCell(before, cell)) continue

			painted.set(cell.id, cell)

			rules += `${tile}${cssString(cell.id)}]{grid-area:${gridArea(cell)}!important}`
		}

		if (rules !== '') sheet += `@container (width < ${px(step.below - gap)}){${rules}}`
	}

	return sheet
}
