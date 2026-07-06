'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Ban, GripVertical } from 'lucide-react'
import { type CSSProperties, type ReactNode, useCallback } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Card, CardBody, CardHeader } from '../../components/card'
import { Icon } from '../../components/icon'
import { List, ListItem } from '../../components/list'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSeparator,
	MenuTrigger,
} from '../../components/menu'
import { cn, dataAttr } from '../../core'
import { colors, extendedColors, type PaletteColor } from '../../core/recipe'
import { useGrabbingCursor, useSortableList } from '../../hooks'
import { k as groupK } from '../../recipes/kata/grid-group'
import { k } from '../../recipes/kata/grid-row-manager'
import type { GridRowManagerGroup, GridRowManagerLeaf } from './use-grid-row-manager'

/** The palette presets offered by the color Menu: standard palette then extended. @internal */
const DEFAULT_COLOR_OPTIONS: PaletteColor[] = [...colors, ...extendedColors]

/** Capitalizes a palette color name for display (`violet` → `Violet`). @internal */
function colorLabel(color: PaletteColor): string {
	return color.charAt(0).toUpperCase() + color.slice(1)
}

/** A leaf's display label: its `label` when set, else its key stringified. @internal */
function leafLabel(leaf: GridRowManagerLeaf): string {
	return typeof leaf.label === 'string' ? leaf.label : String(leaf.key)
}

/** A group's textual label for `aria-label`s: its `label` when a string, else its key. @internal */
function groupLabelText(group: GridRowManagerGroup): string {
	return typeof group.label === 'string' ? group.label : String(group.key)
}

/**
 * Registers a group zone as an in-place sortable item so whole groups reorder in
 * one vertical list — the source dims (no {@link DragOverlay}) rather than hides,
 * since a group is a single container dnd-kit can animate in place. The grip beside
 * the group label carries the returned `attributes` / `listeners`.
 *
 * @internal
 */
function useZoneSortable(id: string) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({ id })

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
		zIndex: isDragging ? 1 : undefined,
		position: isDragging ? 'relative' : undefined,
	}

	return { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging: isDragging }
}

/** Props for {@link GridRowManager}. */
export type GridRowManagerProps = {
	/** The grouped rows, in display order — a group per row-group with its leaves. */
	groups: GridRowManagerGroup[]
	/**
	 * Whether reordering may apply. False (a column sort orders the rows itself)
	 * dims the grips and disables the group / leaf drags, leaving only recoloring.
	 */
	orderingPermitted: boolean
	/** Sets (or clears with `undefined`) a group's color. */
	onRecolor: (key: string | number, color: PaletteColor | undefined) => void
	/** Commits the next group order (by key) after a group drag. */
	onReorderGroups: (orderedKeys: (string | number)[]) => void
	/** Commits a group's next leaf order (by key) after a leaf drag. */
	onReorderLeaves: (key: string | number, leafKeys: (string | number)[]) => void
	/** Palette presets for the color Menu; defaults to the full standard + extended palette. */
	colorOptions?: PaletteColor[]
	className?: string
}

/**
 * The row manager's editor: a zone per row-group — a reorder grip, the group's
 * label + count, and a color {@link Menu} — over its leaf rows, which drag to
 * reorder within the group. Whole groups reorder as a vertical list (the grip
 * beside each label). A colored group tints its Card outline. Every edit commits
 * through the handlers, which write the {@link GridGroupBy.rowGroups} overlay.
 *
 * @remarks Client component. {@link Grid} renders this inside its own dialog,
 * reached from the group-header "Manage rows" context-menu item; use it directly
 * to host the editor elsewhere. Group and leaf reordering stand down under an
 * active column sort (`orderingPermitted` false), since a manual order only holds
 * against the natural row order.
 */
export function GridRowManager({
	groups,
	orderingPermitted,
	onRecolor,
	onReorderGroups,
	onReorderLeaves,
	colorOptions = DEFAULT_COLOR_OPTIONS,
	className,
}: GridRowManagerProps) {
	const { itemIds, strategy, activeId, dndContextProps } = useSortableList({
		items: groups,
		getKey: (group) => String(group.key),
		onReorder: (next) => onReorderGroups(next.map((group) => group.key)),
		disabled: !orderingPermitted,
		// The leaf lists own the keyboard reorder within a zone; this outer list
		// keeps its pointer sensor for the whole-group drag.
		keyboardSensor: false,
	})

	// Force the grabbing cursor across the document for the whole group drag — it
	// sorts in place with no overlay, so mid-drag the pointer is over a reflowing
	// sibling zone or the dialog, not the dragged card.
	useGrabbingCursor(activeId != null)

	return (
		<div data-slot="grid-row-manager" className={cn(k.root, className)}>
			<DndContext {...dndContextProps}>
				<SortableContext items={itemIds} strategy={strategy}>
					{groups.map((group) => (
						<GridRowManagerZone
							key={group.key}
							group={group}
							orderingPermitted={orderingPermitted}
							onRecolor={onRecolor}
							onReorderLeaves={onReorderLeaves}
							colorOptions={colorOptions}
						/>
					))}
				</SortableContext>
			</DndContext>
		</div>
	)
}

