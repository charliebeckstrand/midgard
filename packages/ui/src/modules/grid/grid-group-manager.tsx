'use client'

import {
	type Announcements,
	type CollisionDetection,
	closestCenter,
	closestCorners,
	DndContext,
	type DroppableContainer,
	type KeyboardCoordinateGetter,
	MeasuringStrategy,
	type UniqueIdentifier,
	useDroppable,
} from '@dnd-kit/core'
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { EllipsisVertical, Plus, Trash2 } from 'lucide-react'
import { memo, type ReactNode, use, useId, useMemo } from 'react'
import { Button } from '../../components/button'
import { Card, CardBody, CardHeader } from '../../components/card'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { cn, createContext, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { useDragCursor, useSortableItem, useSortableSensors } from '../../hooks'
import { useStableValue } from '../../hooks/use-stable-value'
import { PortalDragOverlay } from '../../primitives/portal/portal-drag-overlay'
import { k } from '../../recipes/kata/grid-group'
import { sameElements } from '../../utilities'
import { columnLabel } from './engine/grid-column/label'
import {
	findZoneId,
	GROUP_PREFIX,
	type GridGroupManagerZone,
	groupIdFromDragId,
	isGroupDragId,
	UNGROUPED,
	type ZoneMap,
	zoneDropId,
} from './engine/grid-zone/map'
import type { GridColumnGroup } from './grid-group-types'
import { GridManagerCheckboxRow } from './grid-manager-checkbox-row'
import { GridManagerColorMenu } from './grid-manager-color-menu'
import { GridManagerGrip } from './grid-manager-grip'
import type { GridColumnManagerItem } from './types'
import { useGridGroupManager } from './use-grid-group-manager'
import { useGridZoneSortable } from './use-grid-zone-sortable'

/**
 * Whether droppable `containerId` belongs to the same sortable as the active
 * drag `activeId`: both group ids, or both zone/column ids. The partition that
 * keeps a group drag away from column slots and vice versa — shared by
 * {@link groupAwareCollision} (pointer) and {@link groupAwareKeyboardCoordinates}
 * (keyboard).
 *
 * @internal
 */
function isSameDragKind(activeId: string, containerId: string): boolean {
	return isGroupDragId(activeId) === isGroupDragId(containerId)
}

/**
 * Collision detection that keeps the two sortables apart. A group drag only
 * considers group droppables, and a column drag only the zone/column droppables.
 * A dragged group therefore never targets a column slot, and vice versa. Group reorder uses
 * `closestCenter` (a plain vertical list); column moves use `closestCorners`,
 * which resolves empty zones (see the multi-container notes in `useGridGroupManager`).
 *
 * @internal
 */
const groupAwareCollision: CollisionDetection = (args) => {
	const activeId = String(args.active.id)

	const droppableContainers = args.droppableContainers.filter((container) =>
		isSameDragKind(activeId, String(container.id)),
	)

	return (isGroupDragId(activeId) ? closestCenter : closestCorners)({
		...args,
		droppableContainers,
	})
}

/**
 * Keyboard coordinate getter that scopes arrow-key reordering to the active
 * drag's own sortable — the keyboard analogue of {@link groupAwareCollision}.
 * The `sortableKeyboardCoordinates` weighs every droppable in the context. The
 * group and column droppables share one `DndContext`. A lifted group's first
 * arrow press therefore lands on an intervening column row or zone, rather than
 * the next group. The group-only `groupAwareCollision` then reads no change, and
 * the reorder stalls until a second press. Restricting the candidate droppables to
 * the active drag's kind steps straight to the next group (or column) on the
 * first press.
 *
 * @internal
 */
export const groupAwareKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
	const activeId = String(args.active)

	const { droppableContainers } = args.context

	// Rebuild the same map class holding only same-kind droppables, so the getter
	// (which reads `.getEnabled()` and `.get()`) sees a genuine map with its
	// candidates already scoped — no group/column cross-targeting.
	const Scoped = droppableContainers.constructor as new (
		entries: Iterable<[UniqueIdentifier, DroppableContainer]>,
	) => typeof droppableContainers

	const scoped = new Scoped(
		[...droppableContainers].filter(([id]) => isSameDragKind(activeId, String(id))),
	)

	return sortableKeyboardCoordinates(event, {
		...args,
		context: { ...args.context, droppableContainers: scoped },
	})
}

