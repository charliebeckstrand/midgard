'use client'

import { ArrowLeftToLine, ArrowRightToLine, EllipsisVertical, Pin } from 'lucide-react'
import {
	type ReactNode,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { List, ListItem } from '../../components/list'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { SearchInput } from '../../components/search-input'
import { cn, createContext } from '../../core'
import { isRtl } from '../../hooks/a11y/logical-arrow'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { useDeferredQueryText } from '../../primitives/query/use-query-value'
import { k } from '../../recipes/kata/grid-column-manager'
import { toggleItem } from '../../utilities'
import { columnLabel } from './engine/grid-column/label'
import { gridMessages } from './engine/grid-messages'
import { effectivePinSide, physicalSide, pinMenuChoices } from './engine/grid-pin/overrides'
import { applyColumnReorder } from './engine/grid-reorder-compute'
import { type PinColumn, pinChoiceIcon } from './grid-context-menu-utilities'
import type { GridPreferences } from './grid-data-types'
import { GridGroupManager } from './grid-group-manager'
import type { GridColumnGroup } from './grid-group-types'
import { GridManagerCheckboxRow } from './grid-manager-checkbox-row'
import type { GridColumnManagerItem } from './types'
import { isColumnShown, useGridColumnVisibility } from './use-grid-column-visibility'

/**
 * Whether the manager serves a right-to-left grid. The pin labels and the edge
 * arrows read it, so they name the physical edge. @internal
 */
const [ManagerRtlContext, useManagerRtl] = createContext<boolean>('GridColumnManagerRtl')

/**
 * The direction of the manager: its own computed direction, read from its root
 * once it mounts. In the dialog of a grid, the portal of the dialog writes the
 * direction of the grid, so the root inherits it. @internal
 */
function useManagerDirection(root: RefObject<HTMLElement | null>): boolean {
	const [rtl, setRtl] = useState(false)

	useLayoutEffect(() => {
		if (root.current) setRtl(isRtl(root.current))
	}, [root])

	return rtl
}

/**
 * Status line standing in for a list the filter narrowed to nothing. That is
 * the whole editor, or just its scrolling region while a frozen row still
 * matches. An `output` (implicit `role="status"`) so the emptied result is
 * announced, the same idiom the {@link Combobox} and {@link CommandPalette}
 * panels use.
 *
 * @internal
 */
function GridColumnManagerNoResults() {
	return <output className={k().empty}>{useIntl().formatMessage(intlMessages.noResults)}</output>
}

/**
 * The filter placeholder and the save-preset label of the manager: the props,
 * else the defaults in the language of the reader.
 *
 * @internal
 */
function useManagerLabels(filterPlaceholder: string | undefined, savePresetLabel: ReactNode) {
	const intl = useIntl()

	return {
		filterPlaceholder: filterPlaceholder ?? intl.formatMessage(gridMessages.filterColumns),
		savePresetLabel: savePresetLabel ?? intl.formatMessage(gridMessages.savePreset),
	}
}

/** Props for {@link GridColumnManager}. */
export type GridColumnManagerProps = {
	/** The columns that the manager lists, in declaration order. */
	columns: GridColumnManagerItem[]

	/**
	 * Shows the filter field of the manager: a {@link SearchInput} above
	 * the lists. It narrows every group (frozen, orderable, and the group
	 * editor's zones) to the columns whose label matches the typed text.
	 *
	 * Filtering is display-only. A visibility toggle, a pin, or a reorder made
	 * while a query is active commits exactly as it would unfiltered. It holds
	 * every filtered-out column in its slot and its group, so the field never has
	 * to be cleared before editing. `false` drops it and lists every column.
	 * @defaultValue true
	 */
	filterable?: boolean

	/**
	 * Placeholder on the filter field, which doubles as its accessible name.
	 * @defaultValue `'Filter columns'`, in the language of the reader.
	 */
	filterPlaceholder?: string

	/**
	 * The controlled order of the columns, as a list of column ids. The ids of
	 * columns that the list does not hold append at the end, in declaration
	 * order.
	 */
	order?: (string | number)[]

	/**
	 * The initial order of the columns when `order` is not controlled.
	 * @defaultValue The declaration order of `columns`.
	 */
	defaultOrder?: (string | number)[]

	/** Fires when the order changes, with the next order. The order holds every column id. */
	onOrderChange?: (order: (string | number)[]) => void

	/**
	 * Lets the user drag the scrolling columns to reorder them. When `false`, the
	 * orderable list drops its drag handles and renders read-only: visibility
	 * toggles and pin controls still work. The group editor drops its grips too,
	 * and a column changes its group only through its "Move to" menu.
	 * {@link Grid} forwards its {@link GridProps.reorder} flag here, so the
	 * manager only reorders columns when the grid opts in.
	 * @defaultValue true
	 */
	reorderable?: boolean

	/** The controlled set of the ids of the hidden columns. */
	hidden?: Set<string | number>

	/**
	 * The initial set of hidden column ids when `hidden` is not controlled.
	 * @defaultValue An empty set.
	 */
	defaultHidden?: Set<string | number>

	/** Fires when a visibility toggle changes the hidden columns, with the next set of their ids. */
	onHiddenChange?: (hidden: Set<string | number>) => void

	/**
	 * Pins a column to an edge, or unpins it with `false`. Its presence turns each
	 * column's pin indicator into an interactive control. A menu offers Pin left /
	 * Pin right / Unpin on the scrolling and pinned columns, and a static edge
	 * arrow on {@link GridColumnManagerItem.locked} ones. Omit it for a read-only
	 * view where frozen columns still list in their groups but can't be moved.
	 */
	onPinChange?: PinColumn

	/**
	 * Column groups the manager can edit. When paired with `onGroupsChange`, the
	 * orderable region becomes a group editor. It holds a "New group" button, a
	 * zone per group (name, color, remove), and an ungrouped pool. Columns drag
	 * between zones to change membership. Omit both for the flat reorderable list.
	 */
	groups?: GridColumnGroup[]

	/** Commits the next groups from the group editor; its presence turns on the editor. */
	onGroupsChange?: (groups: GridColumnGroup[]) => void

	/**
	 * Fires when the user presses the save-preset button, with the current order
	 * and hidden ids as a {@link GridPreferences} snapshot. Presence of the handler
	 * also shows the button.
	 */
	onSavePreset?: (preset: GridPreferences) => void
	/**
	 * Label on the save-preset button.
	 * @defaultValue `'Save as preset'`, in the language of the reader.
	 */
	savePresetLabel?: ReactNode

	className?: string
}

/** Props for {@link GridColumnPinControl}. @internal */
type GridColumnPinControlProps = {
	item: GridColumnManagerItem
	/** The column's current frozen edge, or `undefined` when it scrolls. */
	side: 'left' | 'right' | undefined
	onPinChange: PinColumn
	className?: string
	/** Dropdown placement: `bottom-start` for the leading (frozen) slot, `bottom-end` for the trailing (scrolling) one. */
	placement: 'bottom-start' | 'bottom-end'
}

/**
 * Per-column pin control: a menu button opening a menu that freezes the column
 * to an edge or releases it. A scrolling column offers Pin left / Pin right; a
 * frozen one offers the opposite edge and Unpin, as the pin items of the header
 * context menu do. The trigger shows an overflow glyph while the column scrolls
 * and switches to a pin glyph once it's frozen.
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
	const rtl = useManagerRtl()

	const intl = useIntl()

	return (
		<Menu placement={placement} className={className}>
			<MenuTrigger>
				<button
					type="button"
					className={k().pin}
					aria-label={intl.formatMessage(gridMessages.pinColumn, { column: columnLabel(item) })}
				>
					<Icon icon={side ? <Pin /> : <EllipsisVertical />} />
				</button>
			</MenuTrigger>
			<MenuContent>
				{pinMenuChoices(intl, side, rtl).map((choice) => (
					<MenuItem key={choice.key} onAction={() => onPinChange(item.id, choice.target)}>
						<Icon icon={pinChoiceIcon(choice.target, rtl)} />
						<MenuLabel>{choice.label}</MenuLabel>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	)
}

/**
 * Leading slot for a frozen row, aligned to where a scrolling row's drag grip
 * sits:
 *
 * - A locked column gets a static edge arrow (its freeze is immutable).
 * - A pinned column gets the interactive {@link GridColumnPinControl}.
 * - Where no `onPinChange` handler is supplied, a non-interactive pin
 *   indicator.
 *
 * @internal
 */
function frozenLeading(item: GridColumnManagerItem, onPinChange: PinColumn | undefined): ReactNode {
	if (item.locked) return <GridColumnLockedEdge side={item.locked} />

	if (onPinChange) {
		return (
			<GridColumnPinControl
				item={item}
				side={item.pinned}
				onPinChange={onPinChange}
				className={k().lead}
				placement="bottom-start"
			/>
		)
	}

	return (
		<span className={k().lead}>
			<span aria-hidden="true" className={k().icon}>
				<Icon icon={<Pin />} />
			</span>
		</span>
	)
}

/**
 * The static edge arrow of a locked column. It points to the physical edge,
 * so a right-to-left grid swaps it. @internal
 */
function GridColumnLockedEdge({ side }: { side: 'left' | 'right' }) {
	const rtl = useManagerRtl()

	return (
		<span className={k().lead}>
			<span aria-hidden="true" className={k().icon}>
				<Icon
					icon={physicalSide(side, rtl) === 'right' ? <ArrowRightToLine /> : <ArrowLeftToLine />}
				/>
			</span>
		</span>
	)
}

/** Props for {@link GridColumnManagerFrozenGroup}. @internal */
type GridColumnManagerFrozenGroupProps = {
	items: GridColumnManagerItem[]
	getKey: (item: GridColumnManagerItem) => string
	onPinChange: PinColumn | undefined
}

/**
 * One fixed group of frozen columns: the prepended left group or the appended
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
	const intl = useIntl()

	return (
		<List items={items} getKey={getKey} variant="plain" sortable={false}>
			{(col) => (
				<ListItem prefix={frozenLeading(col, onPinChange)}>
					<GridManagerCheckboxRow
						columnTitle={col.title}
						checked
						disabled
						aria-label={intl.formatMessage(gridMessages.frozenColumn, {
							column: columnLabel(col),
							state: col.locked ? 'locked' : 'pinned',
						})}
					/>
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
	onPinChange: PinColumn | undefined
	/** Whether rows can be dragged to reorder; off renders a read-only list. */
	reorderable: boolean
	onReorder: (items: GridColumnManagerItem[]) => void
}

