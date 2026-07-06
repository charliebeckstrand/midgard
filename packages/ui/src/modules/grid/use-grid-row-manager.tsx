'use client'

import type { ExpandedState, Row } from '@tanstack/react-table'
import { Ban, ChevronsDownUp, ChevronsUpDown, ListTree } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import type { PaletteColor } from '../../core/recipe'
import { useControllable } from '../../hooks'
import type { GridGroupBy } from './grid-data-types'
import { formatGroupValue } from './grid-group-row'
import type { GridRowGroup, GridRowGroups } from './grid-row-group-types'
import type { GridMenuItem } from './types'

/** One leaf row as the row manager lists it: its key and display label. @internal */
export type GridRowManagerLeaf = {
	/** The leaf's row key ({@link GridDataProps.getKey}). */
	key: string | number
	/** The leaf's display label — the grid's `rowLabel`, else the key. */
	label: ReactNode
}

/**
 * One group as the row manager renders it: identity, display label and count, its
 * overlay color, and its leaves in display order. Built by {@link GridData} from
 * the engine's grouped rows and resolved to display order (overlay group + leaf
 * order applied) by {@link useGridRowManager}.
 *
 * @internal
 */
export type GridRowManagerGroup = {
	/** The group's key — the grouping column's shared value. */
	key: string | number
	/** The group's header label — the shared value formatted. */
	label: ReactNode
	/** How many leaves the group holds. */
	count: number
	/** The group's overlay color, or `undefined` when uncolored. */
	color?: PaletteColor
	/** The group's leaves, in display order. */
	leaves: GridRowManagerLeaf[]
}

/**
 * The body-facing presentation the overlay resolves to: a color lookup (always
 * live), and the manual group / leaf orders — each `null` when ordering stands
 * down (an active column sort, or a group order that no longer covers every
 * group). {@link GridBody} reads it to tint and reorder the grouped rows.
 *
 * @internal
 */
export type GridRowGroupPresentation = {
	/** The group's overlay color by key, or `undefined` when uncolored. */
	color: (key: string | number) => PaletteColor | undefined
	/** Group keys in manual order, or `null` to keep the engine's group order. */
	groupOrder: (string | number)[] | null
	/** A group's manual leaf order by key, or `undefined`; `null` disables leaf ordering wholesale. */
	leafOrder: ((key: string | number) => (string | number)[] | undefined) | null
}

/** Unwraps the {@link GridRowGroups} binding: the array shorthand seeds `defaultValue`. @internal */
function normalizeRowGroups(config: GridRowGroups | undefined): {
	value?: GridRowGroup[]
	defaultValue?: GridRowGroup[]
	onValueChange?: (groups: GridRowGroup[]) => void
} {
	if (Array.isArray(config)) return { defaultValue: config }

	return config ?? {}
}

/** Stable empty overlay; read-only, replaced wholesale on change. @internal */
const EMPTY: GridRowGroup[] = []

/**
 * Reorders keyed `items` to lead in `order`, appending any not listed in their
 * original relative order — a stable reconcile shared by the group and leaf
 * ordering. Returns `items` untouched for an empty order.
 *
 * @internal
 */
export function applyRowKeyOrder<I>(
	items: I[],
	order: (string | number)[] | undefined,
	keyOf: (item: I) => string | number,
): I[] {
	if (!order || order.length === 0) return items

	const byKey = new Map(items.map((item) => [String(keyOf(item)), item]))

	const ordered = order
		.map((key) => byKey.get(String(key)))
		.filter((item): item is I => item != null)

	const listed = new Set(order.map(String))

	const rest = items.filter((item) => !listed.has(String(keyOf(item))))

	return [...ordered, ...rest]
}

/**
 * Builds the row manager's natural-order view model from the engine's grouped
 * rows: one entry per group header (its shared value, formatted label, and leaf
 * count) with its leaves keyed by {@link GridDataProps.getKey} and labeled by
 * `rowLabel`. Empty outside client grouping. The overlay's color and ordering are
 * layered on later by {@link useGridRowManager}.
 *
 * @internal
 */
