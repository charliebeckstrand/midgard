'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Ban, GripVertical } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Card, CardHeader } from '../../components/card'
import { Icon } from '../../components/icon'
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
import { restrictToParentElement, restrictToVerticalAxis } from './grid-reorder'
import type { GridRowManagerGroup } from './use-grid-row-manager'

/** Locks the group drag to the y-axis and bounds it to the list, so a zone can't be dragged off either end. @internal */
const GROUP_DRAG_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement]

/** The palette presets offered by the color Menu: standard palette then extended. @internal */
const DEFAULT_COLOR_OPTIONS: PaletteColor[] = [...colors, ...extendedColors]

/** Capitalizes a palette color name for display (`violet` → `Violet`). @internal */
function colorLabel(color: PaletteColor): string {
	return color.charAt(0).toUpperCase() + color.slice(1)
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
	/** Sets (or clears with `undefined`) a group's color. */
	onRecolor: (key: string | number, color: PaletteColor | undefined) => void
	/** Commits the next group order (by key) after a group drag. */
	onReorderGroups: (orderedKeys: (string | number)[]) => void
	/** Palette presets for the color Menu; defaults to the full standard + extended palette. */
	colorOptions?: PaletteColor[]
	className?: string
}

/**
 * The row manager's editor: a zone per row-group — a reorder grip, the group's
 * label + row count, and a color {@link Menu}. Whole groups reorder as a vertical
 * list (the grip beside each label, or its keyboard lift), the drag locked to the
 * y-axis and bounded to the list. A colored group outlines its whole Card in its
 * hue. Rows within a group are not managed — they follow the grid's order. Every
 * edit commits through the handlers, which write the {@link GridGroupBy.rowGroups}
 * overlay.
 *
 * @remarks Client component. {@link Grid} renders this inside its own dialog,
 * reached from the group-header "Manage rows" context-menu item; use it directly
 * to host the editor elsewhere.
 */
export function GridRowManager({
	groups,
	onRecolor,
	onReorderGroups,
	colorOptions = DEFAULT_COLOR_OPTIONS,
	className,
}: GridRowManagerProps) {
	const { itemIds, strategy, activeId, dndContextProps } = useSortableList({
		items: groups,
		getKey: (group) => String(group.key),
		onReorder: (next) => onReorderGroups(next.map((group) => group.key)),
	})

	// Force the grabbing cursor across the document for the whole group drag — it
	// sorts in place with no overlay, so mid-drag the pointer is over a reflowing
	// sibling zone or the dialog, not the dragged card.
	useGrabbingCursor(activeId != null)

	return (
		<div data-slot="grid-row-manager" className={cn(k.root, className)}>
			<DndContext {...dndContextProps} modifiers={GROUP_DRAG_MODIFIERS}>
				<SortableContext items={itemIds} strategy={strategy}>
					{groups.map((group) => (
						<GridRowManagerZone
							key={group.key}
							group={group}
							onRecolor={onRecolor}
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
	onRecolor: (key: string | number, color: PaletteColor | undefined) => void
	colorOptions: PaletteColor[]
}

/**
 * One group zone: a Card (outlined in the group's color) whose header carries the
 * reorder grip, the group label + count, and the color Menu (pushed to the
 * trailing edge).
 *
 * @internal
 */
function GridRowManagerZone({ group, onRecolor, colorOptions }: GridRowManagerZoneProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useZoneSortable(String(group.key))

	const label = groupLabelText(group)

	return (
		<div ref={setNodeRef} style={style} data-dragging={dataAttr(dragging)}>
			<Card className={cn(group.color && groupK.cardOutline[group.color])}>
				<CardHeader>
					<div className={cn(k.zone.header)}>
						<button
							type="button"
							ref={setActivatorNodeRef}
							className={cn(k.zone.grip)}
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
				{/* Clear the color — offered only once the group has one to clear. */}
				{color !== undefined && (
					<MenuItem onAction={() => onRecolor(undefined)}>
						<Icon icon={<Ban />} />
						<MenuLabel>None</MenuLabel>
					</MenuItem>
				)}
				{color !== undefined && <MenuSeparator />}
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
