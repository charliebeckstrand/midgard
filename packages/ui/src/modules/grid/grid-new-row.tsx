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
import { isColumnEditable, NEW_ROW_KEY } from './engine/grid-editing-utilities'
import { pinnedCellProps } from './engine/grid-pin/styles'
import { fromInteractiveContent } from './engine/grid-row/cell'
import { GridAddRowButton, GridCellEditor, GridPendingCell } from './grid-editing-cell'
import { type GridNewRowSession, useGridNewRowSession } from './grid-editing-context'
import type { GridColumn } from './types'
import { NEW_ROW_INDEX } from './use-grid-navigation'
import { GridNavCell } from './use-grid-navigation-columns'
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
 * The text a pending cell of the new-row slot shows. The column's own
 * renderer reads a whole row, and the slot has only the values that the user
 * entered. The slot therefore shows the value itself. @internal
 */
function pendingText(value: unknown): string {
	if (value == null) return ''

	if (typeof value === 'boolean') return value ? 'Yes' : 'No'

	return String(value)
}

/**
 * Sets the sticky offset of a new-row slot at the top of the body. The slot
 * sticks below a sticky header, so the offset is the height of the header
 * rows. With no sticky header it is zero. A resize of the header measures
 * again. @internal
 */
function useStickyTop(
	body: { current: HTMLTableSectionElement | null },
	position: 'top' | 'bottom' | undefined,
): void {
	useLayoutEffect(() => {
		const section = body.current

		const head = section?.closest('table')?.tHead

		if (!section || !head || position !== 'top') return

		const measure = () => {
			const cell = head.querySelector('th')

			const style = cell ? getComputedStyle(cell) : null

			const sticky = style?.position === 'sticky' && style.top !== 'auto'

			section.style.setProperty('--grid-new-row-top', `${sticky ? head.offsetHeight : 0}px`)
		}

		measure()

		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(measure)

		observer.observe(head)

		return () => observer.disconnect()
	}, [body, position])
}

/** Props for {@link GridNewRow}. @internal */
type GridNewRowProps<T> = {
	/** The visible columns, in display order, as the data rows render them. */
	columns: GridColumn<T>[]
	/** Frozen-column controls, so a pinned cell of the slot sticks like the data rows' cells. */
	pinning: GridColumnPinning | null
	/** The slot's `aria-rowindex`, or `undefined` where the grid sets no row indexes. */
	ariaRowIndex: number | undefined
}

/**
 * One cell of the new-row slot. It carries the cursor's cell id and ring, and
 * a press on it seats the cursor, as a data cell does. An editable column
 * mounts its editor at all times, and the last one carries the Add control.
 * While an add is in flight, each cell shows its value as pending.
 *
 * @internal
 */
function GridNewRowCell<T>({
	session,
	column,
	col,
	colIndex,
	draftRow,
	last,
	className,
	style,
}: {
	session: GridNewRowSession
	column: GridColumn<T>
	/** The cursor's column index, among the visible data columns. */
	col: number
	colIndex: number | undefined
	draftRow: T
	/** Whether this is the last editable column, which carries the Add control. */
	last: boolean
	className: string
	style: CSSProperties | undefined
}) {
	const editable = isColumnEditable(column)

	const seat = (event: MouseEvent<HTMLTableCellElement>) => {
		const inCell = event.target instanceof Node && event.currentTarget.contains(event.target)

		if (!inCell || fromInteractiveContent(event.target)) return

		event.currentTarget.closest<HTMLElement>('[role="grid"]')?.focus()

		session.moveTo({ row: NEW_ROW_INDEX, col })
	}

	let content: ReactNode = null

	if (editable && session.inFlight) {
		content = (
			<span className={cn(k.edit.host)}>
				<GridPendingCell>
					{pendingText(session.readDraft(NEW_ROW_KEY, column.id)?.value)}
				</GridPendingCell>
				{last && <GridAddRowButton addRow={session.addRow} pending />}
			</span>
		)
	} else if (editable) {
		content = (
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
				settle={last ? 'add' : 'none'}
				held={false}
				kind={column.editCell ? undefined : session.editorKind(column)}
				addRow={session.addRow}
				claimSlot={session.claimFocus}
			/>
		)
	}

	return (
		<TableCell
			id={session.cellId(NEW_ROW_INDEX, col)}
			role="gridcell"
			data-grid-new-col={String(column.id)}
			aria-colindex={colIndex}
			aria-readonly={!editable || undefined}
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
export function GridNewRow<T>({ columns, pinning, ariaRowIndex }: GridNewRowProps<T>) {
	const session = useGridNewRowSession()

	const bodyRef = useRef<HTMLTableSectionElement>(null)

	useStickyTop(bodyRef, session?.position)

	const dataColumns = useMemo(() => columns.filter(isDataColumn), [columns])

	if (!session) return null

	const lastEditable = dataColumns.findLast((column) => isColumnEditable(column))?.id

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
							last={column.id === lastEditable}
							className={className}
							style={pinned.style}
						/>
					)
				})}
			</tr>
		</tbody>
	)
}
