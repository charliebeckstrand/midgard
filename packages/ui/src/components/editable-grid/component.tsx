'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import {
	DataTable,
	type DataTableColumn,
	type DataTableVirtualize,
	type SortState,
} from '../data-table'
import type { TableVariants } from '../table'
import { EditableGridCellContent } from './cell'
import {
	type CellChange,
	type Coord,
	type EditableGridColumn,
	type EditableGridContextValue,
	EditableGridProvider,
} from './context'
import { useEditableGridMutations } from './use-editable-grid-mutations'
import { useEditableGridNavigation } from './use-editable-grid-navigation'
import { useEditableGridWrapper } from './use-editable-grid-wrapper'
import { k } from './variants'

// ── EditableGrid ───────────────────────────────────────

export type EditableGridProps<T> = TableVariants & {
	columns: EditableGridColumn<T>[]
	rows: T[]
	getRowKey: (row: T, index: number) => string | number

	sort?: SortState
	defaultSort?: SortState
	onSortChange?: (sort: SortState | undefined) => void

	selection?: Set<string | number>
	defaultSelection?: Set<string | number>
	onSelectionChange?: (selection: Set<string | number> | undefined) => void

	/**
	 * Called with one or more changes. When committing a cell inside a row that
	 * belongs to a multi-row selection, the same column value is applied to
	 * every selected row and emitted as a batch.
	 */
	onChange: (changes: CellChange[]) => void

	stickyHeader?: boolean
	maxHeight?: string
	rowClassName?: (row: T) => string | undefined

	/**
	 * Enables row virtualization via DataTable. Only rows in the scroll viewport
	 * (plus overscan) render to the DOM. Requires `maxHeight`.
	 *
	 * Pass `true` for defaults, or an object to tune. See DataTable for details.
	 */
	virtualize?: DataTableVirtualize

	className?: string
	children?: never
}

