'use client'

import {
	type CSSProperties,
	type MouseEvent,
	type ReactNode,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react'
import { TableCell } from '../../components/table'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GRID_ROLE } from './engine/grid-constants'
import { isColumnEditable, NEW_ROW_KEY } from './engine/grid-editing-utilities'
import {
	isNewRowAddColumn,
	measureNewRowAddCell,
	NEW_ROW_ADD_COLUMN_ID,
} from './engine/grid-new-row-column'
import { pinnedCellProps } from './engine/grid-pin/styles'
import { fromInteractiveContent } from './engine/grid-row/cell'
import { GridAddRowButton, GridCellEditor } from './grid-editing-cell'
import { type GridNewRowSession, useGridNewRowSession } from './grid-editing-context'
import type { GridNewRowAdd, GridNewRowAddContext } from './grid-editing-types'
import type { GridColumn } from './types'
import { NEW_ROW_INDEX } from './use-grid-navigation'
import { GridNavCell, stickyHeadInset } from './use-grid-navigation-columns'
import { stackStickyHead, useGridStickyHead } from './use-grid-sticky-head'
import type { GridColumnPinning } from './use-grid-table'

/** The accessible name of the new-row slot. @internal */
const NEW_ROW_LABEL = 'New row'

/** A session call that the new-row slot never makes, because the slot is in no session. @internal */
function inert(): undefined {
	return undefined
}

/** A focus claim that the new-row slot answers through its own `claimSlot`. @internal */
function noClaim(): boolean {
	return false
}

/**
 * Sets the sticky offset of a new-row slot at the top of the body. The slot
 * sticks below a sticky header, so the offset is the height that the header
 * covers (see {@link stickyHeadInset}). With no sticky header it is zero.
 * {@link useGridStickyHead} measures again on each resize of the header.
 * @internal
 */
function placeTopSlot(section: HTMLTableSectionElement, head: HTMLTableSectionElement): void {
	const table = section.closest('table')

	if (!table) return

	// The column row sticks at the band height. Write it first, so the inset
	// reads the current band after a resize (see `stackStickyHead`).
	stackStickyHead(head)

	section.style.setProperty('--grid-new-row-top', `${stickyHeadInset(table)}px`)
}

/** Props for {@link GridNewRow}. @internal */
type GridNewRowProps<T> = {
	/** The visible columns, in display order, as the data rows render them. */
	columns: GridColumn<T>[]
	/** Frozen-column controls, so a pinned cell of the slot sticks like the data rows' cells. */
	pinning: GridColumnPinning | null
	/** The slot's `aria-rowindex`, or `undefined` where the grid sets no row indexes. */
	ariaRowIndex: number | undefined
	/**
	 * The consumer's {@link GridEditableConfig.newRowAdd}, which sets the Add
	 * control. The Add cell renders only where the grid added its column.
	 */
	add: GridNewRowAdd | undefined
	/** Takes the width that the Add cell needs, when no fixed width holds the column. */
	onMeasureAdd: (width: number) => void
}

/**
 * One cell of the new-row slot. It carries the cursor's cell id and ring, and
 * a press on it seats the cursor, as a data cell does. An editable column
 * mounts its editor at all times. While an add is in flight, each editor
 * keeps its value and pulses, and it takes no input.
 *
 * @internal
 */
function GridNewRowCell<T>({
	session,
	column,
	col,
	colIndex,
	draftRow,
	className,
	style,
}: {
	session: GridNewRowSession
	column: GridColumn<T>
	/** The cursor's column index, among the visible data columns. */
	col: number
	colIndex: number | undefined
	draftRow: T
	className: string
	style: CSSProperties | undefined
}) {
	const editable = isColumnEditable(column)

	const seat = (event: MouseEvent<HTMLTableCellElement>) => {
		const inCell = event.target instanceof Node && event.currentTarget.contains(event.target)

		if (!inCell || fromInteractiveContent(event.target)) return

		event.currentTarget.closest<HTMLElement>(GRID_ROLE)?.focus()

		session.moveTo({ row: NEW_ROW_INDEX, col })
	}

	const pending = editable && session.inFlight

	// The editor stays mounted through an add, so the row keeps its fields and
	// its height. While the add is in flight, the host is inert, and the editor
	// pulses as a pending data cell does.
	const content = editable ? (
		<span inert={pending} className={cn(k.edit.host, pending && k.edit.pending)}>
			<GridCellEditor<T>
				key={session.generation}
				rowIdx={NEW_ROW_INDEX}
				rowKey={NEW_ROW_KEY}
				row={draftRow}
				column={column}
				stageDraft={session.stageDraft}
				unstageDraft={session.unstageDraft}
				readDraft={session.readDraft}
				endSession={inert}
				entrySeed={inert}
				claimFocus={noClaim}
				resumeCell={inert}
				managed
				settle="none"
				held={false}
				kind={column.editCell ? undefined : session.editorKind(column)}
				claimSlot={session.claimFocus}
			/>
		</span>
	) : null

	return (
		<TableCell
			id={session.cellId(NEW_ROW_INDEX, col)}
			role="gridcell"
			data-grid-new-col={String(column.id)}
			aria-colindex={colIndex}
			aria-readonly={!editable || undefined}
			aria-busy={pending || undefined}
			className={className}
			style={style}
			onMouseDown={seat}
		>
			<GridNavCell row={NEW_ROW_INDEX} col={col}>
				{content}
			</GridNavCell>
		</TableCell>
	)
}