/**
 * The groups of the editor, for the "Move to" items of a column row. A row
 * reads them only while its menu is open, so a rename renders no closed row.
 *
 * @internal
 */
const [GroupManagerGroupsContext] = createContext<GridColumnGroup[]>('GridGroupManagerGroups', {
	default: [],
})

/** Props for {@link GridGroupManager}. @internal */
export type GridGroupManagerProps = {
	groups: GridColumnGroup[]
	onGroupsChange: (groups: GridColumnGroup[]) => void
	/** Orderable (non-frozen) data columns, in display order. */
	columns: GridColumnManagerItem[]
	/**
	 * Whether a column passes the manager's filter — the whole set when no query is
	 * typed. Resolved here to the ids that pass, which is all a zone needs. It
	 * renders the members it holds among them, and keeps its full membership behind
	 * them. The zone map is also what commits group membership on drop.
	 */
	matches: (item: GridColumnManagerItem) => boolean
	/** The user-hidden set; a row's checkbox reflects and toggles it. */
	hidden: Set<string | number>
	onToggle: (id: string | number) => void
	/** Current column order; a within-ungrouped drag reorders it. */
	order: (string | number)[]
	/** Commits the next column order after a within-ungrouped reorder. */
	onOrderChange: (order: (string | number)[]) => void
}

/**
 * The dnd-kit announcements of the group editor. Each names the column or the group, and the
 * zone or the position it lands in, never the generated id that dnd-kit reads by default.
 *
 * @param groups - The groups in their order.
 * @param columnsById - The columns by their stringified id.
 * @param zoneMap - The live zone map, which says the zone that holds each column.
 * @internal
 */
export function groupManagerAnnouncements(
	groups: readonly GridColumnGroup[],
	columnsById: ReadonlyMap<string, GridColumnManagerItem>,
	zoneMap: ZoneMap,
): Announcements {
	const groupIndex = (id: string) => groups.findIndex((g) => String(g.id) === id)

	const groupName = (id: string) => {
		const group = groups[groupIndex(id)]

		return `${group ? columnLabel(group) : id} group`
	}

	const name = (id: UniqueIdentifier) => {
		const key = String(id)

		if (isGroupDragId(key)) return groupName(groupIdFromDragId(key))

		const column = columnsById.get(key)

		return `${column ? columnLabel(column) : key} column`
	}

	// A column lands in a zone. A group lands at a position in the group list.
	const place = (active: UniqueIdentifier, over: UniqueIdentifier) => {
		const key = String(over)

		if (isGroupDragId(String(active))) {
			return `position ${groupIndex(groupIdFromDragId(key)) + 1} of ${groups.length}`
		}

		const zone = findZoneId(zoneMap, key)

		if (zone === undefined) return 'the editor'

		return zone === UNGROUPED ? 'Ungrouped' : groupName(zone)
	}

	return {
		onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
		onDragOver: ({ active, over }) =>
			over ? `${name(active.id)} is over ${place(active.id, over.id)}.` : undefined,
		onDragEnd: ({ active, over }) =>
			over
				? `Dropped ${name(active.id)} in ${place(active.id, over.id)}.`
				: `Dropped ${name(active.id)} where it started.`,
		onDragCancel: ({ active }) => `Returned ${name(active.id)} to where it started.`,
	}
}

