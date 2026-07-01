import type { ReactElement, ReactNode } from 'react'
import type { PaletteColor } from '../../core/recipe'

/**
 * One column group of a {@link Grid}: a labeled, colored band drawn above a
 * contiguous run of columns. `columns` lists the member column ids in the order
 * they sit under the band — the grid keeps them adjacent and in this order, so a
 * group moves and reorders as a block.
 *
 * @remarks The band's color accepts any {@link PaletteColor} — the standard
 * palette (`zinc` / `red` / `amber` / `green` / `blue`) plus the extended set
 * (`mist` / `rose` / `violet` / `sky`) — rendered through {@link Badge}, so the
 * presets match the Badge surface exactly.
 */
export type GridColumnGroup = {
	/** Stable identity for the group; keys its band and its column-manager zone. */
	id: string | number
	/** Group heading shown in the band — its name. Falls back to the `id` when omitted. */
	title?: ReactNode
	/**
	 * Band color from the {@link PaletteColor} palette (standard + extended, as
	 * {@link Badge} accepts). Omit for the Badge's default neutral chip.
	 */
	color?: PaletteColor
	/** Member column ids, in band order; the grid keeps them contiguous. */
	columns: (string | number)[]
	/** Secondary text revealed as a tooltip on the band — what the group covers. */
	description?: ReactNode
	/** Leading glyph in the band (a lucide icon element), tinted to the group color. */
	icon?: ReactElement
	/**
	 * Lets the band collapse to its first member with an expand toggle, hiding the
	 * rest until reopened.
	 * @defaultValue false
	 */
	collapsible?: boolean
	/**
	 * Initial collapsed state for a {@link GridColumnGroup.collapsible} group. The
	 * collapsed state is grid-owned view state (not persisted through the
	 * {@link GridColumnGroups} binding), seeded once from this flag.
	 * @defaultValue false
	 */
	defaultCollapsed?: boolean
}

/**
 * Controlled/uncontrolled binding for {@link GridDataProps.groups}. The plain
 * array shorthand seeds the groups uncontrolled (the column manager mutates them
 * from there); the object form threads a controlled `value` with an
 * `onValueChange` sink, so a consumer can persist the group layout the manager
 * produces.
 */
export type GridColumnGroups =
	| GridColumnGroup[]
	| {
			value?: GridColumnGroup[]
			defaultValue?: GridColumnGroup[]
			onValueChange?: (groups: GridColumnGroup[]) => void
	  }

/**
 * A resolved group-header span: either a `group` band covering `colSpan`
 * contiguous scrolling columns, or a `plain` filler over a single ungrouped (or
 * pinned) column. {@link GridGroupHead} renders one `<th>` per span so the group
 * row's total column span matches the column-header row beneath it.
 *
 * @internal
 */
export type GridGroupSpan =
	| { kind: 'group'; group: GridColumnGroup; colSpan: number; leadColumnId: string | number }
	| { kind: 'plain'; colSpan: number; leadColumnId: string | number }
