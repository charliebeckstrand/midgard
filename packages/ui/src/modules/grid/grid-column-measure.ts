'use client'

import type { Table } from '@tanstack/react-table'
import { isDataColumn } from '../../utilities'
import type { ColumnSizeProfile } from './grid-column-allocate'
import {
	DEFAULT_COLUMN_SIZE,
	DEFAULT_CONTENT_MAX,
	DEFAULT_MIN_COLUMN_SIZE,
	HEADER_TRUNCATE_ALLOWANCE,
} from './grid-constants'
import { parsePxWidth } from './grid-table-options'
import type { GridColumn } from './types'

/**
 * The intrinsic content width of an element's text — the width it wants before
 * any truncation clip — read sub-pixel from a `Range` over its contents, with
 * `scrollWidth` as the integer fallback where `Range` geometry is unavailable
 * (jsdom). The marked leaves (`data-grid-content`) carry no padding or border, so
 * this is their content-box width. Rounded up so a fractional pixel never clips.
 *
 * @internal
 */
function intrinsicWidth(el: HTMLElement): number {
	const range = document.createRange()

	range.selectNodeContents(el)

	if (typeof range.getBoundingClientRect === 'function') {
		const width = range.getBoundingClientRect().width

		if (width > 0) return Math.ceil(width)
	}

	return el.scrollWidth
}

/**
 * The border-box width a header needs to show its title and affordance icons
 * without truncating. The header's flex row (`data-grid-header`) distributes any
 * width the column has beyond its content as justified free space between the
 * title group and the filter button — never into an element — so the tight width
 * is the cell's current border box minus that free space, plus however much more
 * the title wants than its current (possibly clipped) box. Free space and title
 * growth are mutually exclusive (a column is either roomy or cramped), so this
 * reads the same tight width whatever the column's current width — no feedback as
 * the autosizer resizes it.
 *
 * @internal
 */
function headerWidth(th: HTMLElement, titleLeaf: HTMLElement, titleIntrinsic: number): number {
	const slot = th.querySelector<HTMLElement>('[data-grid-header]')

	if (!slot) return th.getBoundingClientRect().width

	const children = Array.from(slot.children) as HTMLElement[]

	const childrenWidth = children.reduce((sum, child) => sum + child.offsetWidth, 0)

	const gap = Number.parseFloat(getComputedStyle(slot).columnGap) || 0

	const minGaps = Math.max(0, children.length - 1) * gap

	// The free space the flex row spreads between its items beyond their natural
	// widths and the fixed gaps; subtract it to reach the tight row.
	const free = Math.max(0, slot.clientWidth - childrenWidth - minGaps)

	const titleGrowth = Math.max(0, titleIntrinsic - titleLeaf.offsetWidth)

	return th.getBoundingClientRect().width - free + titleGrowth
}

/** Whether a column title is a single whitespace-free word — the headers that never truncate. @internal */
function isSingleWordTitle(title: GridColumn<unknown>['title']): boolean {
	return typeof title === 'string' && title.trim().length > 0 && !/\s/.test(title.trim())
}

/** The rendered `<th>`/`<td>` cells grouped by their `data-grid-col` id, read once per measurement pass. @internal */
function collectCells(container: HTMLElement): {
	headers: Map<string, HTMLElement>
	bodies: Map<string, HTMLElement[]>
} {
	const headers = new Map<string, HTMLElement>()

	for (const th of container.querySelectorAll<HTMLElement>('th[data-grid-col]')) {
		const id = th.getAttribute('data-grid-col')

		if (id != null) headers.set(id, th)
	}

	const bodies = new Map<string, HTMLElement[]>()

	for (const td of container.querySelectorAll<HTMLElement>('td[data-grid-col]')) {
		const id = td.getAttribute('data-grid-col')

		if (id == null) continue

		const list = bodies.get(id)

		if (list) list.push(td)
		else bodies.set(id, [td])
	}

	return { headers, bodies }
}

/**
 * The widest content in a column's body cells, in border-box pixels. Each
 * truncating leaf (`data-grid-content`) fills its cell, so the cell's border box
 * minus the leaf's box is the cell chrome (padding + border), and the leaf's
 * intrinsic text width added back gives the border-box width the cell wants —
 * independent of the column's current width. A cell with no leaf (the editable
 * grid's mounted editor, or empty content) falls back to its own `scrollWidth`.
 *
 * @internal
 */
function bodyContentWidth(cells: HTMLElement[]): number {
	let widest = 0

	for (const td of cells) {
		const leaf = td.querySelector<HTMLElement>('[data-grid-content]')

		const need = leaf
			? td.getBoundingClientRect().width - leaf.offsetWidth + intrinsicWidth(leaf)
			: td.scrollWidth

		if (need > widest) widest = need
	}

	return widest
}

