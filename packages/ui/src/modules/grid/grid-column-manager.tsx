'use client'

import { ArrowLeftToLine, ArrowRightToLine, EllipsisVertical, Pin } from 'lucide-react'
import { type ReactNode, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Control } from '../../components/control'
import { Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { List, ListItem } from '../../components/list'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { SearchInput } from '../../components/search-input'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid-column-manager'
import { toggleItem } from '../../utilities'
import { columnLabel } from './engine/grid-column/label'
import { effectivePinSide, pinMenuChoices } from './engine/grid-pin/overrides'
import { applyColumnReorder } from './engine/grid-reorder-compute'
import { pinChoiceIcon } from './grid-context-menu-utilities'
import type { GridPreferences } from './grid-data-types'
import { GridGroupManager } from './grid-group-manager'
import type { GridColumnGroup } from './grid-group-types'
import type { GridColumnManagerItem } from './types'
import { useGridColumnVisibility } from './use-grid-column-visibility'

/** Pins a column to an edge, or unpins it with `false`. @internal */
type PinChange = (id: string | number, side: 'left' | 'right' | false) => void

/**
 * Status line standing in for a list the filter narrowed to nothing — the whole
 * editor, or just its scrolling region while a frozen row still matches. An
 * `output` (implicit `role="status"`) so the emptied result is announced, the
 * same idiom the {@link Combobox} and {@link CommandPalette} panels use.
 *
 * @internal
 */
const NO_RESULTS = <output className={cn(k.empty)}>No results</output>

/** Props for {@link GridColumnManager}. */
export type GridColumnManagerProps = {
	columns: GridColumnManagerItem[]

	/**
	 * Whether the manager carries its filter field: a {@link SearchInput} above the
	 * lists that narrows every group — frozen, orderable, and the group editor's
	 * zones — to the columns whose label matches the typed text.
	 *
	 * Filtering is display-only. A visibility toggle, a pin, or a reorder made
	 * while a query is active commits exactly as it would unfiltered, holding every
	 * filtered-out column in its slot and its group, so the field never has to be
	 * cleared before editing. `false` drops it and lists every column.
	 * @defaultValue true
	 */
	filterable?: boolean

	/**
	 * Placeholder on the filter field, which doubles as its accessible name.
	 * @defaultValue 'Filter columns'
	 */
	filterPlaceholder?: string

	order?: (string | number)[]
	defaultOrder?: (string | number)[]
	onOrderChange?: (order: (string | number)[]) => void

	/**
	 * Whether the scrolling columns can be dragged to reorder. When `false`, the
	 * orderable list drops its drag handles and renders read-only — visibility
	 * toggles and pin controls still work. {@link Grid} forwards its
	 * {@link GridProps.reorder} flag here, so the manager only reorders columns
	 * when the grid opts in.
	 * @defaultValue true
	 */
	reorderable?: boolean

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

	/** Called with the current order and hidden ids as a {@link GridPreferences} snapshot when the save-preset button is pressed; presence of the handler also shows the button. */
	onSavePreset?: (preset: GridPreferences) => void
	/**
	 * Label on the save-preset button.
	 * @defaultValue 'Save as preset'
	 */
	savePresetLabel?: ReactNode

	className?: string
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
 * Per-column pin control: a menu button opening a menu that freezes the column
 * to an edge or releases it. A scrolling column offers Pin left / Pin right; a
 * frozen one offers the opposite edge and Unpin — mirroring the header context
 * menu's pin items. The trigger shows an overflow glyph while the column
 * scrolls and switches to a pin glyph once it's frozen.
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
					<Icon icon={side ? <Pin /> : <EllipsisVertical />} />
				</button>
			</MenuTrigger>
			<MenuContent>
				{pinMenuChoices(side).map((choice) => (
					<MenuItem key={choice.key} onAction={() => onPinChange(item.id, choice.target)}>
						<Icon icon={pinChoiceIcon(choice.key)} />
						<MenuLabel>{choice.label}</MenuLabel>
					</MenuItem>
				))}
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

/** Props for {@link GridColumnManagerOrderableList}. @internal */
type GridColumnManagerOrderableListProps = {
	items: GridColumnManagerItem[]
	getKey: (item: GridColumnManagerItem) => string
	hidden: Set<string | number>
	onToggle: (id: string | number) => void
	onPinChange: PinChange | undefined
	/** Whether rows can be dragged to reorder; off renders a read-only list. */
	reorderable: boolean
	onReorder: (items: GridColumnManagerItem[]) => void
}

/**
 * The flat orderable-column region: a checkbox row per scrolling column,
 * drag-sortable when `reorderable` and read-only otherwise (no drag handles).
 * Each row toggles its column's hidden state and, with `onPinChange`, carries a
 * trailing pin control. Columns with `hideable: false` show but can't be
 * unchecked.
 *
 * @internal
 */
function GridColumnManagerOrderableList({
	items,
	getKey,
	hidden,
	onToggle,
	onPinChange,
	reorderable,
	onReorder,
}: GridColumnManagerOrderableListProps) {
	const renderRow = (col: GridColumnManagerItem) => (
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
							onChange={() => onToggle(col.id)}
							aria-label={`Show ${columnLabel(col)}`}
						/>
						<Label>{col.title}</Label>
					</CheckboxField>
				</CheckboxGroup>
			</Control>
		</ListItem>
	)

	// A read-only list drops `sortable` so no static grip renders; the reorderable
	// list keeps the auto-inserted handle and commits moves through `onReorder`.
	return reorderable ? (
		<List
			items={items}
			getKey={getKey}
			onReorder={onReorder}
			variant="plain"
			aria-label="Reorder columns"
		>
			{renderRow}
		</List>
	) : (
		<List items={items} getKey={getKey} sortable={false} variant="plain" aria-label="Columns">
			{renderRow}
		</List>
	)
}

/**
 * Standalone column-manager editor: a checkbox field per orderable column, drag-
 * sortable in the middle when `reorderable` (read-only otherwise), that toggles
 * each column's hidden state and reorders the rest. Frozen columns list in two
 * fixed groups around it — left-pinned prepended, right-pinned appended — each
 * checked and disabled. With `onPinChange`, every column's pin indicator becomes
 * an interactive control:
 * Pin left / Pin right / Unpin on the scrolling and pinned columns, a static
 * edge arrow on {@link GridColumnManagerItem.locked} ones. Columns with
 * `hideable: false` show but cannot be unchecked. With `onSavePreset`, a footer
 * button captures the current order and hidden ids as a
 * {@link GridPreferences} snapshot. Order and hidden set are each controllable.
 *
 * A filter field heads the editor unless {@link GridColumnManagerProps.filterable}
 * turns it off, narrowing every group to the columns whose label matches the
 * typed text. It only narrows what renders: edits made under a query commit as
 * they would unfiltered.
 *
 * @remarks Client component. {@link Grid} renders this inside its own
 * dialog when `columnManager` is configured; use this directly to host the
 * editor elsewhere (e.g. a settings panel).
 */
export function GridColumnManager({
	columns,
	filterable = true,
	filterPlaceholder = 'Filter columns',
	order: orderProp,
	defaultOrder,
	onOrderChange,
	reorderable = true,
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

	const [query, setQuery] = useState('')

	// The field echoes each keystroke at once while the filtered re-render — every
	// group, and under the group editor its whole zone tree — settles behind it.
	const deferredQuery = useDeferredValue(query)

	// One normalized needle for every group's filter; empty (matching everything)
	// with no query, or with the field turned off.
	const needle = filterable ? deferredQuery.trim().toLowerCase() : ''

	const matches = useCallback(
		(item: GridColumnManagerItem) => !needle || columnLabel(item).toLowerCase().includes(needle),
		[needle],
	)

	// Frozen columns split to their edge (locked wins over pinned) and list in
	// declaration order, since they can't be reordered; the scrolling columns
	// follow the controllable order in between. Each group drops its non-matching
	// columns from the render — pinned rows are inert here, so filtering them is
	// display and nothing else.
	const leftColumns = useMemo(
		() => columns.filter((c) => effectivePinSide(c) === 'left' && matches(c)),
		[columns, matches],
	)

	const rightColumns = useMemo(
		() => columns.filter((c) => effectivePinSide(c) === 'right' && matches(c)),
		[columns, matches],
	)

	// Orderable columns follow the controllable order, then any not in it append
	// in declaration order — the engine's own contract for absent ids — so a
	// stored order that is stale (columns added since) or empty (nothing
	// persisted yet) can't drop columns from the manager.
	const orderableColumns = useMemo(() => {
		const inOrder = order
			.map((id) => byId.get(id))
			.filter((c): c is GridColumnManagerItem => !!c && effectivePinSide(c) === undefined)

		const seen = new Set(inOrder.map((c) => c.id))

		const missing = columns.filter((c) => effectivePinSide(c) === undefined && !seen.has(c.id))

		return [...inOrder, ...missing]
	}, [order, byId, columns])

	// What the flat list renders under a query. The group editor keeps the full set
	// instead and takes `matches` to filter its own rows, because its zone map is
	// also what commits group membership on drop — pruning its input would drop
	// every filtered-out column out of its group.
	const visibleOrderable = useMemo(
		() => orderableColumns.filter(matches),
		[orderableColumns, matches],
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
			// their position; only the orderable data columns are repermuted. Under a
			// query the dragged rows are just the matching ones, so the predicate
			// narrows to them too and every filtered-out column holds its slot — the
			// same contract that holds the pinned ones.
			setOrder(
				applyColumnReorder(order, reorderedIds, (id) => {
					const col = byId.get(id)

					return !!col && effectivePinSide(col) === undefined && matches(col)
				}),
			)
		},
		[order, byId, setOrder, matches],
	)

	const handleSavePreset = useCallback(() => {
		onSavePreset?.({ order, hidden: [...hidden] })
	}, [onSavePreset, order, hidden])

	// No column anywhere matches — the three groups partition `columns`, so one
	// scan answers for all of them (and, under the group editor, its zone tree).
	const noMatches = !!needle && !columns.some(matches)

	return (
		<div data-slot="grid-column-manager" className={cn(k.root, className)}>
			{filterable && (
				<SearchInput
					value={query}
					onValueChange={setQuery}
					placeholder={filterPlaceholder}
					aria-label={filterPlaceholder}
				/>
			)}
			{noMatches ? (
				NO_RESULTS
			) : (
				<>
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
							matches={matches}
							hidden={hidden}
							onToggle={toggle}
							order={order}
							onOrderChange={setOrder}
						/>
					) : visibleOrderable.length === 0 && orderableColumns.length > 0 ? (
						// Only the scrolling region emptied — a frozen row still matches, so the
						// status stands in for the list rather than for the whole editor.
						NO_RESULTS
					) : (
						<GridColumnManagerOrderableList
							items={visibleOrderable}
							getKey={getKey}
							hidden={hidden}
							onToggle={toggle}
							onPinChange={onPinChange}
							reorderable={reorderable}
							onReorder={handleReorder}
						/>
					)}
					{rightColumns.length > 0 && (
						<GridColumnManagerFrozenGroup
							items={rightColumns}
							getKey={getKey}
							onPinChange={onPinChange}
						/>
					)}
				</>
			)}
			{onSavePreset && (
				<div className={cn(k.footer)}>
					<Button type="button" variant="soft" size="sm" onClick={handleSavePreset}>
						{savePresetLabel}
					</Button>
				</div>
			)}
		</div>
	)
}
