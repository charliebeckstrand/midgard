'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { ArrowUpDown } from 'lucide-react'
import { useCallback } from 'react'
import { Card } from '../../components/card'
import { IconButton } from '../../components/icon-button'
import { Menu } from '../../components/menu'
import { dataAttr } from '../../core/data-attr'
import type { PaletteColor } from '../../core/recipe/colors'
import { restrictToVerticalAxis, useSortableList } from '../../hooks/use-sortable-list'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import { useIntl } from '../../primitives/intl/use-intl'
import { k as groupK } from '../../recipes/kata/grid-group'
import { k } from '../../recipes/kata/grid-row-manager'
import { columnLabel } from './engine/grid-column/label'
import { gridMessages } from './engine/grid-messages'
import { restrictToParentElement } from './engine/grid-reorder-compute'
import type { GridItemMoves } from './engine/grid-reorder-move'
import { DEFAULT_COLOR_OPTIONS, GridManagerColorMenu } from './grid-manager-color-menu'
import { GridManagerGrip } from './grid-manager-grip'
import { GridManagerMoveMenu } from './grid-manager-move-menu'
import type { GridRowManagerGroup } from './grid-row-group-types'
import { useGridItemMoves } from './use-grid-item-moves'
import { useGridZoneSortable } from './use-grid-zone-sortable'

/** Locks the group drag to the y-axis and bounds it to the list, so a zone can't be dragged off either end. @internal */
const GROUP_DRAG_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement]

/** The drag key of a group. @internal */
const groupKey = (group: GridRowManagerGroup) => String(group.key)

/** Props for {@link GridRowManager}. @internal */
export type GridRowManagerProps = {
	/** The row groups in display order, one entry per group. */
	groups: GridRowManagerGroup[]
	/** Sets (or clears with `undefined`) a group's color. */
	onRecolor: (key: string | number, color: PaletteColor | undefined) => void
	/** Commits the next group order (by key) after a group drag. */
	onReorderGroups: (orderedKeys: (string | number)[]) => void
}

/**
 * The row manager's editor: a zone per row-group (a reorder grip, the group's
 * label + row count, and a color {@link Menu}). Whole groups reorder as a vertical
 * list, through the grip beside each label or its keyboard lift. The drag is
 * locked to the y-axis and bounded to the list. A move menu beside the color
 * menu gives the same moves with no drag (WCAG 2.5.7). A colored group outlines its whole Card in its
 * hue. Rows within a group are not managed: they follow the grid's order. Every
 * edit commits through the handlers, which write the {@link GridGroupBy.rowGroups}
 * overlay.
 *
 * The color Menu offers the full standard and extended palette
 * ({@link DEFAULT_COLOR_OPTIONS}).
 *
 * @remarks Client component. {@link Grid} renders this inside its own dialog,
 * reached from the group-header "Manage rows" context-menu item. No barrel
 * exports it, so a consumer reaches it only through the grid.
 *
 * @internal
 */
export function GridRowManager({ groups, onRecolor, onReorderGroups }: GridRowManagerProps) {
	const intl = useIntl()

	const commit = useCallback(
		(next: GridRowManagerGroup[]) => onReorderGroups(next.map((group) => group.key)),
		[onReorderGroups],
	)

	const describe = useCallback(
		(group: GridRowManagerGroup) =>
			intl.formatMessage(gridMessages.rowGroupName, {
				group: columnLabel({ id: group.key, title: group.label }),
			}),
		[intl],
	)

	const { itemIds, strategy, dndContextProps } = useSortableList({
		items: groups,
		getKey: groupKey,
		onReorder: commit,
		describe,
	})

	// The menu path of the drag, with the same commit and the same name.
	const moves = useGridItemMoves({ items: groups, getKey: groupKey, commit, describe })

	return (
		<div data-slot="grid-row-manager" className={k().base}>
			<DndContext {...dndContextProps} modifiers={GROUP_DRAG_MODIFIERS}>
				<SortableContext items={itemIds} strategy={strategy}>
					{/* A list, so assistive tech reads the count of the zones and the
					    position of each. The DndContext nodes stay outside it. */}
					<ul className={k().list}>
						{groups.map((group) => (
							<GridRowManagerZone
								key={group.key}
								group={group}
								onRecolor={onRecolor}
								moves={groups.length > 1 ? moves : null}
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
	/** The menu moves of the groups, or `null` when a lone group has no place to go. */
	moves: GridItemMoves | null
}

/**
 * One group zone: a Card outlined in the group's color. Its header carries the
 * reorder grip, the group label + count, and, at the trailing edge, the move
 * menu and the color Menu.
 *
 * @internal
 */
function GridRowManagerZone({ group, onRecolor, moves }: GridRowManagerZoneProps) {
	const intl = useIntl()

	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useGridZoneSortable(String(group.key))

	const label = columnLabel({ id: group.key, title: group.label })

	return (
		<li ref={setNodeRef} style={style} data-dragging={dataAttr(dragging)}>
			{/* Content sits directly in the Card, so its padding is uniform on every
			    edge. A CardHeader would add a bottom gap for a body that isn't here. */}
			<Card className={groupK({ color: group.color }).outline}>
				<div className={k().zone.header}>
					<div className={k().zone.main}>
						<GridManagerGrip
							sortable={{ setActivatorNodeRef, attributes, listeners, dragging }}
							label={intl.formatMessage(gridMessages.groupHandle, { group: label })}
						/>

						<span className={k().zone.label}>{group.label}</span>

						<span className={k().zone.count}>({intl.formatNumber(group.count)})</span>
					</div>

					<div className={k().zone.actions}>
						{moves && (
							<GridManagerMoveMenu itemKey={String(group.key)} moves={moves}>
								<IconButton
									aria-label={intl.formatMessage(reorderMessages.moveHandle, { item: label })}
									icon={ArrowUpDown}
								/>
							</GridManagerMoveMenu>
						)}

						<GridManagerColorMenu
							label={label}
							color={group.color}
							colorOptions={DEFAULT_COLOR_OPTIONS}
							onRecolor={(next) => onRecolor(group.key, next)}
						/>
					</div>
				</div>
			</Card>
		</li>
	)
}
