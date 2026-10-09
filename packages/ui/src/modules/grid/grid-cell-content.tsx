'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { GridCellEditingContext, useGridResizing, useGridSettle } from './context'
import type { CellTooltip } from './engine/grid-row/cell'
import { cellContentAt, type GridIndexedColumn, resolveCellTooltip } from './engine/grid-row/cell'
import { searchedContent } from './grid-highlight-utilities'
import { useGridTruncation } from './use-grid-truncation'

/** Props for {@link GridCellContent}. @internal */
type GridCellContentProps = {
	content: ReactNode
	tooltip: CellTooltip
	/**
	 * The id of this cell's column. A visited cell subscribes to that column's
	 * settled width (see {@link useGridSettle}), and measures its overflow again
	 * when a resize or a keyboard nudge settles it.
	 */
	columnId: string
}

/**
 * Renders a data cell's content on one line, truncated to an ellipsis when it
 * overflows the column width. A truncated cell gains a hover/focus
 * {@link Tooltip} carrying the full content — or a column's `cellTooltip` node in
 * its place — while `none` suppresses it.
 *
 * @remarks The tooltip machinery mounts on first pointer/focus contact with a
 * cell that measures truncated, not with the cell. The reveal it drives cannot
 * open before contact, or without a clip. The full floating stack also costs
 * real render time per cell. At a few hundred visible cells it was the largest
 * single term in the grid's mount and scroll cost. The wrap reparents the span
 * at that mount. The `useTruncation` callback ref re-binds its overflow observer
 * to the replacement node. Widening a column back out therefore still
 * re-measures and closes the reveal, the hazard that once kept the tooltip
 * permanently mounted. Truncation measurement also stands down entirely while
 * a drag-resize is in flight — the reveal is held closed through the drag, and
 * the settle re-measures.
 * @internal
 */
export function GridCellContent({ content, tooltip, columnId }: GridCellContentProps) {
	const settle = useGridSettle()

	const onSettle = useMemo(
		() => (settle ? (listener: () => void) => settle.subscribe(columnId, listener) : undefined),
		[settle, columnId],
	)

	// The drag state is read when the cell measures, not rendered, so the start
	// and the end of a drag do not render each cell again.
	const [ref, truncated, contacted] = useGridTruncation<HTMLSpanElement>(onSettle, settle?.resizing)

	// Whether the content holds an open editor (see `GridCellEditingContext`).
	const [editing, setEditing] = useState(false)

	const editingContext = useMemo(() => ({ editing, markEditing: setEditing }), [editing])

	const reveal = tooltip.kind !== 'none' && contacted && truncated

	// Mount the reveal machinery only for a cell that is both visited and
	// actually clipped. The wrap reparents the span, and a reparent tears down
	// the live state below it: an in-place editor, focused and holding a draft.
	// An open editor therefore freezes the wrap as it is. The focus of the
	// editor is the first contact of a cell that the keyboard entered, and the
	// editor can measure clipped: a narrow column clips it, and the fill handle
	// sits past the box of the span. The wrap follows the measure again when the
	// editor closes.
	const [wrapped, setWrapped] = useState(reveal)

	if (!editing && wrapped !== reveal) setWrapped(reveal)

	const span = (
		// `data-grid-content` marks the truncating leaf so the column autosizer can
		// read its intrinsic content width (`scrollWidth`/`Range`), unclipped by the
		// column it's measuring.
		// An open editor lets the span overflow (see `k.cell.editing`).
		<span ref={ref} data-grid-content className={editing ? EDITING_CLASS : TRUNCATE_CLASS}>
			<GridCellEditingContext value={editingContext}>{content}</GridCellEditingContext>
		</span>
	)

	if (!wrapped) return span

	return (
		<GridCellReveal node={tooltip.kind === 'custom' ? tooltip.node : content} editing={editing}>
			{span}
		</GridCellReveal>
	)
}

/**
 * The truncation tooltip of a visited, clipped cell. It alone subscribes to the
 * drag state, so a drag renders again only the cells that show a reveal.
 *
 * @internal
 */
function GridCellReveal({
	node,
	editing,
	children,
}: {
	node: ReactNode
	/** Whether the cell holds an open editor, which the reveal must not show again. */
	editing: boolean
	children: ReactNode
}) {
	const resizing = useGridResizing()

	return (
		// `resizing` holds the tooltip closed through a column drag-resize: the
		// drag reflows the column, and the overflow tooltip would otherwise flash
		// open over the content the resize is reshaping. An open editor holds it
		// closed too: the reveal shows the content of the cell, not a second editor.
		<Tooltip disabled={resizing || editing}>
			<TooltipTrigger>{children}</TooltipTrigger>

			<TooltipContent className={TOOLTIP_CLASS}>{node}</TooltipContent>
		</Tooltip>
	)
}

/** The static truncating-span class, composed once — not per rendered cell. @internal */
const TRUNCATE_CLASS = cn(k.cell.truncate)

/** The span class while it holds an open editor, which lets the content overflow. @internal */
const EDITING_CLASS = cn(k.cell.editing)

/** The static tooltip-content class, composed once. @internal */
const TOOLTIP_CLASS = cn(k.cell.tooltip)

/**
 * The body of a data cell, on a flat row and on a group leaf: the content of
 * the column, with the matches of the highlight search marked, in the
 * truncation reveal unless the grid opts out. A column with no `cell` gives
 * `null`, and the cell stays bare.
 *
 * @internal
 */
export function cellBody<T>(
	col: GridIndexedColumn<T>,
	row: T,
	rowIndex: number,
	truncate: boolean,
): ReactNode {
	const content = searchedContent(col, cellContentAt(col, row, rowIndex))

	if (!truncate || content == null) return content

	return (
		<GridCellContent
			content={content}
			tooltip={resolveCellTooltip(col, row)}
			columnId={String(col.id)}
		/>
	)
}
