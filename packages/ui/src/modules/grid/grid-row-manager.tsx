'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import { Card } from '../../components/card'
import { Icon } from '../../components/icon'
import { Menu } from '../../components/menu'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { useGrabbingCursor, useSortableList } from '../../hooks'
import { k as groupK } from '../../recipes/kata/grid-group'
import { k } from '../../recipes/kata/grid-row-manager'
import { columnLabel } from './engine/grid-column/label'
import { DEFAULT_COLOR_OPTIONS, GridManagerColorMenu } from './grid-manager-color-menu'
import { restrictToParentElement, restrictToVerticalAxis } from './grid-reorder'
import type { GridRowManagerGroup } from './use-grid-row-manager'
import { useGridZoneSortable } from './use-grid-zone-sortable'

/** Locks the group drag to the y-axis and bounds it to the list, so a zone can't be dragged off either end. @internal */
const GROUP_DRAG_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement]

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
		useGridZoneSortable(String(group.key))

	const label = columnLabel({ id: group.key, title: group.label })

	return (
		<div ref={setNodeRef} style={style} data-dragging={dataAttr(dragging)}>
			{/* Content sits directly in the Card so its padding is uniform on every
			    edge — a CardHeader would add a bottom gap for a body that isn't here. */}
			<Card className={cn(group.color && groupK.cardOutline[group.color])}>
				<div className={cn(k.zone.header)}>
					<div className={cn(k.zone.main)}>
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
					</div>

					<GridManagerColorMenu
						label={label}
						color={group.color}
						colorOptions={colorOptions}
						onRecolor={(next) => onRecolor(group.key, next)}
						className={cn(k.zone.color)}
					/>
				</div>
			</Card>
		</div>
	)
}