/**
 * The column-manager's group editor: a "New group" button, a zone per group, and
 * an ungrouped pool. Each zone carries a name {@link Input}, a color
 * {@link Menu}, a remove button, and its member columns. Columns drag between zones (pointer or
 * keyboard) to change membership; each row also carries a "Move to" menu as an
 * accessible alternative to the drag. Group edits commit through
 * `onGroupsChange`; visibility stays on the shared hidden set. Under the
 * manager's filter each zone renders only its matching members, holding the rest
 * in place (see `matches`).
 *
 * @internal
 */
export function GridGroupManager({
	groups,
	onGroupsChange,
	columns,
	matches,
	hidden,
	onToggle,
	order,
	onOrderChange,
}: GridGroupManagerProps) {
	const mgr = useGridGroupManager({ groups, onGroupsChange, columns, order, onOrderChange })

	const sensors = useSortableSensors({ keyboardCoordinateGetter: groupAwareKeyboardCoordinates })

	// An id from `useId`, so the server and the browser agree on the id of the
	// drag description. dnd-kit makes it from a shared counter without one.
	const dndId = useId()

	// dnd-kit sets no cursor, so the element under the pointer sets it. The rule
	// holds the closed hand on the whole page until the drop or the cancel.
	useDragCursor(mgr.activeId != null)

	// String-keyed lookup so a zone (whose live ids are stringified) and the drag
	// overlay can resolve a column id back to its manager item.
	const byId = useMemo(() => new Map(columns.map((c) => [String(c.id), c])), [columns])

	// The filter resolved once, to the ids that pass it — so each zone selects its
	// rows by lookup rather than re-running the predicate over its own members, and
	// only this level knows a filter is in play.
	const visibleColumnIds = useMemo(
		() => new Set(columns.filter(matches).map((c) => String(c.id))),
		[columns, matches],
	)

	const activeItem = mgr.activeId ? byId.get(mgr.activeId) : undefined

	// The group zones (sortable) and the fixed ungrouped pool that leads them.
	const groupZones = mgr.zones.filter((zone) => zone.group)

	const ungroupedZone = mgr.zones.find((zone) => !zone.group)

	// A rename gives a new list of the same group ids. The held list keeps the
	// value of the group sortable, so the rows under it do not render.
	const groupSortIds = useStableValue(
		groupZones.map((zone) => `${GROUP_PREFIX}${zone.id}`),
		sameElements,
	)

	const shared = {
		byId,
		visibleColumnIds,
		groups,
		hidden,
		onToggle,
		renameGroup: mgr.renameGroup,
		recolorGroup: mgr.recolorGroup,
		removeGroup: mgr.removeGroup,
		assign: mgr.assign,
	}

	const announcements = useMemo(
		() => groupManagerAnnouncements(groups, byId, mgr.zoneMap),
		[groups, byId, mgr.zoneMap],
	)

	return (
		<GroupManagerGroupsContext value={groups}>
			<DndContext
				id={dndId}
				accessibility={{ announcements }}
				sensors={sensors}
				collisionDetection={groupAwareCollision}
				measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
				onDragStart={mgr.handleDragStart}
				onDragOver={mgr.handleDragOver}
				onDragEnd={mgr.handleDragEnd}
				onDragCancel={mgr.handleDragCancel}
			>
				<div className={cn(k.manager.base)}>
					{ungroupedZone && (
						<GridGroupManagerZoneView
							zone={ungroupedZone}
							columnIds={mgr.zoneMap[UNGROUPED] ?? []}
							{...shared}
						/>
					)}

					{/* Groups reorder as a vertical list, dragged by the handle beside each
					    name; the grid's group order follows this order. */}
					<SortableContext items={groupSortIds} strategy={verticalListSortingStrategy}>
						{/* A list, so assistive tech reads the count of the groups. With no
						    group, no empty list adds a gap to the stack. */}
						{groupZones.length > 0 && (
							<ul className={cn(k.manager.groups)}>
								{groupZones.map((zone) => (
									<GridGroupManagerGroupZone
										key={zone.id}
										zone={zone}
										columnIds={mgr.zoneMap[String(zone.id)] ?? []}
										{...shared}
									/>
								))}
							</ul>
						)}
					</SortableContext>

					<Button type="button" variant="soft" onClick={mgr.addGroup} className="self-start">
						<Icon icon={<Plus />} />
						New group
					</Button>
				</div>

				{/* The dragged row's stand-in: a full, inert clone of the grip, disabled
				    checkbox, and label. The source row can therefore hide while dragging,
				    without the checkbox appearing to vanish. Mounted always; child gated on drag. */}
				<PortalDragOverlay>
					{activeItem ? (
						<GridGroupManagerColumnRowOverlay
							item={activeItem}
							checked={!hidden.has(activeItem.id)}
						/>
					) : null}
				</PortalDragOverlay>
			</DndContext>
		</GroupManagerGroupsContext>
	)
}

