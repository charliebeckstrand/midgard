'use client'

import { ArrowLeftToLine, ArrowRightToLine, Pin, PinOff } from 'lucide-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Control } from '../../components/control'
import { Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { List, ListItem } from '../../components/list'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid-column-manager'
import { toggleItem } from '../../utilities'
import { GridGroupManager } from './grid-group-manager'
import type { GridColumnGroup } from './grid-group-types'
import { applyColumnReorder } from './grid-reorder'
import { columnLabel, type GridColumnManagerItem, type GridColumnManagerPreset } from './types'
import { useGridColumnVisibility } from './use-grid-column-visibility'

/** Pins a column to an edge, or unpins it with `false`. @internal */
type PinChange = (id: string | number, side: 'left' | 'right' | false) => void

/** Props for {@link GridColumnManager}. */
export type GridColumnManagerProps = {
	columns: GridColumnManagerItem[]

	order?: (string | number)[]
	defaultOrder?: (string | number)[]
	onOrderChange?: (order: (string | number)[]) => void

	hidden?: Set<string | number>
	defaultHidden?: Set<string | number>
	onHiddenChange?: (hidden: Set<string | number>) => void

	/**
	 * Pins a column to an edge, or unpins it with `false`. Its presence turns each
	 * column's pin indicator into an interactive control: a menu offering Pin left /
	 * Pin right / Unpin on the scrolling and pinned columns, and a static edge arrow
	 * on {@link GridColumnManagerItem.locked} ones. Omit it for a read-only view
	 * where frozen columns still list in their groups but can't be moved.
	 */
	onPinChange?: PinChange

	/**
	 * Column groups the manager can edit. When paired with `onGroupsChange`, the
	 * orderable region becomes a group editor — a "New group" button, a zone per
	 * group (name, color, remove), and an ungrouped pool — where columns drag
	 * between zones to change membership. Omit both for the flat reorderable list.
	 */
	groups?: GridColumnGroup[]

	/** Commits the next groups from the group editor; its presence turns on the editor. */
	onGroupsChange?: (groups: GridColumnGroup[]) => void

	/** Called with the current order and hidden ids when the save-preset button is pressed; presence of the handler also shows the button. */
	onSavePreset?: (preset: GridColumnManagerPreset) => void
	/**
	 * Label on the save-preset button.
	 * @defaultValue 'Save as preset'
	 */
	savePresetLabel?: ReactNode

	className?: string
}

/**
 * The edge a column is frozen to in the manager — its immutable
 * {@link GridColumnManagerItem.locked} side, else its movable
 * {@link GridColumnManagerItem.pinned} side — or `undefined` when it scrolls.
 *
 * @internal
 */
function effectivePinSide(item: GridColumnManagerItem): 'left' | 'right' | undefined {
	return item.locked ?? item.pinned
}

/** Props for {@link GridColumnPinControl}. @internal */
type GridColumnPinControlProps = {
	item: GridColumnManagerItem
	/** The column's current frozen edge, or `undefined` when it scrolls. */
	side: 'left' | 'right' | undefined
	onPinChange: PinChange
	className?: string
	/** Dropdown placement: `bottom-start` for the leading (frozen) slot, `bottom-end` for the trailing (scrolling) one. */
	placement: 'bottom-start' | 'bottom-end'
}

/**
 * Per-column pin control: a pin button opening a menu that freezes the column to
 * an edge or releases it. A scrolling column offers Pin left / Pin right; a
 * frozen one offers the opposite edge and Unpin — mirroring the header context
 * menu's pin items.
 *
 * @internal
 */
function GridColumnPinControl({
	item,
	side,
	onPinChange,
	className,
	placement,
}: GridColumnPinControlProps) {
	return (
		<Menu placement={placement} className={className}>
			<MenuTrigger>
				<button type="button" className={cn(k.pinButton)} aria-label={`Pin ${columnLabel(item)}`}>
					<Icon icon={<Pin />} />
				</button>
			</MenuTrigger>
			<MenuContent>
				{side !== 'left' && (
					<MenuItem onAction={() => onPinChange(item.id, 'left')}>
						<Icon icon={<ArrowLeftToLine />} />
						<MenuLabel>Pin left</MenuLabel>
					</MenuItem>
				)}
				{side !== 'right' && (
					<MenuItem onAction={() => onPinChange(item.id, 'right')}>
						<Icon icon={<ArrowRightToLine />} />
						<MenuLabel>Pin right</MenuLabel>
					</MenuItem>
				)}
				{side && (
					<MenuItem onAction={() => onPinChange(item.id, false)}>
						<Icon icon={<PinOff />} />
						<MenuLabel>Unpin</MenuLabel>
					</MenuItem>
				)}
			</MenuContent>
		</Menu>
	)
}

/**
 * Leading slot for a frozen row, aligned to where a scrolling row's drag grip
 * sits. A locked column gets a static edge arrow (its freeze is immutable); a
 * pinned column gets the interactive {@link GridColumnPinControl}; and, when no
 * `onPinChange` handler is supplied, a non-interactive pin indicator.
 *
 * @internal
 */
function frozenLeading(item: GridColumnManagerItem, onPinChange: PinChange | undefined): ReactNode {
	if (item.locked) {
		return (
			<span className={cn(k.lead)}>
				<span aria-hidden="true" className={cn(k.icon)}>
					<Icon icon={item.locked === 'right' ? <ArrowRightToLine /> : <ArrowLeftToLine />} />
				</span>
			</span>
		)
	}

	if (onPinChange) {
		return (
			<GridColumnPinControl
				item={item}
				side={item.pinned}
				onPinChange={onPinChange}
				className={cn(k.lead)}
				placement="bottom-start"
			/>
		)
	}

	return (
		<span className={cn(k.lead)}>
			<span aria-hidden="true" className={cn(k.icon)}>
				<Icon icon={<Pin />} />
			</span>
		</span>
	)
}

/** Props for {@link GridColumnManagerFrozenGroup}. @internal */
type GridColumnManagerFrozenGroupProps = {
	items: GridColumnManagerItem[]
	getKey: (item: GridColumnManagerItem) => string
	onPinChange: PinChange | undefined
}

/**
 * One fixed group of frozen columns — the prepended left group or the appended
 * right group. Each row is checked and disabled (a frozen column always shows
 * and can't be hidden or reordered), led by its pin control or edge arrow.
 *
 * @internal
 */
function GridColumnManagerFrozenGroup({
	items,
	getKey,
	onPinChange,
}: GridColumnManagerFrozenGroupProps) {
	return (
		<List items={items} getKey={getKey} variant="plain" sortable={false}>
			{(col) => (
				<ListItem prefix={frozenLeading(col, onPinChange)}>
					<Control>
						<CheckboxGroup>
							<CheckboxField>
								<Checkbox
									checked
									disabled
									aria-label={`${columnLabel(col)} (${col.locked ? 'locked' : 'pinned'})`}
								/>
								<Label>{col.title}</Label>
							</CheckboxField>
						</CheckboxGroup>
					</Control>
				</ListItem>
			)}
		</List>
	)
}

/**
 * Standalone column-manager editor: a checkbox field per orderable column, drag-
 * sortable in the middle, that toggles each column's hidden state and reorders
 * the rest. Frozen columns list in two fixed groups around it — left-pinned
 * prepended, right-pinned appended — each checked and disabled. With
 * `onPinChange`, every column's pin indicator becomes an interactive control:
 * Pin left / Pin right / Unpin on the scrolling and pinned columns, a static
 * edge arrow on {@link GridColumnManagerItem.locked} ones. Columns with
 * `hideable: false` show but cannot be unchecked. With `onSavePreset`, a footer
 * button captures the current order and hidden ids as a
 * {@link GridColumnManagerPreset}. Order and hidden set are each controllable.
 *
 * @remarks Client component. {@link Grid} renders this inside its own
 * dialog when `columnManager` is configured; use this directly to host the
 * editor elsewhere (e.g. a settings panel).
 */
export function GridColumnManager({
	columns,
	order: orderProp,
	defaultOrder,
	onOrderChange,
	hidden: hiddenProp,
	defaultHidden,
	onHiddenChange,
	onPinChange,
	groups,
	onGroupsChange,
	onSavePreset,
	savePresetLabel = 'Save as preset',
	className,
}: GridColumnManagerProps) {
	const { order, setOrder, hidden, setHidden, byId } = useGridColumnVisibility({
		columns,
		order: orderProp,
		defaultOrder,
		onOrderChange,
		hidden: hiddenProp,
		defaultHidden,
		onHiddenChange,
	})

	// Frozen columns split to their edge (locked wins over pinned) and list in
	// declaration order, since they can't be reordered; the scrolling columns
	// follow the controllable order in between.
	const leftColumns = useMemo(
		() => columns.filter((c) => effectivePinSide(c) === 'left'),
		[columns],
	)

	const rightColumns = useMemo(
		() => columns.filter((c) => effectivePinSide(c) === 'right'),
		[columns],
	)

	const orderableColumns = useMemo(
		() =>
			order
				.map((id) => byId.get(id))
				.filter((c): c is GridColumnManagerItem => !!c && effectivePinSide(c) === undefined),
		[order, byId],
	)

	const toggle = useCallback(
		(id: string | number) => {
			setHidden((prev) => toggleItem(prev ?? new Set<string | number>(), id))
		},
		[setHidden],
	)

	const getKey = useCallback((item: GridColumnManagerItem) => String(item.id), [])

	const handleReorder = useCallback(
		(items: GridColumnManagerItem[]) => {
			const reorderedIds = items.map((i) => i.id)

			// Ids outside the manager's set (select/actions) and frozen columns keep
			// their position; only the orderable data columns are repermuted.
			setOrder(
				applyColumnReorder(order, reorderedIds, (id) => {
					const col = byId.get(id)

					return !!col && effectivePinSide(col) === undefined
				}),
			)
		},
		[order, byId, setOrder],
	)

	const handleSavePreset = useCallback(() => {
		onSavePreset?.({ order, hidden: Array.from(hidden) })
	}, [onSavePreset, order, hidden])

	return (
		<div data-slot="grid-column-manager" className={cn(k.root, className)}>
			{leftColumns.length > 0 && (
				<GridColumnManagerFrozenGroup
					items={leftColumns}
					getKey={getKey}
					onPinChange={onPinChange}
				/>
			)}
			{groups && onGroupsChange ? (
				// The group editor owns the orderable region: columns move between
				// group zones and the ungrouped pool, keeping their membership.
				<GridGroupManager
					groups={groups}
					onGroupsChange={onGroupsChange}
					columns={orderableColumns}
					hidden={hidden}
					onToggle={toggle}
					order={order}
					onOrderChange={setOrder}
				/>
			) : (
				<List
					items={orderableColumns}
					getKey={getKey}
					onReorder={handleReorder}
					variant="plain"
					aria-label="Reorder columns"
				>
					{(col) => (
						<ListItem
							suffix={
								onPinChange ? (
									<GridColumnPinControl
										item={col}
										side={undefined}
										onPinChange={onPinChange}
										placement="bottom-end"
									/>
								) : undefined
							}
						>
							<Control>
								<CheckboxGroup>
									<CheckboxField>
										<Checkbox
											checked={!hidden.has(col.id)}
											disabled={col.hideable === false}
											onChange={() => toggle(col.id)}
											aria-label={`Show ${columnLabel(col)}`}
										/>
										<Label>{col.title}</Label>
									</CheckboxField>
								</CheckboxGroup>
							</Control>
						</ListItem>
					)}
				</List>
			)}
			{rightColumns.length > 0 && (
				<GridColumnManagerFrozenGroup
					items={rightColumns}
					getKey={getKey}
					onPinChange={onPinChange}
				/>
			)}
			{onSavePreset && (
				<div className={cn(k.footer)}>
					<Button variant="soft" size="sm" onClick={handleSavePreset}>
						{savePresetLabel}
					</Button>
				</div>
			)}
		</div>
	)
}