/**
 * The flat orderable-column region: a checkbox row per scrolling column,
 * drag-sortable when `reorderable` and read-only otherwise (no drag handles).
 * Each row toggles its column's hidden state and, with `onPinChange`, carries a
 * trailing pin control. Columns with `hideable: false` show but can't be
 * unchecked, also when the hidden set names them.
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
	const intl = useIntl()

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
			<GridManagerCheckboxRow
				columnTitle={col.title}
				checked={isColumnShown(col, hidden)}
				disabled={col.hideable === false}
				onChange={() => onToggle(col.id)}
				aria-label={intl.formatMessage(gridMessages.showColumn, { column: columnLabel(col) })}
			/>
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
			aria-label={intl.formatMessage(gridMessages.reorderColumns)}
		>
			{renderRow}
		</List>
	) : (
		<List
			items={items}
			getKey={getKey}
			sortable={false}
			variant="plain"
			aria-label={intl.formatMessage(gridMessages.columns)}
		>
			{renderRow}
		</List>
	)
}

/**
 * Standalone column-manager editor: a checkbox field per orderable column,
 * drag-sortable in the middle when `reorderable` (read-only otherwise). The
 * field toggles each column's hidden state and reorders the rest. Frozen
 * columns list in two fixed groups around it (left-pinned prepended,
 * right-pinned appended), each checked and disabled. With `onPinChange`, every
 * column's pin indicator becomes an interactive control. It offers Pin left /
 * Pin right / Unpin on the scrolling and pinned columns, and a static edge
 * arrow on {@link GridColumnManagerItem.locked} ones. Columns with
 * `hideable: false` show but cannot be unchecked, also when the hidden set
 * names them. With `onSavePreset`, a footer button captures the current order
 * and hidden ids as a {@link GridPreferences} snapshot. Order and hidden set are
 * each controllable.
 *
 * The pin labels and the edge arrows name the physical edge. Inside a
 * {@link Grid}, the manager takes the direction of the grid. Standalone, it
 * reads its own computed direction once it mounts.
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
	filterPlaceholder: filterPlaceholderProp,
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
	savePresetLabel: savePresetLabelProp,
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

	// The field echoes each keystroke at once while the filtered re-render (every
	// group, and under the group editor its whole zone tree) settles behind it.
	// A cleared field lists every column in the same commit.
	const deferredQuery = useDeferredQueryText(query)

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
	// columns from the render: pinned rows are inert here, so filtering them is
	// display and nothing else.
	const leftColumns = useMemo(
		() => columns.filter((column) => effectivePinSide(column) === 'left' && matches(column)),
		[columns, matches],
	)

	const rightColumns = useMemo(
		() => columns.filter((column) => effectivePinSide(column) === 'right' && matches(column)),
		[columns, matches],
	)

	// Orderable columns follow the controllable order. That order is complete
	// (see `useGridColumnVisibility`), so a stored order that is stale or empty
	// can't drop columns from the manager.
	const orderableColumns = useMemo(
		() =>
			order
				.map((id) => byId.get(id))
				.filter(
					(column): column is GridColumnManagerItem =>
						!!column && effectivePinSide(column) === undefined,
				),
		[order, byId],
	)

	// What the flat list renders under a query. The group editor keeps the full set
	// instead and takes `matches` to filter its own rows, because its zone map is
	// also what commits group membership on drop: pruning its input would drop
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
			const reorderedIds = items.map((item) => item.id)

			// Ids outside the manager's set (select/actions) and frozen columns keep
			// their position; only the orderable data columns are repermuted. Under a
			// query the dragged rows are just the matching ones, so the predicate
			// narrows to them too and every filtered-out column holds its slot: the
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

	// No column anywhere matches: the three groups partition `columns`, so one
	// scan answers for all of them (and, under the group editor, its zone tree).
	const noMatches = !!needle && !columns.some(matches)

	const rootRef = useRef<HTMLDivElement>(null)

	const rtl = useManagerDirection(rootRef)

	const { filterPlaceholder, savePresetLabel } = useManagerLabels(
		filterPlaceholderProp,
		savePresetLabelProp,
	)

	return (
		<ManagerRtlContext value={rtl}>
			<div ref={rootRef} data-slot="grid-column-manager" className={cn(k().base, className)}>
				{filterable && (
					<SearchInput
						value={query}
						onValueChange={setQuery}
						placeholder={filterPlaceholder}
						aria-label={filterPlaceholder}
					/>
				)}
				{noMatches ? (
					<GridColumnManagerNoResults />
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
								reorderable={reorderable}
							/>
						) : visibleOrderable.length === 0 && orderableColumns.length > 0 ? (
							// Only the scrolling region emptied: a frozen row still matches, so the
							// status stands in for the list rather than for the whole editor.
							<GridColumnManagerNoResults />
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
					<div className={k().footer}>
						<Button type="button" variant="soft" size="sm" onClick={handleSavePreset}>
							{savePresetLabel}
						</Button>
					</div>
				)}
			</div>
		</ManagerRtlContext>
	)
}
