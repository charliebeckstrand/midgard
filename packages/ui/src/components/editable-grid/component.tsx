'use client'

import {
	type ClipboardEvent,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { DataTable, type DataTableColumn, type SortState } from '../data-table'
import type { TableVariants } from '../table'
import { EditableGridCellContent } from './cell'
import {
	type CellChange,
	type Coord,
	type EditableGridContextValue,
	EditableGridProvider,
} from './context'
import { k } from './variants'

// ── Column definition ───────────────────────────────────

export type EditableGridColumn<T> = {
	id: string | number
	title?: ReactNode
	/** Read/write field on the row. */
	field?: keyof T
	/** Format a cell value for display. Defaults to `String(row[field] ?? '')`. */
	format?: (row: T) => string
	/** Parse the raw editor string. Defaults to the raw string. */
	parse?: (raw: string, row: T) => unknown
	/** Cells in this column can't be edited. Nav still visits them. */
	readOnly?: boolean
	align?: 'left' | 'center' | 'right'
	sortable?: boolean
	selectable?: boolean
	actions?: (row: T) => ReactNode
	width?: string
	className?: string
	headerClassName?: string
}

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

	const [active, setActive] = useState<Coord | null>(null)
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState('')

	// Guards the commit-on-blur that fires when the input unmounts after an
	// explicit Enter / Tab / Escape commit. Ensures a single commit per session.
	const sessionClosedRef = useRef(false)

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

	// ── Emit changes ───────────────────────────────────────

	const applyCellWrite = useCallback(
		(rowIdx: number, editableColIdx: number, raw: string) => {
			const col = editableCols[editableColIdx]

			if (!col || col.readOnly) return

			const currentRows = rowsRef.current
			const currentRow = currentRows[rowIdx]

			if (!currentRow) return

			const rowKey = getRowKey(currentRow, rowIdx)

			const value = parseValue(raw, currentRow, col)

			// If this row is part of a multi-row selection, fill the column.
			const sel = selectionRef.current
			const inSel = sel.has(rowKey) && sel.size > 1

			const changes: CellChange[] = []

			if (inSel) {
				currentRows.forEach((r, i) => {
					const rk = getRowKey(r, i)

					if (sel.has(rk)) changes.push({ rowKey: rk, columnId: col.id, value })
				})
			} else {
				changes.push({ rowKey, columnId: col.id, value })
			}

			onChange(changes)
		},
		[editableCols, getRowKey, parseValue, onChange],
	)

	// ── Navigation ─────────────────────────────────────────

	const clampCoord = useCallback(
		(row: number, col: number): Coord => ({
			row: Math.max(0, Math.min(rowsRef.current.length - 1, row)),
			col: Math.max(0, Math.min(editableCols.length - 1, col)),
		}),
		[editableCols.length],
	)

	const moveActive = useCallback(
		(dRow: number, dCol: number) => {
			setActive((prev) => {
				if (rowsRef.current.length === 0 || editableCols.length === 0) return null

				const base = prev ?? { row: 0, col: 0 }

				return clampCoord(base.row + dRow, base.col + dCol)
			})
		},
		[clampCoord, editableCols.length],
	)

	// ── Edit lifecycle ─────────────────────────────────────

	const beginEdit = useCallback(
		(coord: Coord, initial?: string) => {
			const col = editableCols[coord.col]

			if (!col || col.readOnly) return

			sessionClosedRef.current = false

			setActive(coord)

			setDraft(initial ?? '')

			setEditing(true)
		},
		[editableCols],
	)

	const commitEdit = useCallback(
		(advance: 'down' | 'right' | 'left' | 'none') => {
			if (sessionClosedRef.current) return

			sessionClosedRef.current = true

			setEditing(false)

			if (active) applyCellWrite(active.row, active.col, draft)

			if (advance === 'down') moveActive(1, 0)
			else if (advance === 'right') moveActive(0, 1)
			else if (advance === 'left') moveActive(0, -1)

			wrapperRef.current?.focus()
		},
		[active, draft, applyCellWrite, moveActive],
	)

	const cancelEdit = useCallback(() => {
		sessionClosedRef.current = true

		setEditing(false)

		setDraft('')

		wrapperRef.current?.focus()
	}, [])

	// ── Keyboard & paste on the wrapper ────────────────────

	const onWrapperKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			if (editing) return

			if (rowsRef.current.length === 0 || editableCols.length === 0) return

			const key = e.key

			switch (key) {
				case 'ArrowUp':
					e.preventDefault()

					moveActive(-1, 0)

					return
				case 'ArrowDown':
					e.preventDefault()

					moveActive(1, 0)

					return
				case 'ArrowLeft':
					e.preventDefault()

					moveActive(0, -1)

					return
				case 'ArrowRight':
				case 'Tab':
					e.preventDefault()

					moveActive(0, e.shiftKey ? -1 : 1)

					return
				case 'Home':
					e.preventDefault()

					setActive((p) => ({ row: p?.row ?? 0, col: 0 }))

					return
				case 'End':
					e.preventDefault()

					setActive((p) => ({ row: p?.row ?? 0, col: editableCols.length - 1 }))

					return
				case 'Enter':
				case 'F2': {
					if (!active) return

					const row = rowsRef.current[active.row]
					const col = editableCols[active.col]

					if (!row || !col) return

					e.preventDefault()

					beginEdit(active, formatCell(row, col))

					return
				}
				case 'Delete':
				case 'Backspace':
					if (!active) return

					e.preventDefault()

					applyCellWrite(active.row, active.col, '')

					return
			}

			// Printable single character starts edit and replaces the value.
			if (active && key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
				e.preventDefault()

				beginEdit(active, key)
			}
		},
		[editing, active, editableCols, moveActive, beginEdit, formatCell, applyCellWrite],
	)

	const onWrapperPaste = useCallback(
		(e: ClipboardEvent<HTMLDivElement>) => {
			if (editing || !active) return

			const text = e.clipboardData.getData('text/plain')

			if (!text) return

			e.preventDefault()

			const matrix = text
				.replace(/\r\n/g, '\n')
				.split('\n')
				.map((r) => r.split('\t'))

			// Single cell → write to active (may bulk-fill by selection).
			if (matrix.length === 1 && (matrix[0]?.length ?? 0) === 1) {
				applyCellWrite(active.row, active.col, matrix[0]?.[0] ?? '')

				return
			}

			// Matrix paste: fill from active cell, row-major, without bulk-fill.
			const changes: CellChange[] = []

			matrix.forEach((cells, r) => {
				cells.forEach((raw, c) => {
					const rowIdx = active.row + r
					const colIdx = active.col + c
					const col = editableCols[colIdx]
					const row = rowsRef.current[rowIdx]

					if (!col || !row || col.readOnly) return

					changes.push({
						rowKey: getRowKey(row, rowIdx),
						columnId: col.id,
						value: parseValue(raw, row, col),
					})
				})
			})

			if (changes.length) onChange(changes)
		},
		[editing, active, editableCols, getRowKey, parseValue, onChange, applyCellWrite],
	)

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
			editing,
			draft,
			setDraft,
			setActive,
			beginEdit,
			commitEdit,
			cancelEdit,
		}),
		[active, editing, draft, beginEdit, commitEdit, cancelEdit],
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
					dense={dense}
					bleed={bleed}
					grid={grid}
					striped={striped}
				/>
			</div>
		</EditableGridProvider>
	)
}
