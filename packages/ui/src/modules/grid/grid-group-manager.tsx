'use client'

import {
	type CollisionDetection,
	closestCenter,
	closestCorners,
	DndContext,
	DragOverlay,
	MeasuringStrategy,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { FolderInput, GripVertical, Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Control } from '../../components/control'
import { Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { Listbox, ListboxOption } from '../../components/listbox'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { cn, dataAttr } from '../../core'
import { colors, extendedColors, type PaletteColor } from '../../core/recipe'
import { useSortableSensors } from '../../hooks'
import { k } from '../../recipes/kata/grid-group'
import type { GridColumnGroup } from './grid-group-types'
import { columnLabel, type GridColumnManagerItem } from './types'
import {
	GROUP_PREFIX,
	type GridGroupManagerZone,
	isGroupDragId,
	UNGROUPED,
	useGridGroupManager,
	useGroupColumnSortable,
	useGroupZoneDroppable,
	useGroupZoneSortable,
} from './use-grid-group-manager'

/**
 * Collision detection that keeps the two sortables apart: a group drag only
 * considers group droppables, a column drag only the zone/column droppables — so
 * a dragged group never targets a column slot and vice versa. Group reorder uses
 * `closestCenter` (a plain vertical list); column moves use `closestCorners`,
 * which resolves empty zones (see the multi-container notes in `useGridGroupManager`).
 *
 * @internal
 */
const groupAwareCollision: CollisionDetection = (args) => {
	const groupDrag = isGroupDragId(String(args.active.id))

	const droppableContainers = args.droppableContainers.filter(
		(container) => isGroupDragId(String(container.id)) === groupDrag,
	)

	return (groupDrag ? closestCenter : closestCorners)({ ...args, droppableContainers })
}

/** The palette presets offered by the color Listbox: standard palette then extended. @internal */
const DEFAULT_COLOR_OPTIONS: PaletteColor[] = [...colors, ...extendedColors]

/** Capitalizes a palette color name for display (`violet` → `Violet`). @internal */
function colorLabel(color: PaletteColor): string {
	return color.charAt(0).toUpperCase() + color.slice(1)
}

/** A group's display label: its `title` when a string, else its `id`. @internal */
function groupTitle(group: GridColumnGroup): string {
	return typeof group.title === 'string' ? group.title : String(group.id)
}

/** Props for {@link GridGroupManager}. @internal */
export type GridGroupManagerProps = {
	groups: GridColumnGroup[]
	onGroupsChange: (groups: GridColumnGroup[]) => void
	/** Orderable (non-frozen) data columns, in display order. */
	columns: GridColumnManagerItem[]
	/** The user-hidden set; a row's checkbox reflects and toggles it. */
	hidden: Set<string | number>
	onToggle: (id: string | number) => void
	/** Current column order; a within-ungrouped drag reorders it. */
	order: (string | number)[]
	/** Commits the next column order after a within-ungrouped reorder. */
	onOrderChange: (order: (string | number)[]) => void
	/** Palette presets for the color Listbox; defaults to the full standard + extended palette. */
	colorOptions?: PaletteColor[]
	/** Label on the "New group" button. @defaultValue 'New group' */
	addGroupLabel?: ReactNode
}

/**
 * The column-manager's group editor: a "New group" button, a zone per group
 * (with a name {@link Input}, a color {@link Listbox}, a remove button, and its
 * member columns), and an ungrouped pool. Columns drag between zones (pointer or
 * keyboard) to change membership; each row also carries a "Move to" menu as an
 * accessible alternative to the drag. Group edits commit through
 * `onGroupsChange`; visibility stays on the shared hidden set.
 *
 * @internal
 */
export function GridGroupManager({
	groups,
	onGroupsChange,
	columns,
	hidden,
	onToggle,
	order,
	onOrderChange,
	colorOptions = DEFAULT_COLOR_OPTIONS,
	addGroupLabel = 'New group',
}: GridGroupManagerProps) {
	const mgr = useGridGroupManager({ groups, onGroupsChange, columns, order, onOrderChange })

	const sensors = useSortableSensors()

	// String-keyed lookup so a zone (whose live ids are stringified) and the drag
	// overlay can resolve a column id back to its manager item.
	const byId = useMemo(() => new Map(columns.map((c) => [String(c.id), c])), [columns])

	const activeItem = mgr.activeId ? byId.get(mgr.activeId) : undefined

	// The group zones (sortable) and the fixed ungrouped pool that trails them.
	const groupZones = mgr.zones.filter((zone) => zone.group)

	const ungroupedZone = mgr.zones.find((zone) => !zone.group)

	const groupSortIds = groupZones.map((zone) => `${GROUP_PREFIX}${zone.id}`)

	const shared = {
		byId,
		groups,
		hidden,
		onToggle,
		colorOptions,
		renameGroup: mgr.renameGroup,
		recolorGroup: mgr.recolorGroup,
		removeGroup: mgr.removeGroup,
		assign: mgr.assign,
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={groupAwareCollision}
			measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
			onDragStart={mgr.handleDragStart}
			onDragOver={mgr.handleDragOver}
			onDragEnd={mgr.handleDragEnd}
			onDragCancel={mgr.handleDragCancel}
		>
			<div className={cn(k.manager.root)}>
				<Button variant="soft" size="sm" onClick={mgr.addGroup} className="self-start">
					<Icon icon={<Plus />} />
					{addGroupLabel}
				</Button>

				{/* Groups reorder as a vertical list, dragged by the handle beside each
				    name; the grid's group order follows this order. */}
				<SortableContext items={groupSortIds} strategy={verticalListSortingStrategy}>
					{groupZones.map((zone) => (
						<GridGroupManagerGroupZone
							key={zone.id}
							zone={zone}
							columnIds={mgr.zoneMap[String(zone.id)] ?? []}
							{...shared}
						/>
					))}
				</SortableContext>

				{ungroupedZone && (
					<GridGroupManagerZoneView
						zone={ungroupedZone}
						columnIds={mgr.zoneMap[UNGROUPED] ?? []}
						{...shared}
					/>
				)}
			</div>

			{/* The dragged row's stand-in — a full, inert clone (grip, disabled
			    checkbox, label) — so the source row can hide while dragging without
			    the checkbox appearing to vanish. Mounted always; child gated on drag. */}
			<DragOverlay dropAnimation={null}>
				{activeItem ? (
					<GridGroupManagerColumnRowOverlay
						item={activeItem}
						checked={!hidden.has(activeItem.id)}
					/>
				) : null}
			</DragOverlay>
		</DndContext>
	)
}

/** Props for {@link GridGroupManagerZoneView}. @internal */
type GridGroupManagerZoneViewProps = {
	zone: GridGroupManagerZone
	/** The zone's live member ids (stringified), from the drag-aware zone map. */
	columnIds: string[]
	/** Shared id → item lookup (string-keyed to match the live ids). */
	byId: Map<string, GridColumnManagerItem>
	groups: GridColumnGroup[]
	hidden: Set<string | number>
	onToggle: (id: string | number) => void
	colorOptions: PaletteColor[]
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
		useGroupZoneSortable(props.zone.id)

	const handle = (
		<button
			type="button"
			ref={setActivatorNodeRef}
			className={cn(k.manager.grip)}
			aria-label={`Reorder group ${props.zone.group ? groupTitle(props.zone.group) : ''}`}
			{...attributes}
			{...listeners}
		>
			<Icon icon={<GripVertical />} />
		</button>
	)

	return (
		<div ref={setNodeRef} style={style} data-dragging={dataAttr(dragging)}>
			<GridGroupManagerZoneView {...props} handle={handle} />
		</div>
	)
}

/** One droppable zone: a group (with its config header) or the ungrouped pool, holding its column rows. @internal */
function GridGroupManagerZoneView({
	zone,
	columnIds,
	byId,
	groups,
	hidden,
	onToggle,
	colorOptions,
	renameGroup,
	recolorGroup,
	removeGroup,
	assign,
	handle,
}: GridGroupManagerZoneViewProps) {
	const { setNodeRef, isOver } = useGroupZoneDroppable(zone.id)

	return (
		<div
			ref={setNodeRef}
			// The drop-over border cues a column landing in a group; the ungrouped
			// pool takes columns too but skips the cue (the user asked for it off there).
			className={cn(k.manager.zone, zone.group && isOver && k.manager.zoneOver)}
		>
			{zone.group ? (
				<GridGroupManagerZoneHeader
					group={zone.group}
					handle={handle}
					colorOptions={colorOptions}
					renameGroup={renameGroup}
					recolorGroup={recolorGroup}
					removeGroup={removeGroup}
				/>
			) : (
				<span className={cn(k.manager.poolLabel)}>Ungrouped</span>
			)}

			{columnIds.length === 0 ? (
				<p className={cn(k.manager.empty)}>
					{zone.group ? 'Drag columns here to add them.' : 'All columns are grouped.'}
				</p>
			) : (
				<SortableContext items={columnIds} strategy={verticalListSortingStrategy}>
					{columnIds.map((id) => {
						const item = byId.get(id)

						if (!item) return null

						return (
							<GridGroupManagerColumnRow
								key={id}
								item={item}
								zoneId={zone.id}
								groups={groups}
								hidden={hidden}
								onToggle={onToggle}
								assign={assign}
							/>
						)
					})}
				</SortableContext>
			)}
		</div>
	)
}

/** Props for {@link GridGroupManagerZoneHeader}. @internal */
type GridGroupManagerZoneHeaderProps = {
	group: GridColumnGroup
	/** The group-reorder drag handle, rendered leading the name Input. */
	handle?: ReactNode
	colorOptions: PaletteColor[]
	renameGroup: (id: string | number, title: string) => void
	recolorGroup: (id: string | number, color: PaletteColor | undefined) => void
	removeGroup: (id: string | number) => void
}

/** A group zone's config header: the reorder handle, name Input, color Listbox, and remove button. @internal */
function GridGroupManagerZoneHeader({
	group,
	handle,
	colorOptions,
	renameGroup,
	recolorGroup,
	removeGroup,
}: GridGroupManagerZoneHeaderProps) {
	const label = groupTitle(group)

	return (
		<div className={cn(k.manager.zoneHeader)}>
			{handle}

			<Input
				className={cn(k.manager.nameField)}
				aria-label={`Group name for ${label}`}
				placeholder="Group name"
				value={typeof group.title === 'string' ? group.title : ''}
				onChange={(event) => renameGroup(group.id, event.target.value)}
			/>

			<Listbox<PaletteColor>
				className={cn(k.manager.colorField)}
				placement="bottom-end"
				nullable
				clearable
				aria-label={`Color for ${label}`}
				placeholder="Color"
				value={group.color}
				displayValue={colorLabel}
				onValueChange={(color) => recolorGroup(group.id, color)}
			>
				{colorOptions.map((color) => (
					<ListboxOption key={color} value={color}>
						<Badge color={color} variant="soft">
							{colorLabel(color)}
						</Badge>
					</ListboxOption>
				))}
			</Listbox>

			<Button
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
	groups: GridColumnGroup[]
	hidden: Set<string | number>
	onToggle: (id: string | number) => void
	assign: (columnId: string | number, groupId: string | number | null) => void
}

/** One column row inside a zone: drag grip, visibility checkbox, and a "Move to" menu. @internal */
function GridGroupManagerColumnRow({
	item,
	zoneId,
	groups,
	hidden,
	onToggle,
	assign,
}: GridGroupManagerColumnRowProps) {
	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useGroupColumnSortable(item.id)

	const label = columnLabel(item)

	const inGroup = zoneId !== UNGROUPED

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(k.manager.row)}
			data-dragging={dataAttr(dragging)}
		>
			<button
				type="button"
				ref={setActivatorNodeRef}
				className={cn(k.manager.grip)}
				aria-label={`Reorder ${label}`}
				{...attributes}
				{...listeners}
			>
				<Icon icon={<GripVertical />} />
			</button>

			<Control>
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox
							checked={!hidden.has(item.id)}
							// Held disabled through a drag so it stays put (visible, not toggled)
							// rather than hiding the row and snapping on drop.
							disabled={dragging || item.hideable === false}
							onChange={() => onToggle(item.id)}
							aria-label={`Show ${label}`}
						/>
						<Label>{item.title}</Label>
					</CheckboxField>
				</CheckboxGroup>
			</Control>

			{/* The "Move to" menu only means something once a group exists to move into
			    (or out of); with no groups it would open empty, so it's withheld. */}
			{groups.length > 0 && (
				<Menu placement="bottom-end" className="ml-auto">
					<MenuTrigger>
						<button type="button" className={cn(k.manager.action)} aria-label={`Move ${label}`}>
							<Icon icon={<FolderInput />} />
						</button>
					</MenuTrigger>
					<MenuContent>
						{groups
							.filter((group) => group.id !== zoneId)
							.map((group) => (
								<MenuItem key={group.id} onAction={() => assign(item.id, group.id)}>
									<MenuLabel>Move to {groupTitle(group)}</MenuLabel>
								</MenuItem>
							))}
						{inGroup && (
							<MenuItem onAction={() => assign(item.id, null)}>
								<MenuLabel>Remove from group</MenuLabel>
							</MenuItem>
						)}
					</MenuContent>
				</Menu>
			)}
		</div>
	)
}

/**
 * Presentational clone of a column row for the {@link DragOverlay}: the grip, a
 * disabled visibility checkbox, and the label — no sortable refs, no move menu,
 * no handlers. It stands in for the source row (which hides while dragging) so
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
		<div className={cn(k.manager.row, k.manager.rowOverlay)} data-dragging="">
			<span className={cn(k.manager.grip)}>
				<Icon icon={<GripVertical />} />
			</span>

			<Control>
				<CheckboxGroup>
					<CheckboxField>
						<Checkbox checked={checked} disabled aria-label={`Show ${label}`} />
						<Label>{item.title}</Label>
					</CheckboxField>
				</CheckboxGroup>
			</Control>
		</div>
	)
}