/** Props for {@link GridGroupManagerZoneView}. @internal */
type GridGroupManagerZoneViewProps = {
	zone: GridGroupManagerZone
	/** The zone's live member ids (stringified), from the drag-aware zone map. */
	columnIds: string[]
	/** Shared id → item lookup (string-keyed to match the live ids). */
	byId: Map<string, GridColumnManagerItem>
	/** Ids passing the manager's filter; the zone renders the members it holds among them. */
	visibleColumnIds: Set<string>
	groups: GridColumnGroup[]
	hidden: Set<string | number>
	onToggle: (id: string | number) => void
	renameGroup: (id: string | number, title: string) => void
	recolorGroup: (id: string | number, color: PaletteColor | undefined) => void
	removeGroup: (id: string | number) => void
	assign: (columnId: string | number, groupId: string | number | null) => void
	/** The group-reorder drag handle, placed ahead of the name Input; absent on the ungrouped pool. */
	handle?: ReactNode
}

/**
 * A group zone wrapped as a sortable item: the group reorders as a unit, dragged
 * by the handle beside its name. Sorts in place (one vertical list), so it dims
 * rather than hides while dragging.
 *
 * @internal
 */
function GridGroupManagerGroupZone(props: GridGroupManagerZoneViewProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useGridZoneSortable(`${GROUP_PREFIX}${props.zone.id}`)

	const handle = (
		<GridManagerGrip
			sortable={{ setActivatorNodeRef, attributes, listeners, dragging }}
			label={`Reorder group ${props.zone.group ? columnLabel(props.zone.group) : ''}`}
		/>
	)

	return (
		<li ref={setNodeRef} style={style} data-dragging={dataAttr(dragging)}>
			<GridGroupManagerZoneView {...props} handle={handle} />
		</li>
	)
}