export function EditableGrid<T>({
	columns,
	rows,
	getRowKey,
	sort,
	defaultSort,
	onSortChange,
	selection: selectionProp,
	defaultSelection,
	onSelectionChange,
	onChange,
	stickyHeader,
	maxHeight,
	rowClassName,
	virtualize,
	dense,
	bleed,
	grid,
	striped,
	className,
}: EditableGridProps<T>) {
	const [selectionRaw, setSelectionRaw] = useControllable<Set<string | number>>({
		value: selectionProp,
		defaultValue: defaultSelection ?? new Set(),
		onChange: onSelectionChange,
	})

	const selection = selectionRaw ?? new Set<string | number>()

	const [editing, setEditing] = useState(false)

	const [draft, setDraft] = useState('')

	// Guards the commit-on-blur that fires when the input unmounts after an
	// explicit Enter / Tab / Escape commit. Ensures a single commit per session.
	const sessionClosedRef = useRef(false)

	// The cell's formatted display value when editing began. Used to skip no-op
	// commits so a lossy format→parse round-trip (e.g. "$2.35" → NaN) never
	// overwrites an unchanged cell.
	const originalFormattedRef = useRef('')

	// Stable refs so callbacks don't rebuild every render.
	const rowsRef = useRef(rows)

	rowsRef.current = rows

	const selectionRef = useRef(selection)

	selectionRef.current = selection

	const wrapperRef = useRef<HTMLDivElement>(null)

	// Editable column indices (exclude selectable / actions) — these are the
	// columns the active-cell cursor can land on.
	const editableCols = useMemo(() => columns.filter((c) => !c.selectable && !c.actions), [columns])

	const rowIndexMap = useMemo(() => {
		const m = new Map<T, number>()

		rows.forEach((r, i) => {
			m.set(r, i)
		})

		return m
	}, [rows])

	// ── Value helpers ──────────────────────────────────────

	const formatCell = useCallback((row: T, col: EditableGridColumn<T>) => {
		if (col.format) return col.format(row)

		if (!col.field) return ''

		const v = row[col.field]

		return v == null ? '' : String(v)
	}, [])

	const parseValue = useCallback((raw: string, row: T, col: EditableGridColumn<T>): unknown => {
		if (col.parse) return col.parse(raw, row)

		return raw
	}, [])

	// ── Navigation ─────────────────────────────────────────

	const {
		active,
		anchor,
		extraCells,
		activeRef,
		anchorRef,
		extraCellsRef,
		setActive,
		setAnchor,
		setExtraCells,
		moveActiveTo,
		moveActive,
		moveActiveTab,
		addCellToSelection,
	} = useEditableGridNavigation<T>({ rowsRef, editableColCount: editableCols.length })

	// ── Mutations ──────────────────────────────────────────

	const { applyCellWrite, applyBulkFill } = useEditableGridMutations<T>({
		editableCols,
		rowsRef,
		selectionRef,
		activeRef,
		anchorRef,
		extraCellsRef,
		getRowKey,
		parseValue,
		onChange,
		setSelection: setSelectionRaw,
	})

	const hasMultiSelection = !!anchor || extraCells.size > 0

	// ── Edit lifecycle ─────────────────────────────────────

	const beginEdit = useCallback(
		(coord: Coord, initial?: string, original?: string) => {
			const col = editableCols[coord.col]

			if (!col || col.readOnly) return

			const initialDraft = initial ?? ''

			sessionClosedRef.current = false

			originalFormattedRef.current = original ?? initialDraft

			setActive(coord)

			setDraft(initialDraft)

			setEditing(true)
		},
		[editableCols, setActive],
	)

	const commitEdit = useCallback(
		(advance: 'down' | 'right' | 'left' | 'none') => {
			if (sessionClosedRef.current) return true

			sessionClosedRef.current = true

			setEditing(false)

			if (active && draft !== originalFormattedRef.current) {
				if (anchorRef.current || extraCellsRef.current.size > 0) applyBulkFill(draft)
				else applyCellWrite(active.row, active.col, draft)
			}

			let stayedInGrid = true

			if (advance === 'down') moveActive(1, 0)
			else if (advance === 'right') stayedInGrid = moveActiveTab(1)
			else if (advance === 'left') stayedInGrid = moveActiveTab(-1)

			if (stayedInGrid) wrapperRef.current?.focus()

			return stayedInGrid
		},
		[
			active,
			draft,
			anchorRef,
			extraCellsRef,
			applyCellWrite,
			applyBulkFill,
			moveActive,
			moveActiveTab,
		],
	)

	const cancelEdit = useCallback(() => {
		sessionClosedRef.current = true

		setEditing(false)

		setDraft('')

		wrapperRef.current?.focus()
	}, [])

	// ── Wrapper handlers ───────────────────────────────────

	const { onWrapperKeyDown, onWrapperPaste, onWrapperFocus, onWrapperBlur } =
		useEditableGridWrapper<T>({
			editing,
			active,
			anchor,
			extraCells,
			hasMultiSelection,
			editableCols,
			wrapperRef,
			rowsRef,
			activeRef,
			selectionRef,
			moveActive,
			moveActiveTo,
			moveActiveTab,
			setActive,
			setAnchor,
			setExtraCells,
			beginEdit,
			formatCell,
			parseValue,
			getRowKey,
			applyCellWrite,
			applyBulkFill,
			onChange,
			setSelection: setSelectionRaw,
		})

	// ── Column augmentation ────────────────────────────────

	const augmentedColumns = useMemo<DataTableColumn<T>[]>(() => {
		let editableColIdx = 0

		return columns.map((col) => {
			if (col.selectable || col.actions) {
				return {
					id: col.id,
					title: col.title,
					sortable: col.sortable,
					selectable: col.selectable,
					actions: col.actions,
					width: col.width,
					className: col.className,
					headerClassName: col.headerClassName,
				}
			}

			const colIdx = editableColIdx++

			const align = col.align ?? 'left'

			const readOnly = col.readOnly ?? false

			return {
				id: col.id,
				title: col.title,
				sortable: col.sortable,
				width: col.width,
				className: cn(k.cellTd, col.className),
				headerClassName: col.headerClassName,
				cell: (row: T) => {
					const rowIdx = rowIndexMap.get(row) ?? -1

					const formatted = formatCell(row, col)

					return (
						<EditableGridCellContent
							rowIdx={rowIdx}
							colIdx={colIdx}
							readOnly={readOnly}
							align={align}
							formatted={formatted}
						/>
					)
				},
			}
		})
	}, [columns, rowIndexMap, formatCell])

	const ctx = useMemo<EditableGridContextValue>(
		() => ({
			active,
			anchor,
			extraCells,
			editing,
			draft,
			setDraft,
			setActive: moveActiveTo,
			addCellToSelection,
			beginEdit,
			commitEdit,
			cancelEdit,
		}),
		[
			active,
			anchor,
			extraCells,
			editing,
			draft,
			moveActiveTo,
			addCellToSelection,
			beginEdit,
			commitEdit,
			cancelEdit,
		],
	)

	return (
		<EditableGridProvider value={ctx}>
			{/* biome-ignore lint/a11y/useSemanticElements: role="grid" on the wrapper is the ARIA composite-widget pattern for spreadsheet-like editing */}
			<div
				ref={wrapperRef}
				data-slot="editable-grid"
				role="grid"
				tabIndex={0}
				className={cn('outline-none', className)}
				onKeyDown={onWrapperKeyDown}
				onPaste={onWrapperPaste}
				onFocus={onWrapperFocus}
				onBlur={onWrapperBlur}
			>
				<DataTable
					columns={augmentedColumns}
					rows={rows}
					getRowKey={getRowKey}
					sort={sort}
					defaultSort={defaultSort}
					onSortChange={onSortChange}
					selection={selection}
					onSelectionChange={setSelectionRaw}
					rowClassName={rowClassName}
					stickyHeader={stickyHeader}
					maxHeight={maxHeight}
					virtualize={virtualize}
					dense={dense}
					bleed={bleed}
					grid={grid}
					striped={striped}
				/>
			</div>
		</EditableGridProvider>
	)
}
