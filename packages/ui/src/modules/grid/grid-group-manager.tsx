'use client'

import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { FolderInput, GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
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
	type GridGroupManagerZone,
	UNGROUPED,
	useGridGroupManager,
	useGroupColumnSortable,
	useGroupZoneDroppable,
} from './use-grid-group-manager'

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

	const activeItem =
		mgr.activeId != null ? columns.find((c) => String(c.id) === mgr.activeId) : undefined

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={mgr.handleDragStart}
			onDragEnd={mgr.handleDragEnd}
			onDragCancel={mgr.handleDragCancel}
		>
			<div className={cn(k.manager.root)}>
				<Button variant="soft" size="sm" onClick={mgr.addGroup} className="self-start">
					<Icon icon={<Plus />} />
					{addGroupLabel}
				</Button>

				{mgr.zones.map((zone) => (
					<GridGroupManagerZoneView
						key={zone.id}
						zone={zone}
						groups={groups}
						columns={columns}
						hidden={hidden}
						onToggle={onToggle}
						colorOptions={colorOptions}
						renameGroup={mgr.renameGroup}
						recolorGroup={mgr.recolorGroup}
						removeGroup={mgr.removeGroup}
						assign={mgr.assign}
					/>
				))}
			</div>

			<DragOverlay>
				{activeItem ? (
					<div className={cn(k.manager.row)}>
						<Icon icon={<GripVertical />} className={cn(k.manager.grip)} />
						<Label>{activeItem.title}</Label>
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	)
}

/** Props for {@link GridGroupManagerZoneView}. @internal */
type GridGroupManagerZoneViewProps = {
	zone: GridGroupManagerZone
	groups: GridColumnGroup[]
	columns: GridColumnManagerItem[]
	hidden: Set<string | number>
	onToggle: (id: string | number) => void
	colorOptions: PaletteColor[]
	renameGroup: (id: string | number, title: string) => void
	recolorGroup: (id: string | number, color: PaletteColor | undefined) => void
	removeGroup: (id: string | number) => void
	assign: (columnId: string | number, groupId: string | number | null) => void
}

/** One droppable zone: a group (with its config header) or the ungrouped pool, holding its column rows. @internal */
function GridGroupManagerZoneView({
	zone,
	groups,
	columns,
	hidden,
	onToggle,
	colorOptions,
	renameGroup,
	recolorGroup,
	removeGroup,
	assign,
}: GridGroupManagerZoneViewProps) {
	const { setNodeRef, isOver } = useGroupZoneDroppable(zone.id)

	const byId = new Map(columns.map((c) => [c.id, c]))

	return (
		<div ref={setNodeRef} className={cn(k.manager.zone, isOver && k.manager.zoneOver)}>
			{zone.group ? (
				<GridGroupManagerZoneHeader
					group={zone.group}
					colorOptions={colorOptions}
					renameGroup={renameGroup}
					recolorGroup={recolorGroup}
					removeGroup={removeGroup}
				/>
			) : (
				<span className={cn(k.manager.poolLabel)}>Ungrouped</span>
			)}

			{zone.columnIds.length === 0 ? (
				<p className={cn(k.manager.empty)}>
					{zone.group ? 'Drag columns here to add them.' : 'All columns are grouped.'}
				</p>
			) : (
				<SortableContext items={zone.columnIds.map(String)} strategy={verticalListSortingStrategy}>
					{zone.columnIds.map((id) => {
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
	colorOptions: PaletteColor[]
	renameGroup: (id: string | number, title: string) => void
	recolorGroup: (id: string | number, color: PaletteColor | undefined) => void
	removeGroup: (id: string | number) => void
}

/** A group zone's config header: the name Input, the color Listbox, and the remove button. @internal */
function GridGroupManagerZoneHeader({
	group,
	colorOptions,
	renameGroup,
	recolorGroup,
	removeGroup,
}: GridGroupManagerZoneHeaderProps) {
	const label = groupTitle(group)

	return (
		<div className={cn(k.manager.zoneHeader)}>
			<Input
				className={cn(k.manager.nameField)}
				aria-label={`Group name for ${label}`}
				placeholder="Group name"
				value={typeof group.title === 'string' ? group.title : ''}
				onChange={(event) => renameGroup(group.id, event.target.value)}
			/>

			<Listbox<PaletteColor>
				className={cn(k.manager.colorField)}
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
				variant="plain"
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
							disabled={item.hideable === false}
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