/** A measured column slice: the auto-sized columns' {@link ColumnSizeProfile}s and the summed width held by the rest. @internal */
export type ColumnMeasurement = {
	/** Profiles for the columns the allocator distributes width across. */
	profiles: ColumnSizeProfile[]
	/** Total width (px) of the columns excluded from allocation — non-data, `width`-pinned, and manually resized. */
	fixed: number
}

/** Options for {@link measureColumnIntrinsics}. @internal */
type MeasureOptions<T> = {
	table: Table<T>
	/** Visible columns in render order. */
	columns: GridColumn<T>[]
	/** Grid wrapper holding the rendered table. */
	container: HTMLElement
	/** Columns the user drag-resized; held at their current engine width, not auto-sized. */
	manualPinned: ReadonlySet<string>
	/**
	 * Per-column running-max content width (border-box), carried across passes so a
	 * wider row scrolling or paging into view only grows a column, never shrinks it
	 * (no jitter). Mutated in place; cleared by the caller on a structural change.
	 */
	runningContent: Map<string, number>
}

/**
 * Builds one auto-sized data column's {@link ColumnSizeProfile} from its rendered
 * header and body cells. The width is driven by the body content (capped so a
 * runaway cell can't starve the rest, then folded into the running max so a wider
 * row paging in only grows the column); the header's policy lives entirely in the
 * `min` floor — a single-word header reserves its full width, so the column is at
 * least that wide and the header never truncates, while a multi-word or
 * non-string header reserves only its affordance icons plus a small text
 * allowance, so a column with narrow data stays narrow and that header truncates.
 * `max` is the column's `maxWidth`, else unbounded — which also lifts the content
 * cap, an explicit ceiling being deliberate.
 *
 * @internal
 */
function columnProfile<T>(
	col: GridColumn<T>,
	th: HTMLElement | undefined,
	cells: HTMLElement[],
	runningContent: Map<string, number>,
): ColumnSizeProfile {
	const id = String(col.id)

	const titleLeaf = th?.querySelector<HTMLElement>('[data-grid-content]') ?? null

	const titleIntrinsic = titleLeaf ? intrinsicWidth(titleLeaf) : 0

	const header =
		th && titleLeaf
			? headerWidth(th, titleLeaf, titleIntrinsic)
			: (th?.getBoundingClientRect().width ?? 0)

	const max = col.maxWidth ?? Number.MAX_SAFE_INTEGER

	const headerFloor = isSingleWordTitle(col.title)
		? header
		: Math.max(0, header - titleIntrinsic) + HEADER_TRUNCATE_ALLOWANCE

	const min = Math.min(Math.max(headerFloor, col.minWidth ?? DEFAULT_MIN_COLUMN_SIZE), max)

	// Body content drives the width (capped); the header floor is always honored, so
	// a single-word header still fits while a multi-word one truncates to the data.
	const cap = col.maxWidth ?? DEFAULT_CONTENT_MAX

	const measured = Math.max(min, Math.min(bodyContentWidth(cells), cap))

	const content = Math.max(measured, runningContent.get(id) ?? 0)

	runningContent.set(id, content)

	return { id, min, content, max }
}

/** Whether a column is auto-sized — a data column with neither a `width` override nor a manual drag-resize. @internal */
function isAutoSized<T>(col: GridColumn<T>, manualPinned: ReadonlySet<string>): boolean {
	return isDataColumn(col) && parsePxWidth(col.width) == null && !manualPinned.has(String(col.id))
}

/**
 * Reads the rendered grid and resolves, per auto-sized data column, the
 * {@link ColumnSizeProfile} the allocator needs (see {@link columnProfile}).
 * Non-data columns (selection / actions), `width`-pinned columns, and manually
 * drag-resized columns are excluded and their widths summed into `fixed` for the
 * caller to reserve.
 *
 * Measurements are read from the live DOM unclipped by the current column widths
 * (see {@link headerWidth} / {@link bodyContentWidth}), so re-measuring after the
 * autosizer resizes a column yields the same profile — no feedback loop.
 *
 * @internal
 */
export function measureColumnIntrinsics<T>({
	table,
	columns,
	container,
	manualPinned,
	runningContent,
}: MeasureOptions<T>): ColumnMeasurement {
	const { headers, bodies } = collectCells(container)

	const profiles: ColumnSizeProfile[] = []

	let fixed = 0

	for (const col of columns) {
		const id = String(col.id)

		if (isAutoSized(col, manualPinned)) {
			profiles.push(columnProfile(col, headers.get(id), bodies.get(id) ?? [], runningContent))
		} else {
			// Non-data, `width`-pinned, and manually resized columns keep their engine
			// width and sit out the distribution.
			fixed += table.getColumn(id)?.getSize() ?? DEFAULT_COLUMN_SIZE
		}
	}

	return { profiles, fixed }
}