/** One droppable zone: a group (with its config header) or the ungrouped pool, holding its column rows. @internal */
function GridGroupManagerZoneView({
	zone,
	columnIds,
	byId,
	visibleColumnIds,
	groups,
	hidden,
	onToggle,
	renameGroup,
	recolorGroup,
	removeGroup,
	assign,
	handle,
}: GridGroupManagerZoneViewProps) {
	const { setNodeRef } = useDroppable({ id: zoneDropId(zone.id) })

	// The zone's matching members — all of them with no query typed. Both the render
	// and the sortable run off these, so a drag animates over the rows on screen;
	// `columnIds` stays whole behind them, which is what a drop commits from.
	const filteredIds = useMemo(
		() => columnIds.filter((id) => visibleColumnIds.has(id)),
		[columnIds, visibleColumnIds],
	)

	// A rename gives each zone a new list of the same ids. The held list keeps the
	// sortable context of the zone, so the context renders no row.
	const visibleIds = useStableValue(filteredIds, sameElements)

	// Colors already taken by other groups — offered disabled, so a color maps to
	// at most one group. Memoized so a drag/hover re-render doesn't rescan every
	// group in every zone.
	const usedColors = useMemo(
		() => new Set(groups.flatMap((g) => (g.id === zone.group?.id ? [] : (g.color ?? [])))),
		[groups, zone.group?.id],
	)

	return (
		<Card
			ref={setNodeRef}
			// A colored group tints its Card outline to match; the ungrouped pool and
			// colorless groups keep the default neutral outline.
			className={cn(k.manager.zone.base, zone.group?.color && k.outline[zone.group.color])}
		>
			<CardHeader>
				{zone.group ? (
					<GridGroupManagerZoneHeader
						group={zone.group}
						handle={handle}
						usedColors={usedColors}
						renameGroup={renameGroup}
						recolorGroup={recolorGroup}
						removeGroup={removeGroup}
					/>
				) : (
					'Ungrouped'
				)}
			</CardHeader>

			<CardBody>
				{visibleIds.length === 0 ? (
					// A zone whose members are all filtered out reads as a search result, not
					// as an empty group — it still holds the columns it holds. An `output`
					// (implicit `role="status"`) so emptying one zone is announced even while
					// the rest of the editor still has matches.
					<output className={cn(k.manager.zone.empty)}>
						{columnIds.length > 0
							? 'No results'
							: zone.group
								? 'No columns in this group'
								: 'No ungrouped columns'}
					</output>
				) : (
					<SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
						<ul>
							{visibleIds.map((id) => {
								const item = byId.get(id)

								if (!item) return null

								return (
									<GridGroupManagerColumnRow
										key={id}
										item={item}
										zoneId={zone.id}
										movable={groups.length > 0}
										hidden={hidden}
										onToggle={onToggle}
										assign={assign}
									/>
								)
							})}
						</ul>
					</SortableContext>
				)}
			</CardBody>
		</Card>
	)
}

/** Props for {@link GridGroupManagerZoneHeader}. @internal */
type GridGroupManagerZoneHeaderProps = {
	group: GridColumnGroup
	/** The group-reorder drag handle, rendered leading the name Input. */
	handle?: ReactNode
	/** Colors already used by other groups; offered disabled so each maps to one group. */
	usedColors: Set<PaletteColor>
	renameGroup: (id: string | number, title: string) => void
	recolorGroup: (id: string | number, color: PaletteColor | undefined) => void
	removeGroup: (id: string | number) => void
}

/** A group zone's config header: the reorder handle, name Input, color Menu, and remove button. @internal */
function GridGroupManagerZoneHeader({
	group,
	handle,
	usedColors,
	renameGroup,
	recolorGroup,
	removeGroup,
}: GridGroupManagerZoneHeaderProps) {
	const label = columnLabel(group)

	return (
		<div className={cn(k.manager.zone.header)}>
			{handle}

			<Input
				className={cn(k.manager.zone.name)}
				aria-label={`Group name for ${label}`}
				placeholder="Group name"
				value={typeof group.title === 'string' ? group.title : ''}
				onChange={(event) => renameGroup(group.id, event.target.value)}
			/>

			<GridManagerColorMenu
				label={label}
				color={group.color}
				usedColors={usedColors}
				onRecolor={(color) => recolorGroup(group.id, color)}
			/>

			<Button
				type="button"
				variant="bare"
				color="red"
				aria-label={`Remove group ${label}`}
				onClick={() => removeGroup(group.id)}
			>
				<Icon icon={<Trash2 />} />
			</Button>
		</div>
	)
}

/** Props for {@link GridGroupManagerColumnRow}. @internal */
type GridGroupManagerColumnRowProps = {
	item: GridColumnManagerItem
	zoneId: string | number
	/** Whether a group exists to move the column into or out of. */
	movable: boolean
	hidden: Set<string | number>
	onToggle: (id: string | number) => void
	assign: (columnId: string | number, groupId: string | number | null) => void
}

/**
 * One column row inside a zone: drag grip, visibility checkbox, and a "Move to"
 * menu. The row is memoized, and its props keep their identity through a
 * rename, so a rename renders no row.
 *
 * @internal
 */