export function buildRowManagerGroups<T>(
	groupedRows: Row<T>[] | null,
	columnId: string | number | null,
	getKey: (row: T, index: number) => string | number,
	rowLabel: ((row: T) => string) | undefined,
): GridRowManagerGroup[] {
	if (!groupedRows || columnId == null) return []

	return groupedRows
		.filter((row) => row.getIsGrouped())
		.map((row) => {
			const value = row.getGroupingValue(String(columnId)) as string | number

			return {
				key: value,
				label: formatGroupValue(value),
				count: row.subRows.length,
				leaves: row.subRows.map((leaf) => {
					const key = getKey(leaf.original, leaf.index)

					return { key, label: rowLabel?.(leaf.original) ?? String(key) }
				}),
			}
		})
}

/** Options for {@link useGridRowManager}. @internal */
type GridRowManagerOptions = {
	/** The `groupBy.rowGroups` binding, or `undefined` when unset. */
	config: GridRowGroups | undefined
	/** The current groups in the engine's natural order — no overlay applied. */
	naturalGroups: GridRowManagerGroup[]
	/**
	 * Whether manual ordering may apply — false stands the group and leaf orders
	 * down (a column sort orders the rows itself), leaving only the colors.
	 */
	orderingPermitted: boolean
}

/**
 * Resolves the {@link GridRowGroups} overlay into what the grid runs on: the
 * body {@link GridRowGroupPresentation} (color lookup + manual group/leaf order,
 * each standing down under a sort), the display-ordered {@link GridRowManagerGroup}
 * list the manager renders, and the recolor / reorder handlers that commit a
 * *complete* snapshot (an entry per current group) back through the binding.
 *
 * The snapshot is always complete in keys so the manual group order can apply
 * without a partial overlay shuffling groups on a mere recolor; the body applies
 * that order only while it still covers every group (`groupOrder` goes `null`
 * otherwise), so a group that appears after the overlay was captured leaves the
 * order intact rather than jumping.
 *
 * @internal
 */
export function useGridRowManager({
	config,
	naturalGroups,
	orderingPermitted,
}: GridRowManagerOptions) {
	const binding = useMemo(() => normalizeRowGroups(config), [config])

	const [overlay = EMPTY, setOverlay] = useControllable<GridRowGroup[]>({
		value: binding.value,
		defaultValue: binding.defaultValue ?? EMPTY,
		onValueChange: (next) => binding.onValueChange?.(next ?? EMPTY),
	})

	const overlayByKey = useMemo(
		() => new Map(overlay.map((group) => [String(group.key), group])),
		[overlay],
	)

	// The overlay's group order, kept only where it still names a current group;
	// `complete` when it covers every one, the gate for applying the manual order.
	const currentKeys = useMemo(() => naturalGroups.map((group) => group.key), [naturalGroups])

	const complete = useMemo(() => {
		const overlaid = new Set(overlay.map((group) => String(group.key)))

		return currentKeys.length > 0 && currentKeys.every((key) => overlaid.has(String(key)))
	}, [overlay, currentKeys])

	const groupOrder = useMemo(
		() => (orderingPermitted && complete ? overlay.map((group) => group.key) : null),
		[orderingPermitted, complete, overlay],
	)

	const presentation = useMemo<GridRowGroupPresentation>(
		() => ({
			color: (key) => overlayByKey.get(String(key))?.color,
			groupOrder,
			leafOrder: orderingPermitted ? (key) => overlayByKey.get(String(key))?.rows : null,
		}),
		[overlayByKey, groupOrder, orderingPermitted],
	)

	// The manager's rows: the natural groups reordered to the overlay's group order
	// (when it applies), each carrying its overlay color and leaf order.
	const managerGroups = useMemo<GridRowManagerGroup[]>(() => {
		const ordered = applyRowKeyOrder(naturalGroups, groupOrder ?? undefined, (group) => group.key)

		return ordered.map((group) => {
			const entry = overlayByKey.get(String(group.key))

			const leaves = orderingPermitted
				? applyRowKeyOrder(group.leaves, entry?.rows, (leaf) => leaf.key)
				: group.leaves

			return { ...group, color: entry?.color, leaves }
		})
	}, [naturalGroups, groupOrder, overlayByKey, orderingPermitted])

	// Every edit commits a complete snapshot — an entry per group in `groups`
	// order, each preserving its color and leaf order unless `override` changes one.
	const commitFrom = useCallback(
		(
			groups: GridRowManagerGroup[],
			override?: { key: string | number; color?: PaletteColor; rows?: (string | number)[] },
		) => {
			const next = groups.map((group): GridRowGroup => {
				const target = override != null && String(override.key) === String(group.key)

				const entry: GridRowGroup = { key: group.key }

				const color = target && 'color' in override ? override.color : group.color

				if (color) entry.color = color

				const rows =
					target && override.rows ? override.rows : overlayByKey.get(String(group.key))?.rows

				if (rows) entry.rows = rows

				return entry
			})

			setOverlay(next)
		},
		[overlayByKey, setOverlay],
	)

	const recolor = useCallback(
		(key: string | number, color: PaletteColor | undefined) =>
			commitFrom(managerGroups, { key, color }),
		[commitFrom, managerGroups],
	)

	const reorderGroups = useCallback(
		(orderedKeys: (string | number)[]) =>
			commitFrom(applyRowKeyOrder(managerGroups, orderedKeys, (group) => group.key)),
		[commitFrom, managerGroups],
	)

	const reorderLeaves = useCallback(
		(key: string | number, leafKeys: (string | number)[]) =>
			commitFrom(managerGroups, { key, rows: leafKeys }),
		[commitFrom, managerGroups],
	)

	return { managerGroups, orderingPermitted, presentation, recolor, reorderGroups, reorderLeaves }
}

