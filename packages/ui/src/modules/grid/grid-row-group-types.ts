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
 * One row group as {@link GridRowManager} shows it: the key, the label, the
 * row count, and the overlay color. It is the element type of
 * {@link GridRowManagerProps.groups}.
 *
 * @remarks {@link Grid} makes this list from its grouped rows and puts it in
 * the display order of the {@link GridRowGroup} overlay.
 */
export type GridRowManagerGroup = {
	/** The identity of the group: the shared value of the grouping column. {@link GridRowManagerProps.onRecolor} and {@link GridRowManagerProps.onReorderGroups} receive it. */
	key: string | number
	/** The text of the group in the list, such as the formatted shared value. */
	label: ReactNode
	/** The number of rows in the group. */
	count: number
	/** The overlay color of the group. Omit it for a group with no color. */
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