/** Props for {@link GridRowManagerZone}. @internal */
type GridRowManagerZoneProps = {
	group: GridRowManagerGroup
	orderingPermitted: boolean
	onRecolor: (key: string | number, color: PaletteColor | undefined) => void
	onReorderLeaves: (key: string | number, leafKeys: (string | number)[]) => void
	colorOptions: PaletteColor[]
}

/**
 * One group zone: a Card (outlined in the group's color) whose header carries the
 * reorder grip, the group label + count, and the color Menu, over a
 * {@link List} of its leaf rows. The leaf List runs its own nested `DndContext`,
 * so a leaf drag reorders within the group without disturbing the outer
 * group-reorder sortable.
 *
 * @internal
 */
function GridRowManagerZone({
	group,
	orderingPermitted,
	onRecolor,
	onReorderLeaves,
	colorOptions,
}: GridRowManagerZoneProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useZoneSortable(String(group.key))

	const label = groupLabelText(group)

	const handleReorderLeaves = useCallback(
		(next: GridRowManagerLeaf[]) =>
			onReorderLeaves(
				group.key,
				next.map((leaf) => leaf.key),
			),
		[onReorderLeaves, group.key],
	)

	return (
		<div ref={setNodeRef} style={style} data-dragging={dataAttr(dragging)}>
			<Card className={cn(group.color && groupK.cardOutline[group.color])}>
				<CardHeader>
					<div className={cn(k.zone.header)}>
						<button
							type="button"
							ref={setActivatorNodeRef}
							className={cn(k.zone.grip)}
							disabled={!orderingPermitted}
							aria-label={`Reorder group ${label}`}
							{...attributes}
							{...listeners}
						>
							<Icon icon={<GripVertical />} />
						</button>

						<span className={cn(k.zone.label)}>{group.label}</span>

						<span className={cn(k.zone.count)}>({group.count})</span>

						<GridRowManagerColorMenu
							label={label}
							color={group.color}
							colorOptions={colorOptions}
							onRecolor={(next) => onRecolor(group.key, next)}
						/>
					</div>
				</CardHeader>

				<CardBody>
					{group.leaves.length === 0 ? (
						<span className={cn(k.zone.empty)}>No rows in this group</span>
					) : (
						<List
							items={group.leaves}
							getKey={(leaf) => String(leaf.key)}
							onReorder={handleReorderLeaves}
							disabled={!orderingPermitted}
							variant="plain"
							aria-label={`Reorder rows in ${label}`}
						>
							{(leaf) => (
								<ListItem>
									<span className={cn(k.leaf.label)}>{leaf.label ?? leafLabel(leaf)}</span>
								</ListItem>
							)}
						</List>
					)}
				</CardBody>
			</Card>
		</div>
	)
}

/** Props for {@link GridRowManagerColorMenu}. @internal */
type GridRowManagerColorMenuProps = {
	label: string
	color: PaletteColor | undefined
	colorOptions: PaletteColor[]
	onRecolor: (color: PaletteColor | undefined) => void
}

/** The group's color Menu: a "None" item to clear plus a Badge-swatch per palette color. @internal */
function GridRowManagerColorMenu({
	label,
	color,
	colorOptions,
	onRecolor,
}: GridRowManagerColorMenuProps): ReactNode {
	return (
		<Menu
			aria-label={`Color menu for ${label}`}
			placement="bottom-end"
			className={cn(k.zone.color)}
		>
			<MenuTrigger>
				<Button color={color} variant="soft" aria-label={`Color for ${label}`}>
					{color ? colorLabel(color) : 'Color'}
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem onAction={() => onRecolor(undefined)} disabled={color === undefined}>
					<Icon icon={<Ban />} />
					<MenuLabel>None</MenuLabel>
				</MenuItem>
				<MenuSeparator />
				{colorOptions.map((option) => (
					<MenuItem key={option} onAction={() => onRecolor(option)}>
						<Badge color={option} variant="soft">
							{colorLabel(option)}
						</Badge>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	)
}
