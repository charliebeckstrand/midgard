'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { Card } from '../../components/card'
import { Menu } from '../../components/menu'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { restrictToVerticalAxis, useSortableList } from '../../hooks/use-sortable-list'
import { k as groupK } from '../../recipes/kata/grid-group'
import { k } from '../../recipes/kata/grid-row-manager'
import { columnLabel } from './engine/grid-column/label'
import { restrictToParentElement } from './engine/grid-reorder-compute'
import { DEFAULT_COLOR_OPTIONS, GridManagerColorMenu } from './grid-manager-color-menu'
import { GridManagerGrip } from './grid-manager-grip'
import type { GridRowManagerGroup } from './grid-row-group-types'
import { useGridZoneSortable } from './use-grid-zone-sortable'

/** Locks the group drag to the y-axis and bounds it to the list, so a zone can't be dragged off either end. @internal */
const GROUP_DRAG_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement]

/** Props for {@link GridRowManager}. */
export type GridRowManagerProps = {
	/** The row groups in display order, one entry per group. */
	groups: GridRowManagerGroup[]
	/** Sets (or clears with `undefined`) a group's color. */
	onRecolor: (key: string | number, color: PaletteColor | undefined) => void
	/** Commits the next group order (by key) after a group drag. */
	onReorderGroups: (orderedKeys: (string | number)[]) => void
	/**
	 * Palette presets for the color Menu. The default is the full standard and
	 * extended palette.
	 * @defaultValue {@link DEFAULT_COLOR_OPTIONS}
	 */
	colorOptions?: PaletteColor[]
	className?: string
}

/**
 * The row manager's editor: a zone per row-group — a reorder grip, the group's
 * label + row count, and a color {@link Menu}. Whole groups reorder as a vertical
 * list, through the grip beside each label or its keyboard lift. The drag is
 * locked to the y-axis and bounded to the list. A colored group outlines its whole Card in its
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
	const { itemIds, strategy, dndContextProps } = useSortableList({
		items: groups,
		getKey: (group) => String(group.key),
		onReorder: (next) => onReorderGroups(next.map((group) => group.key)),
		describe: (group) => `group ${columnLabel({ id: group.key, title: group.label })}`,
	})

	return (
		<div data-slot="grid-row-manager" className={cn(k.base, className)}>
			<DndContext {...dndContextProps} modifiers={GROUP_DRAG_MODIFIERS}>
				<SortableContext items={itemIds} strategy={strategy}>
					{/* A list, so assistive tech reads the count of the zones and the
					    position of each. The DndContext nodes stay outside it. */}
					<ul className={cn(k.list)}>
						{groups.map((group) => (
							<GridRowManagerZone
								key={group.key}
								group={group}
								onRecolor={onRecolor}
								colorOptions={colorOptions}
							/>
						))}
					</ul>
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
 * One group zone: a Card outlined in the group's color. Its header carries the
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
		<li ref={setNodeRef} style={style} data-dragging={dataAttr(dragging)}>
			{/* Content sits directly in the Card, so its padding is uniform on every
			    edge. A CardHeader would add a bottom gap for a body that isn't here. */}
			<Card className={cn(group.color && groupK.outline[group.color])}>
				<div className={cn(k.zone.header)}>
					<div className={cn(k.zone.main)}>
						<GridManagerGrip
							sortable={{ setActivatorNodeRef, attributes, listeners, dragging }}
							label={`Reorder group ${label}`}
						/>

						<span className={cn(k.zone.label)}>{group.label}</span>

						<span className={cn(k.zone.count)}>({group.count})</span>
					</div>

					<GridManagerColorMenu
						label={label}
						color={group.color}
						colorOptions={colorOptions}
						onRecolor={(next) => onRecolor(group.key, next)}
					/>
				</div>
			</Card>
		</li>
	)
}
