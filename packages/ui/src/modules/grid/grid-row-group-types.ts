import type { ReactNode } from 'react'
import type { PaletteColor } from '../../core/recipe'

/**
 * One row group's presentation overlay for a {@link Grid} grouped by a column
 * (see {@link GridGroupBy}). Row groups stay value-derived: a group's identity
 * is the grouping column's shared `value`. This therefore carries only what the
 * row manager layers on top. It holds a palette `color`, and the group's slot in
 * the manual group order (its position in the array). It is the row-side
 * analogue of a {@link GridColumnGroup}, minus membership and minus row order. A
 * row's group follows from its data, not an assignment, and rows keep the
 * engine's order.
 *
 * @remarks The `color` accepts any {@link PaletteColor}: the standard palette
 * (`zinc` / `red` / `amber` / `green` / `blue`), plus the extended set (`rose` /
 * `violet` / `sky`). It renders the group's rail, its header aggregation, and
 * its total footer in that hue. It matches the {@link Badge} surface, so the manager's
 * color presets read the same there.
 */
export type GridRowGroup = {
	/**
	 * Stable group identity — the grouping column's shared value, stringified for
	 * lookups. Keys the color and the group's slot in the manual group order.
	 */
	key: string | number
	/**
	 * Rail / aggregation / total color from the {@link PaletteColor} palette
	 * (standard + extended). Omit for the group's default neutral rail and untinted
	 * aggregates.
	 */
	color?: PaletteColor
}

/**
 * Controlled/uncontrolled binding for {@link GridGroupBy.rowGroups}. The plain
 * array shorthand seeds the overlay uncontrolled, and the row manager mutates it
 * from there. The object form threads a controlled `value` with an
 * `onValueChange` sink, so a consumer can persist the colors and ordering the
 * manager produces.
 *
 * @remarks A partial overlay (some groups colored, others absent) is honored for
 * color per group. The manual *group* order applies only once the overlay covers
 * every current group, which the manager always commits. A stray or partial
 * binding therefore tints without reshuffling the groups.
 */
export type GridRowGroups =
	| GridRowGroup[]
	| {
			value?: GridRowGroup[]
			defaultValue?: GridRowGroup[]
			onValueChange?: (groups: GridRowGroup[]) => void
	  }

/**
 * One group as the row manager renders it: identity, display label, row count,
 * and its overlay color. Built by {@link GridData} from the engine's grouped rows
 * and resolved to display order (overlay group order applied) by
 * {@link useGridRowManager}.
 *
 * @internal
 */
export type GridRowManagerGroup = {
	/** The group's key — the grouping column's shared value. */
	key: string | number
	/** The group's header label — the shared value formatted. */
	label: ReactNode
	/** How many rows the group holds. */
	count: number
	/** The group's overlay color, or `undefined` when uncolored. */
	color?: PaletteColor
}

/**
 * The body-facing presentation the overlay resolves to: a color lookup, always
 * live, and the manual group order. The order is `null` when the overlay no
 * longer covers every group. {@link GridBody} reads it to tint and reorder the grouped rows.
 * Rows within a group are not managed — they keep the engine's order.
 *
 * @internal
 */
export type GridRowGroupPresentation = {
	/** The group's overlay color by key, or `undefined` when uncolored. */
	color: (key: string | number) => PaletteColor | undefined
	/** Group keys in manual order, or `null` to keep the engine's group order. */
	groupOrder: (string | number)[] | null
}