/**
 * The cell of the Add column in the new-row slot. It holds the built-in Add
 * control, or the consumer's {@link GridNewRowAdd.render} slot. It sticks to
 * the inline end. While an add is in flight, its content is inert and pulses,
 * as the editors do.
 *
 * Without a fixed {@link GridNewRowAdd.width}, the cell reports the width that
 * its control needs through `onMeasure`, and the grid sets the column to it.
 * It measures again when the control changes size. While an add is in flight
 * it holds the width, so a pending label does not move the columns.
 *
 * @remarks The cell carries `data-grid-new-col`, so the slot's key handler
 * takes the keys of its control. Escape and F2 then leave the slot, and do
 * not reach the session of the data rows. The cell is not a stop of the
 * keyboard cursor. Tab reaches its control after the last editor.
 *
 * @internal
 */
function GridNewRowAddCell({
	session,
	render,
	onMeasure,
	colIndex,
	className,
}: {
	session: GridNewRowSession
	render: ((context: GridNewRowAddContext) => ReactNode) | undefined
	/** Takes the width that the cell needs, or is `undefined` under a fixed width. */
	onMeasure: ((width: number) => void) | undefined
	colIndex: number | undefined
	className: string
}) {
	const pending = session.inFlight

	const cellRef = useRef<HTMLTableCellElement>(null)

	const controlRef = useRef<HTMLSpanElement>(null)

	useLayoutEffect(() => {
		const cell = cellRef.current

		const control = controlRef.current

		if (!onMeasure || pending || !cell || !control) return

		const report = () => {
			const width = measureNewRowAddCell(cell, control)

			if (width !== null) onMeasure(width)
		}

		report()

		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(report)

		observer.observe(control)

		return () => observer.disconnect()
	}, [onMeasure, pending])

	return (
		<TableCell
			ref={cellRef}
			data-grid-new-col={NEW_ROW_ADD_COLUMN_ID}
			aria-colindex={colIndex}
			aria-busy={pending || undefined}
			className={cn(className, k.newRow.add)}
		>
			<span
				ref={controlRef}
				inert={pending}
				className={cn(k.newRow.control, pending && k.edit.pending)}
			>
				{render ? (
					render({ add: session.addRow, pending })
				) : (
					<GridAddRowButton addRow={session.addRow} />
				)}
			</span>
		</TableCell>
	)
}

/**
 * The new-row slot of an editable grid ({@link GridEditableConfig.newRow}): one
 * blank editor row in a `<tbody>` of its own, before or after the data body. It
 * is outside the row model, so no sort, filter, grouping, pagination, or
 * virtual window reaches it. Its cells stick to the top or the bottom edge of
 * the scroll container while the body scrolls. At the top they stick below a
 * sticky header.
 *
 * @remarks The row is a real row of the grid for assistive tech. It carries
 * the name "New row" and, where the grid sets row indexes, an `aria-rowindex`.
 * Its cells carry the cursor's cell ids, so the cursor's
 * `aria-activedescendant` can name them. It renders nothing when the grid
 * shows no slot.
 *
 * @internal
 */
export function GridNewRow<T>({
	columns,
	pinning,
	ariaRowIndex,
	add,
	onMeasureAdd,
}: GridNewRowProps<T>) {
	const session = useGridNewRowSession()

	const bodyRef = useRef<HTMLTableSectionElement>(null)

	useGridStickyHead(bodyRef, session?.position === 'top' ? placeTopSlot : null)

	const dataColumns = useMemo(() => columns.filter(isDataColumn), [columns])

	if (!session) return null

	// The row that a column's `editCell` slot and `validate` read: the field of
	// each editable column, with the value that the user entered.
	const draftRow = Object.fromEntries(
		dataColumns
			.filter((column) => column.field != null)
			.map((column) => [column.field, session.readDraft(NEW_ROW_KEY, column.id)?.value]),
	) as T

	const edge = session.position === 'top' ? k.newRow.top : k.newRow.bottom

	return (
		<tbody ref={bodyRef} data-slot="grid-new-row-body">
			<tr
				data-slot="grid-new-row"
				data-position={session.position}
				aria-label={NEW_ROW_LABEL}
				aria-rowindex={ariaRowIndex}
				aria-busy={session.inFlight || undefined}
			>
				{columns.map((column, index) => {
					const pinned = pinnedCellProps(pinning, column)

					const className = cn(
						pinned.className,
						k.newRow.cell,
						edge,
						pinned.style !== undefined && k.newRow.pinned,
					)

					const colIndex = ariaRowIndex !== undefined ? index + 1 : undefined

					if (isNewRowAddColumn(column.id))
						return (
							<GridNewRowAddCell
								key={column.id}
								session={session}
								render={add?.render}
								onMeasure={add?.width === undefined ? onMeasureAdd : undefined}
								colIndex={colIndex}
								className={className}
							/>
						)

					if (!isDataColumn(column))
						return (
							<TableCell
								key={column.id}
								aria-colindex={colIndex}
								className={className}
								style={pinned.style}
							/>
						)

					return (
						<GridNewRowCell<T>
							key={column.id}
							session={session}
							column={column}
							col={dataColumns.indexOf(column)}
							colIndex={colIndex}
							draftRow={draftRow}
							className={className}
							style={pinned.style}
						/>
					)
				})}
			</tr>
		</tbody>
	)
}