const GridGroupManagerColumnRow = memo(function GridGroupManagerColumnRow({
	item,
	zoneId,
	movable,
	hidden,
	onToggle,
	assign,
}: GridGroupManagerColumnRowProps) {
	// The shared sortable hides the source row (`opacity: 0`) while it drags, and
	// the editor's `<DragOverlay>` stands in, as in List and Kanban.
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useSortableItem({ id: String(item.id) })

	const label = columnLabel(item)

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={cn(k.manager.row.base)}
			data-dragging={dataAttr(dragging)}
		>
			<GridManagerGrip
				sortable={{ setActivatorNodeRef, attributes, listeners, dragging }}
				label={`Reorder ${label}`}
			/>

			<GridManagerCheckboxRow
				className={cn(k.manager.row.control)}
				columnTitle={item.title}
				checked={!hidden.has(item.id)}
				// Held disabled through a drag so it stays put (visible, not toggled)
				// rather than hiding the row and snapping on drop.
				disabled={dragging || item.hideable === false}
				onChange={() => onToggle(item.id)}
				aria-label={`Show ${label}`}
			/>

			{/* The "Move to" menu only means something once a group exists to move into,
			    or out of. With no groups it would open empty, so it's withheld. */}
			{movable && (
				<Menu placement="bottom-end">
					<MenuTrigger>
						<Button type="button" variant="bare" aria-label={`Move ${label}`}>
							<Icon icon={<EllipsisVertical />} />
						</Button>
					</MenuTrigger>
					<MenuContent>
						<GridGroupManagerMoveItems columnId={item.id} zoneId={zoneId} assign={assign} />
					</MenuContent>
				</Menu>
			)}
		</li>
	)
})

/** Props for {@link GridGroupManagerMoveItems}. @internal */
type GridGroupManagerMoveItemsProps = {
	columnId: string | number
	zoneId: string | number
	assign: (columnId: string | number, groupId: string | number | null) => void
}

/**
 * The items of the "Move to" menu of a column row: one for each other group,
 * and a remove item for a column in a group. The menu mounts them only while
 * it is open, so they read the groups from the context of the editor.
 *
 * @internal
 */
function GridGroupManagerMoveItems({ columnId, zoneId, assign }: GridGroupManagerMoveItemsProps) {
	const groups = use(GroupManagerGroupsContext)

	return (
		<>
			{groups
				.filter((group) => group.id !== zoneId)
				.map((group) => (
					<MenuItem key={group.id} onAction={() => assign(columnId, group.id)}>
						<MenuLabel>Move to {columnLabel(group)}</MenuLabel>
					</MenuItem>
				))}
			{zoneId !== UNGROUPED && (
				<MenuItem onAction={() => assign(columnId, null)}>
					<MenuLabel>Remove from group</MenuLabel>
				</MenuItem>
			)}
		</>
	)
}

/**
 * Presentational clone of a column row for the {@link PortalDragOverlay}: the grip, a
 * disabled visibility checkbox, and the label. It carries no sortable refs, no
 * move menu, and no handlers. It stands in for the source row (which hides while dragging) so
 * the dragged item, checkbox and all, tracks the pointer without vanishing.
 *
 * @internal
 */
function GridGroupManagerColumnRowOverlay({
	item,
	checked,
}: {
	item: GridColumnManagerItem
	checked: boolean
}) {
	const label = columnLabel(item)

	return (
		<div className={cn(k.manager.row.base, k.manager.row.overlay)} data-dragging="">
			{/* The pointer rides the overlay, so its grip shows the held hand. */}
			<GridManagerGrip />

			<GridManagerCheckboxRow
				className={cn(k.manager.row.control)}
				columnTitle={item.title}
				checked={checked}
				disabled
				aria-label={`Show ${label}`}
			/>
		</div>
	)
}