/** Inputs shaping the group-header context menu. @internal */
type GridRowGroupMenuArgs = {
	/** Whether the right-clicked group is currently expanded. */
	expanded: boolean
	/** The group's overlay color, or `undefined` — gates the "Clear color" item. */
	color: PaletteColor | undefined
	/** Label for the "Manage rows" item — opens the row manager. */
	manageLabel: ReactNode
	/** Opens the row-manager dialog. */
	onManage: () => void
	/** Toggles the right-clicked group's expansion. */
	onToggle: () => void
	/** Expands every group. */
	onExpandAll: () => void
	/** Collapses every group. */
	onCollapseAll: () => void
	/** Clears the right-clicked group's color. */
	onClearColor: () => void
}

/**
 * The group-header context menu: "Manage rows" (opens the row manager), then the
 * group's expand controls under a separator — Collapse/Expand this group, Expand
 * all, Collapse all — and, once the group is colored, a "Clear color" shortcut
 * that spares a trip to the manager. Setting a color stays in the manager, where
 * the palette renders as swatches (the flat menu can't nest a submenu).
 *
 * @internal
 */
function buildRowGroupMenu(args: GridRowGroupMenuArgs): GridMenuItem[] {
	const items: GridMenuItem[] = [
		{ key: 'manage-rows', label: args.manageLabel, icon: <ListTree />, onSelect: args.onManage },
		{ key: 'group-sep', separator: true },
		{
			key: 'toggle-group',
			label: args.expanded ? 'Collapse group' : 'Expand group',
			icon: args.expanded ? <ChevronsDownUp /> : <ChevronsUpDown />,
			onSelect: args.onToggle,
		},
		{
			key: 'expand-all',
			label: 'Expand all groups',
			icon: <ChevronsUpDown />,
			onSelect: args.onExpandAll,
		},
		{
			key: 'collapse-all',
			label: 'Collapse all groups',
			icon: <ChevronsDownUp />,
			onSelect: args.onCollapseAll,
		},
	]

	if (args.color) {
		items.push(
			{ key: 'color-sep', separator: true },
			{ key: 'clear-color', label: 'Clear color', icon: <Ban />, onSelect: args.onClearColor },
		)
	}

	return items
}

/** The row-manager wiring {@link useGridRowManagerRegion} hands {@link GridData}. @internal */
export type GridRowManagerRegionResult = {
	/** Body presentation (color + order), or `null` off client grouping. */
	presentation: GridRowGroupPresentation | null
	/** Display-ordered groups the dialog renders. */
	managerGroups: GridRowManagerGroup[]
	/** Whether reordering may apply (false under a sort). */
	orderingPermitted: boolean
	recolor: (key: string | number, color: PaletteColor | undefined) => void
	reorderGroups: (orderedKeys: (string | number)[]) => void
	reorderLeaves: (key: string | number, leafKeys: (string | number)[]) => void
	/** The group-header menu resolver, keyed by a group's stringified value. */
	rowGroupMenu: (key: string) => GridMenuItem[] | null
	/** Whether the "Manage rows" dialog is reachable (mount it when true). */
	reachable: boolean
	open: boolean
	setOpen: (open: boolean) => void
}

