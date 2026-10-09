'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PaletteColor } from '../../core/recipe'
import { useControllable } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import { groupValueLabel } from './engine/grid-column/label'
import {
	applyRowKeyOrder,
	buildRowManagerGroups,
	normalizeRowGroups,
} from './engine/grid-group/row-manager'
import {
	ALL_GROUPS_CLOSED,
	ALL_GROUPS_OPEN,
	type GridGroup,
	type GroupExpansion,
} from './engine/grid-group/tree'
import type { GridMenuResolution } from './engine/grid-menu-targeting'
import { buildRowGroupMenu } from './grid-context-menu-utilities'
import type { GridGroupBy } from './grid-data-types'
import type {
	GridRowGroup,
	GridRowGroupPresentation,
	GridRowGroups,
	GridRowManagerGroup,
} from './grid-row-group-types'

/** Stable empty overlay; read-only, replaced wholesale on change. @internal */
const EMPTY: GridRowGroup[] = []

/** Options for {@link useGridRowManager}. @internal */
type GridRowManagerOptions = {
	/** The `groupBy.rowGroups` binding, or `undefined` when unset. */
	config: GridRowGroups | undefined
	/** The current groups in their natural order — no overlay applied. */
	naturalGroups: GridRowManagerGroup[]
}

/**
 * Resolves the {@link GridRowGroups} overlay into what the grid runs on:
 *
 * - the body {@link GridRowGroupPresentation}: a color lookup and the manual
 *   group order;
 * - the display-ordered {@link GridRowManagerGroup} list the manager renders;
 * - the recolor / reorder handlers that commit a *complete* snapshot, an entry
 *   per current group, back through the binding.
 *
 * The snapshot is always complete in keys, so the manual group order can apply
 * without a partial overlay shuffling groups on a mere recolor. The body applies
 * that order only while it still covers every group, and `groupOrder` goes
 * `null` otherwise. A group that appears after the overlay was captured
 * therefore drops the manual order, and every group shows in its natural order.
 * The colors of the overlay still apply. The next recolor or reorder commits a
 * complete snapshot in the order that the manager then shows.
 *
 * @internal
 */
export function useGridRowManager({ config, naturalGroups }: GridRowManagerOptions) {
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
		() => (complete ? overlay.map((group) => group.key) : null),
		[complete, overlay],
	)

	const presentation = useMemo<GridRowGroupPresentation>(
		() => ({
			color: (key) => overlayByKey.get(String(key))?.color,
			groupOrder,
		}),
		[overlayByKey, groupOrder],
	)

	// The manager's rows: the natural groups reordered to the overlay's group order
	// (when it applies), each carrying its overlay color. Leaves keep their order.
	const managerGroups = useMemo<GridRowManagerGroup[]>(() => {
		const ordered = applyRowKeyOrder(naturalGroups, groupOrder ?? undefined, (group) => group.key)

		return ordered.map((group) => ({ ...group, color: overlayByKey.get(String(group.key))?.color }))
	}, [naturalGroups, groupOrder, overlayByKey])

	// Every edit commits a complete snapshot — an entry per group in `groups`
	// order, each preserving its color unless `override` changes it.
	const commitFrom = useCallback(
		(groups: GridRowManagerGroup[], override?: { key: string | number; color?: PaletteColor }) => {
			const next = groups.map((group): GridRowGroup => {
				const target = override != null && String(override.key) === String(group.key)

				const color = target ? override.color : group.color

				return color ? { key: group.key, color } : { key: group.key }
			})

			setOverlay(next)
		},
		[setOverlay],
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

	return { managerGroups, presentation, recolor, reorderGroups }
}

