import type { PaletteColor } from '../../core/recipe'

/**
 * One row group's presentation overlay for a {@link Grid} grouped by a column
 * (see {@link GridGroupBy}). Row groups stay value-derived — a group's identity
 * is the grouping column's shared `value` — so this carries only what the row
 * manager layers on top: a palette `color` and a manual leaf `rows` order. It is
 * the row-side analogue of a {@link GridColumnGroup}, minus membership (a row's
 * group follows from its data, not an assignment).
 *
 * @remarks The `color` accepts any {@link PaletteColor} — the standard palette
 * (`zinc` / `red` / `amber` / `green` / `blue`) plus the extended set (`rose` /
 * `violet` / `sky`) — rendering the group's rail, its header aggregation, and its
 * total footer in that hue. It matches the {@link Badge} surface, so the manager's
 * color presets read the same there.
 */
export type GridRowGroup = {
	/**
	 * Stable group identity — the grouping column's shared value, stringified for
	 * lookups. Keys the color, the leaf order, and the group's slot in the manual
	 * group order.
	 */
	key: string | number
	/**
	 * Rail / aggregation / total color from the {@link PaletteColor} palette
	 * (standard + extended). Omit for the group's default neutral rail and untinted
	 * aggregates.
	 */
	color?: PaletteColor
	/**
	 * Manual leaf order within the group, by row key ({@link GridDataProps.getKey}).
	 * Leaves listed here lead in this order; any not listed trail in their natural
	 * order. Applied only while the rows sit in their natural order — an active
	 * column sort orders the leaves itself and stands this down, mirroring
	 * {@link GridProps.rowReorder}.
	 */
	rows?: (string | number)[]
}

/**
 * Controlled/uncontrolled binding for {@link GridGroupBy.rowGroups}. The plain
 * array shorthand seeds the overlay uncontrolled (the row manager mutates it from
 * there); the object form threads a controlled `value` with an `onValueChange`
 * sink, so a consumer can persist the colors and ordering the manager produces.
 *
 * @remarks A partial overlay (some groups colored, others absent) is honored for
 * color and leaf order per group, but the manual *group* order applies only once
 * the overlay covers every current group — which the manager always commits — so
 * a stray or partial binding tints without reshuffling the groups.
 */
export type GridRowGroups =
	| GridRowGroup[]
	| {
			value?: GridRowGroup[]
			defaultValue?: GridRowGroup[]
			onValueChange?: (groups: GridRowGroup[]) => void
	  }