/** Options for {@link useGridRowManagerRegion}. @internal */
type GridRowManagerRegionOptions<T> = {
	groupByConfig: GridGroupBy<T> | undefined
	/** Whether client grouping is active — the row manager runs under it alone. */
	groupingActive: boolean
	/** The engine's grouped rows, or `null` when ungrouped. */
	groupedRows: Row<T>[] | null
	/** The grouped column id, or `null`. */
	grouping: string | number | null
	getKey: (row: T, index: number) => string | number
	rowLabel: ((row: T) => string) | undefined
	/** Active sort column count — a non-zero count stands manual ordering down. */
	sortCount: number
	/** Whether the header context menu is live — the manager's only entry point. */
	contextMenuActive: boolean
	/** Commits an engine expansion change (backs Expand all / Collapse all). */
	setGroupExpanded: (next: ExpandedState) => void
}

/**
 * The full row-manager wiring for {@link GridData}: resolves the overlay
 * (see {@link useGridRowManager}), owns the dialog's open state, and builds the
 * group-header menu resolver (keyed by the group's stringified value) that opens
 * the manager and drives the per-group / all-group expand toggles and the
 * clear-color shortcut. Returns `null`-safe values off client grouping so the
 * grid stands the whole feature down. Split out of {@link GridData} to keep its
 * body within the cognitive-complexity budget.
 *
 * @internal
 */
export function useGridRowManagerRegion<T>({
	groupByConfig,
	groupingActive,
	groupedRows,
	grouping,
	getKey,
	rowLabel,
	sortCount,
	contextMenuActive,
	setGroupExpanded,
}: GridRowManagerRegionOptions<T>): GridRowManagerRegionResult {
	const enabled = groupingActive && (groupByConfig?.rowManager ?? true)

	const naturalGroups = useMemo(
		() => buildRowManagerGroups(groupedRows, grouping, getKey, rowLabel),
		[groupedRows, grouping, getKey, rowLabel],
	)

	const manager = useGridRowManager({
		config: groupByConfig?.rowGroups,
		naturalGroups,
		// Manual leaf/group order only holds against the natural row order; a column
		// sort orders the rows itself, so ordering stands down while one is active.
		orderingPermitted: enabled && sortCount === 0,
	})

	const [open, setOpen] = useState(false)

	// Reached only through the group-header menu, so it needs the context menu live.
	const reachable = enabled && contextMenuActive

	// Group-row lookup (by stringified value) for the menu's per-group expand toggle.
	const groupRowByKey = useMemo(() => {
		const map = new Map<string, Row<T>>()

		if (groupedRows && grouping != null) {
			for (const row of groupedRows) {
				if (row.getIsGrouped()) map.set(String(row.getGroupingValue(String(grouping))), row)
			}
		}

		return map
	}, [groupedRows, grouping])

	const { color } = manager.presentation

	const { recolor } = manager

	const rowGroupMenu = useCallback(
		(key: string): GridMenuItem[] | null => {
			if (!reachable) return null

			const row = groupRowByKey.get(key)

			return buildRowGroupMenu({
				expanded: row?.getIsExpanded() ?? false,
				color: color(key),
				manageLabel: 'Manage rows',
				onManage: () => setOpen(true),
				onToggle: () => row?.toggleExpanded(),
				onExpandAll: () => setGroupExpanded(true),
				onCollapseAll: () => setGroupExpanded({}),
				onClearColor: () => recolor(key, undefined),
			})
		},
		[reachable, groupRowByKey, color, recolor, setGroupExpanded],
	)

	return {
		/** Body presentation (color + order), or `null` off client grouping. */
		presentation: groupingActive ? manager.presentation : null,
		/** Display-ordered groups the dialog renders. */
		managerGroups: manager.managerGroups,
		/** Whether reordering may apply (false under a sort). */
		orderingPermitted: manager.orderingPermitted,
		recolor: manager.recolor,
		reorderGroups: manager.reorderGroups,
		reorderLeaves: manager.reorderLeaves,
		/** The group-header menu resolver, keyed by a group's stringified value. */
		rowGroupMenu,
		/** Whether the "Manage rows" dialog is reachable (mount it when true). */
		reachable,
		open,
		setOpen,
	}
}