/** The row-manager wiring {@link useGridRowManagerRegion} hands {@link GridData}. @internal */
export type GridRowManagerRegionResult = {
	/** Body presentation (color + order), or `null` off client grouping. */
	presentation: GridRowGroupPresentation | null
	/** Display-ordered groups the dialog renders. */
	managerGroups: GridRowManagerGroup[]
	recolor: (key: string | number, color: PaletteColor | undefined) => void
	reorderGroups: (orderedKeys: (string | number)[]) => void
	/** The group-header menu resolver, keyed by a group's stringified value. */
	rowGroupMenu: (key: string, header: HTMLElement) => GridMenuResolution | null
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
	/** The groups, or `null` when ungrouped. */
	groups: GridGroup<T>[] | null
	/** Opens or closes a group, by its id. */
	toggleGroup: (id: string) => void
	/** Whether the header context menu is live — the manager's only entry point. */
	contextMenuActive: boolean
	/** Commits an engine expansion change (backs Expand all / Collapse all). */
	setGroupExpanded: (next: GroupExpansion) => void
}

/**
 * The full row-manager wiring for {@link GridData}. It resolves the overlay
 * (see {@link useGridRowManager}), and owns the dialog's open state. It builds
 * the group-header menu resolver, keyed by the group's stringified value. That
 * resolver opens the manager, and drives the per-group / all-group expand
 * toggles and the clear-color shortcut. Returns `null`-safe values off client grouping so the
 * grid stands the whole feature down. Split out of {@link GridData} to keep its
 * body within the cognitive-complexity budget.
 *
 * @internal
 */
export function useGridRowManagerRegion<T>({
	groupByConfig,
	groupingActive,
	groups,
	toggleGroup,
	contextMenuActive,
	setGroupExpanded,
}: GridRowManagerRegionOptions<T>): GridRowManagerRegionResult {
	const enabled = groupingActive && (groupByConfig?.rowManager ?? true)

	const naturalGroups = useMemo(() => buildRowManagerGroups(groups), [groups])

	const manager = useGridRowManager({ config: groupByConfig?.rowGroups, naturalGroups })

	const [open, setOpen] = useState(false)

	// The control that takes focus back when the dialog closes: the toggle of the
	// header whose menu opened it. The menu item that opened the dialog is gone
	// by then.
	const returnRef = useRef<HTMLElement | null>(null)

	const openFrom = useStableEvent((header: HTMLElement) => {
		returnRef.current = header.querySelector<HTMLElement>('button')

		setOpen(true)
	})

	useEffect(() => {
		const target = returnRef.current

		if (open || !target) return

		returnRef.current = null

		if (target.isConnected) target.focus()
	}, [open])

	// Reached only through the group-header menu, so it needs the context menu live.
	const reachable = enabled && contextMenuActive

	// Group lookup (by text key) for the menu's per-group expand toggle.
	const groupByKey = useMemo(
		() => new Map((groups ?? []).map((group) => [group.key, group])),
		[groups],
	)

	const { color } = manager.presentation

	const { recolor } = manager

	const rowGroupMenu = useCallback(
		(key: string, header: HTMLElement): GridMenuResolution | null => {
			if (!reachable) return null

			const group = groupByKey.get(key)

			const items = buildRowGroupMenu({
				expanded: group?.expanded ?? false,
				color: color(key),
				manageLabel: 'Manage rows',
				onManage: () => openFrom(header),
				onToggle: () => {
					if (group) toggleGroup(group.id)
				},
				onExpandAll: () => setGroupExpanded(ALL_GROUPS_OPEN),
				onCollapseAll: () => setGroupExpanded(ALL_GROUPS_CLOSED),
				onClearColor: () => recolor(key, undefined),
			})

			return { items, name: `${groupValueLabel(group ? group.value : key)} group menu` }
		},
		[reachable, groupByKey, color, recolor, toggleGroup, setGroupExpanded, openFrom],
	)

	return {
		/** Body presentation (color + order), or `null` off client grouping. */
		presentation: groupingActive ? manager.presentation : null,
		/** Display-ordered groups the dialog renders. */
		managerGroups: manager.managerGroups,
		recolor: manager.recolor,
		reorderGroups: manager.reorderGroups,
		/** The group-header menu resolver, keyed by a group's text key, with its header row. */
		rowGroupMenu,
		/** Whether the "Manage rows" dialog is reachable (mount it when true). */
		reachable,
		open,
		setOpen,
	}
}
