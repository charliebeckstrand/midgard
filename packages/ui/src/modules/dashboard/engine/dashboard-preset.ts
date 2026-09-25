/**
 * Presets: named specs that an app offers as a start point for a board.
 *
 * A preset is plain data, as a spec is. The app holds its own catalog, and a
 * picker in the app starts the board from one preset.
 */

import type { DashboardSpec } from './dashboard-spec'
import {
	type DashboardSpecParse,
	type DashboardSpecParseOptions,
	parseDashboardSpec,
} from './dashboard-spec-parse'

/** A named spec that an app offers as a start point for a board. */
export type DashboardPreset = {
	/**
	 * The stable id of the preset. Give it to the board as its `key`, so a start
	 * mounts each tile again.
	 */
	id: string
	/** The name that a picker shows. */
	label: string
	/** A muted line that says what the board holds. */
	description?: string
	/** The board that the preset starts. */
	spec: DashboardSpec
}

/**
 * The spec that a start from `preset` gives. The spec passes through
 * {@link parseDashboardSpec}, so a preset that the app writes as JSON gets the
 * same check as a saved board.
 *
 * @remarks
 * A start replaces the board, and two things of the old board must not reach the
 * new one. First, clear the selection value. A selection applies while a tile
 * with its source id is on the board, and two presets can use the same id. An
 * old selection would then filter the new board. Second, give the preset `id` to
 * the board as its `key`. Else a tile that keeps its id keeps the state of its
 * widget, such as the sort of a grid.
 *
 * @example
 * ```tsx
 * const start = (preset: DashboardPreset) => {
 *   setSpec(startFromPreset(preset).spec)
 *   setSelection([])
 *   setBoard(preset.id) // <Dashboard key={board} ...>
 * }
 * ```
 *
 * @param preset - The preset to start from.
 * @param options - The ids of the JSX tiles on the same board. See {@link parseDashboardSpec}.
 * @returns The spec of the new board, and each issue that the parse repaired.
 */
export function startFromPreset(
	preset: DashboardPreset,
	options?: DashboardSpecParseOptions,
): DashboardSpecParse {
	return parseDashboardSpec(preset.spec, options)
}
