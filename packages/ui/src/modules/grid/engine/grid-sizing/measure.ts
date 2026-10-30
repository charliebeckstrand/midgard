import { clamp, getOrCompute, isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { DEFAULT_MIN_COLUMN_SIZE, HEADER_TRUNCATE_ALLOWANCE } from '../grid-constants'
import { parsePxWidth } from '../grid-table/resize-view'

/**
 * The one `Range` that each intrinsic-width read selects into. A new `Range`
 * for each read costs more than the read. {@link measureColumns} collapses it
 * to the document start after each pass, so it holds no node of the grid
 * between passes.
 */
let sharedRange: Range | null = null

/**
 * The intrinsic content width of an element's text: the width it wants before
 * any truncation clip. It is read sub-pixel from a `Range` over its contents, so
 * it is the width that the browser lays out. `scrollWidth` is the integer
 * fallback where `Range` geometry is unavailable (jsdom). The marked leaves
 * (`data-grid-content`) carry no padding or border, so this is their content-box
 * width.
 *
 * @internal
 */
function intrinsicWidth(el: HTMLElement): number {
	sharedRange ??= document.createRange()

	const range = sharedRange

	range.selectNodeContents(el)

	if (typeof range.getBoundingClientRect === 'function') {
		const width = range.getBoundingClientRect().width

		if (width > 0) return width
	}

	return el.scrollWidth
}

/**
 * The border-box width a header needs to show its title and affordance icons
 * without truncating. The header's flex row (`data-grid-header`) distributes any
 * width the column has beyond its content as justified free space. That space
 * sits between the title group and the filter button, never inside an element.
 * The tight width is therefore the cell's current border box minus that free
 * space. It adds however much more the title wants than its current (possibly
 * clipped) box. Free space and title growth are mutually exclusive, because a
 * column is either roomy or cramped. This therefore reads the same tight width
 * whatever the column's current width. There is no feedback as the autosizer
 * resizes it.
 *
 * `slotGap` is the flex row's `column-gap` (px). It is passed in because one
 * recipe class sets it, so it is identical across columns. It is read once per
 * pass, rather than recomputed (a forced style flush) per column.
 *
 * @internal
 */
function headerWidth(
	th: HTMLElement,
	titleLeaf: HTMLElement,
	titleIntrinsic: number,
	slotGap: number,
): number {
	const slot = th.querySelector<HTMLElement>('[data-grid-header]')

	if (!slot) return th.getBoundingClientRect().width

	const children = [...slot.children] as HTMLElement[]

	const childrenWidth = children.reduce(
		(sum, child) => sum + child.getBoundingClientRect().width,
		0,
	)

	const minGaps = Math.max(0, children.length - 1) * slotGap

	// The free space the flex row spreads between its items beyond their natural
	// widths and the fixed gaps; subtract it to reach the tight row.
	const free = Math.max(0, slot.getBoundingClientRect().width - childrenWidth - minGaps)

	const titleGrowth = Math.max(0, titleIntrinsic - titleLeaf.getBoundingClientRect().width)

	return th.getBoundingClientRect().width - free + titleGrowth
}

/**
 * The header flex row's `column-gap` in px, read once per measurement pass from
 * the first header that carries a `data-grid-header` slot. The gap comes from one
 * recipe class, so every column's slot shares it. Reading it per column would
 * force a style flush for each (see {@link headerWidth}). Zero when no header is
 * rendered.
 *
 * @internal
 */
function headerSlotGap(headers: Map<string, HTMLElement>): number {
	for (const th of headers.values()) {
		const slot = th.querySelector<HTMLElement>('[data-grid-header]')

		if (slot) return Number.parseFloat(getComputedStyle(slot).columnGap) || 0
	}

	return 0
}

/** Whether a column title is a single whitespace-free word: the headers that never truncate. @internal */
function isSingleWordTitle(title: GridColumn<unknown>['title']): boolean {
	return typeof title === 'string' && title.trim().length > 0 && !/\s/.test(title.trim())
}

/**
 * A cell of the grid itself. A detail panel can hold a nested grid, and a
 * column id can be the same in the two grids. The selector therefore reads no
 * cell in a detail row below `:scope`.
 *
 * @internal
 */
const OWN_CELL = ':not(:scope [data-detail-row] *)'

/**
 * The rendered header cell of each column, by its id. A data header carries
 * `data-grid-col`. The header of a non-data column carries `data-grid-fit` in
 * its place. A band cell of a column group carries neither.
 *
 * @internal
 */
export function collectHeaders(container: HTMLElement): Map<string, HTMLElement> {
	const headers = new Map<string, HTMLElement>()

	for (const th of container.querySelectorAll<HTMLElement>(`th[data-grid-col]${OWN_CELL}`)) {
		const id = th.getAttribute('data-grid-col')

		if (id != null) headers.set(id, th)
	}

	for (const th of container.querySelectorAll<HTMLElement>(`th[data-grid-fit]${OWN_CELL}`)) {
		const id = th.getAttribute('data-grid-fit')

		if (id != null) headers.set(id, th)
	}

	return headers
}

/**
 * The rendered `<th>`/`<td>` cells grouped by their `data-grid-col` id, read once per
 * measurement pass. The headers also hold the `data-grid-fit` header of each non-data
 * column (see {@link collectHeaders}).
 *
 * @internal
 */
function collectCells(container: HTMLElement): {
	headers: Map<string, HTMLElement>
	bodies: Map<string, HTMLElement[]>
	/** Body cells found across every column: zero when the body rendered none. */
	cells: number
} {
	const headers = collectHeaders(container)

	const bodies = new Map<string, HTMLElement[]>()

	let cells = 0

	for (const td of container.querySelectorAll<HTMLElement>(`td[data-grid-col]${OWN_CELL}`)) {
		const id = td.getAttribute('data-grid-col')

		if (id == null) continue

		cells++

		getOrCompute(bodies, id, () => []).push(td)
	}

	return { headers, bodies, cells }
}

/**
 * A body leaf whose contents include element children (a Badge, an icon row, a
 * composed cell), deferred to the batched `max-content` read (see
 * {@link resolvePendingLeaves}). `chrome` is its cell's padding and border (the
 * cell border box minus the leaf's), captured while the leaf still fills the
 * cell.
 *
 * @internal
 */
type PendingLeaf = { leaf: HTMLElement; chrome: number }

/**
 * One column's body scan: the widest content need resolved against the current
 * layout (text-only and leafless cells). It also holds the element-bearing
 * leaves awaiting the batched `max-content` read, which folds into `widest`.
 *
 * `least` is the widest need of the leaves alone, as the automatic table layout
 * reads it: not rounded, and with each leaf inside its `max-width` (`cap`). It
 * is `0` when the column rendered no leaf.
 *
 * @internal
 */
type ColumnScan = { widest: number; least: number; cap: number; pending: PendingLeaf[] }

/**
 * Whether a leaf holds an element child that lays out a box. A `hidden` child (the
 * navigable cell's locator span) has no box, so it cannot narrow into a tight
 * cell, and a leaf with only such children reads true in place like text.
 *
 * @internal
 */
function laysOutElements(leaf: HTMLElement): boolean {
	for (const child of leaf.children) {
		if (!(child instanceof HTMLElement) || !child.hidden) return true
	}

	return false
}

/**
 * Scans a column's body cells against the current layout, in border-box pixels.
 * Each truncating leaf (`data-grid-content`) fills its cell. The cell's border
 * box minus the leaf's box is therefore the cell chrome (padding + border). The
 * leaf's content width added back gives the width the cell wants.
 *
 * A text-only leaf resolves here. Clipped or not, `nowrap` text lays out at its
 * full width under the overflow, so its intrinsic width (see
 * {@link intrinsicWidth}) reads true in place. A leaf holding element children
 * that lay out (see {@link laysOutElements}) does not. An atomic shrink-to-fit
 * box (a Badge's `fit-content`) genuinely narrows into a tight cell. Its
 * in-place rect therefore reports the shrunk width, not the natural one. Those
 * leaves defer to {@link resolvePendingLeaves}. A cell with no leaf (the
 * editable grid's mounted editor, or empty content) falls back to its own
 * `scrollWidth`.
 *
 * @internal
 */
function scanBodyCells(cells: HTMLElement[]): ColumnScan {
	let widest = 0

	let least = 0

	let cap: number | undefined

	const pending: PendingLeaf[] = []

	for (const td of cells) {
		const leaf = td.querySelector<HTMLElement>('[data-grid-content]')

		if (!leaf) {
			if (td.scrollWidth > widest) widest = td.scrollWidth

			continue
		}

		// One recipe class caps each leaf of a column, so the first leaf gives the cap.
		cap ??= leafCap(leaf)

		const chrome = td.getBoundingClientRect().width - leaf.getBoundingClientRect().width

		if (laysOutElements(leaf)) {
			pending.push({ leaf, chrome })
		} else {
			const width = intrinsicWidth(leaf)

			widest = Math.max(widest, chrome + width)

			least = Math.max(least, chrome + Math.min(width, cap))
		}
	}

	return { widest, least, cap: cap ?? Number.POSITIVE_INFINITY, pending }
}

/**
 * The `max-width` (px) of a body leaf, or infinity when it has none. The fit
 * classes cap a leaf in the automatic table layout (see `k.fit.cap`).
 *
 * @internal
 */
function leafCap(leaf: HTMLElement): number {
	const cap = Number.parseFloat(getComputedStyle(leaf).maxWidth)

	return Number.isFinite(cap) ? cap : Number.POSITIVE_INFINITY
}

/**
 * Resolves the deferred element-bearing leaves (see {@link scanBodyCells}) by
 * briefly laying each out at `width: max-content`. Every leaf widens in one
 * write pass, every rect is read in one pass (a single forced layout), then the
 * inline widths revert. All of it is synchronous inside the measurement, so
 * nothing paints mid-flight and the truncation observers see no net change.
 * Widening frees a shrink-to-fit child to its natural width, which the clipped
 * in-place rect can't report, and folds each leaf's `chrome + width` into its
 * column's `widest`. `scrollWidth` stands in where rect geometry is unavailable
 * (jsdom), matching {@link intrinsicWidth}.
 *
 * @internal
 */
function resolvePendingLeaves(scans: readonly ColumnScan[]): void {
	const pending = scans.flatMap((scan) => scan.pending)

	if (pending.length === 0) return

	const prior = pending.map(({ leaf }) => [leaf.style.width, leaf.style.contain] as const)

	// A held leaf contains its inline size (see `k.fit.held`), and a contained box has
	// no `max-content` width of its own.
	for (const { leaf } of pending) {
		leaf.style.width = 'max-content'

		leaf.style.contain = 'none'
	}

	for (const scan of scans) {
		for (const { leaf, chrome } of scan.pending) {
			const width = leaf.getBoundingClientRect().width || leaf.scrollWidth

			scan.widest = Math.max(scan.widest, chrome + width)

			scan.least = Math.max(scan.least, chrome + Math.min(width, scan.cap))
		}
	}

	for (const [index, { leaf }] of pending.entries()) {
		leaf.style.width = prior[index]?.[0] ?? ''

		leaf.style.contain = prior[index]?.[1] ?? ''
	}
}

/**
 * The lower bound (px) of the width of a data column: its `minWidth`, else
 * {@link DEFAULT_MIN_COLUMN_SIZE} or a declared px `width` below it. The engine
 * `minSize` and the measured floor (see {@link columnFloor}) both read it, so a
 * narrow column keeps its declared width.
 *
 * @internal
 */
export function columnMinWidth<T>(col: GridColumn<T>): number {
	if (col.minWidth != null) return col.minWidth

	return Math.min(DEFAULT_MIN_COLUMN_SIZE, parsePxWidth(col.width) ?? DEFAULT_MIN_COLUMN_SIZE)
}

/**
 * A data column's hard floor (px): the narrowest it can be sized (by the
 * automatic fit or a drag-resize) before its header can't show. A single-word title
 * reserves its full width, so the column is at least that wide and the header
 * never truncates. A multi-word or non-string title reserves only its affordance
 * icons plus a small text allowance. A drag can then narrow a narrow-data column, and
 * that header truncates. Clamped up to the lower bound of the column (see
 * {@link columnMinWidth}) and down to its `maxWidth`. It is read from the header
 * DOM unclipped by the column's current width (see {@link headerWidth}). A wide column therefore reports the
 * tight floor, not its current size. It is the same floor whatever width it
 * holds.
 *
 * `header` is the width (px) that the header needs to show its title in full. The
 * automatic table layout gives a column at least this width, so the content width
 * of a column includes it (see `contentWidth`).
 *
 * @internal
 */
function columnFloor<T>(
	col: GridColumn<T>,
	th: HTMLElement | undefined,
	slotGap: number,
): { floor: number; header: number } {
	const titleLeaf = th?.querySelector<HTMLElement>('[data-grid-content]') ?? null

	const titleIntrinsic = titleLeaf ? intrinsicWidth(titleLeaf) : 0

	const header =
		th && titleLeaf
			? headerWidth(th, titleLeaf, titleIntrinsic, slotGap)
			: (th?.getBoundingClientRect().width ?? 0)

	const max = col.maxWidth ?? Number.MAX_SAFE_INTEGER

	const headerFloor = isSingleWordTitle(col.title)
		? header
		: Math.max(0, header - titleIntrinsic) + HEADER_TRUNCATE_ALLOWANCE

	return { floor: clamp(headerFloor, columnMinWidth(col), max), header }
}

/**
 * The horizontal padding and border (px) of a cell: what the cell adds around a
 * box of content.
 *
 * @internal
 */
export function cellChrome(cell: HTMLElement): number {
	const style = getComputedStyle(cell)

	return [
		style.paddingInlineStart,
		style.paddingInlineEnd,
		style.borderInlineStartWidth,
		style.borderInlineEndWidth,
	].reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0)
}

/**
 * Whether a column takes the width of its content and no more: a non-data
 * column (selection, actions, drag handle, expander) that declares no `width`.
 * It sits out the fill, so it gets none of the spare width.
 *
 * @internal
 */
export function isContentSized<T>(col: GridColumn<T>): boolean {
	return !isDataColumn(col) && col.width == null
}

/**
 * The content width (px) of each {@link isContentSized} column, read from its
 * `data-grid-fit` boxes. Each box is `max-content` wide, whatever the width of
 * its column. A body box adds the padding and border of its cell. The header
 * reads its tight width (see {@link headerWidth}), so a column title shows in
 * full. A column with no box and no header has no entry.
 *
 * @internal
 */
function fitWidths<T>(
	columns: readonly GridColumn<T>[],
	container: HTMLElement,
	headers: Map<string, HTMLElement>,
	slotGap: number,
): Map<string, number> {
	const widths = new Map<string, number>()

	const ids = new Set(columns.filter(isContentSized).map((col) => String(col.id)))

	if (ids.size === 0) return widths

	const fold = (id: string, width: number) => {
		widths.set(id, Math.max(widths.get(id) ?? 0, width))
	}

	// The chrome of the first cell of each column. One recipe class pads every cell
	// of a column, so one computed style read serves the column.
	const chromes = new Map<string, number>()

	for (const box of container.querySelectorAll<HTMLElement>(`td [data-grid-fit]${OWN_CELL}`)) {
		const id = box.getAttribute('data-grid-fit')

		const cell = box.closest('td')

		if (id == null || !ids.has(id) || !cell) continue

		const chrome = getOrCompute(chromes, id, () => cellChrome(cell))

		fold(id, chrome + box.getBoundingClientRect().width)
	}

	for (const id of ids) {
		const th = headers.get(id)

		const titleLeaf = th?.querySelector<HTMLElement>('[data-grid-content]')

		if (th && titleLeaf) fold(id, headerWidth(th, titleLeaf, intrinsicWidth(titleLeaf), slotGap))
	}

	return widths
}

/**
 * The facts one measurement pass reads from the rendered grid. It holds no
 * decision: no content cap, no hold, and no running maximum. The sizer applies
 * those rules (see {@link createColumnSizer}), so a cached fact stays true when
 * the holds change.
 *
 * @internal
 */
export type ColumnMeasurement = {
	/** The hard floor (px) of every data column the pass saw (see {@link columnFloor}). */
	floors: Map<string, number>
	/**
	 * The widest cell (px, border box) of each scanned column: a body cell, or the
	 * header with its title in full (see {@link columnFloor}).
	 * A scanned column that rendered no body cell has no entry.
	 */
	bodies: Map<string, number>
	/**
	 * The body cells the pass found, across every column. Zero means that the
	 * body rendered none:
	 *
	 * - A loading skeleton, whose placeholder cells carry no column id.
	 * - An empty result.
	 * - A virtualized window that has not landed yet.
	 *
	 * The pass then saw no content. The sizer treats such a pass as provisional
	 * and measures again at the next trigger.
	 */
	cells: number
	/** The content width (px) of each {@link isContentSized} column (see {@link fitWidths}). */
	fits: Map<string, number>
	/**
	 * The widest body leaf (px, border box of its cell) of each scanned column, as
	 * the automatic table layout reads it: not rounded, and inside the `max-width`
	 * of the leaf. A scanned column that rendered no leaf has no entry. These are
	 * the least widths of the automatic layout (see `createColumnSizer`).
	 */
	leaves: Map<string, number>
	/** The rendered width (px, border box) of the header cell of each scanned column. */
	rendered: Map<string, number>
}

/**
 * Reads the {@link ColumnMeasurement} of the rendered grid. Every data column
 * in `columns` gets a floor. Only the columns in `scan` get a body scan, because
 * a held column needs no content width.
 *
 * The reads do not depend on the current column widths (see
 * {@link headerWidth} and {@link scanBodyCells}). A pass after a resize therefore
 * reads the same facts, and no feedback loop occurs. Every read against the
 * current layout lands first. An element-bearing leaf, whose shrink-to-fit
 * content clips with the cell, then gets one batched widen-read-revert (see
 * {@link resolvePendingLeaves}).
 *
 * @internal
 */
export function measureColumns<T>({
	columns,
	container,
	scan,
}: {
	/** Visible columns in render order. */
	columns: readonly GridColumn<T>[]
	/** Grid wrapper that holds the rendered table. */
	container: HTMLElement
	/** Ids of the columns whose body cells the pass reads. */
	scan: ReadonlySet<string>
}): ColumnMeasurement {
	const { headers, bodies, cells } = collectCells(container)

	// The header flex row's `column-gap` is identical across columns (one recipe
	// class), so read it once for the whole pass instead of per column.
	const slotGap = headerSlotGap(headers)

	const floors = new Map<string, number>()

	// The width that each data header needs to show its title in full.
	const titles = new Map<string, number>()

	const scans = new Map<string, ColumnScan>()

	// Pass one: every read against the current layout (header floors and body
	// scans) before the batched leaf widening below dirties it.
	for (const col of columns) {
		if (!isDataColumn(col)) continue

		const id = String(col.id)

		const { floor, header } = columnFloor(col, headers.get(id), slotGap)

		floors.set(id, floor)

		titles.set(id, header)

		const cellsOfColumn = bodies.get(id)

		if (scan.has(id) && cellsOfColumn) scans.set(id, scanBodyCells(cellsOfColumn))
	}

	const fits = fitWidths(columns, container, headers, slotGap)

	// Pass two: widen the element-bearing leaves to `max-content` and read the
	// widths the clipped layout could not show (a Badge shrunk into a narrow cell).
	resolvePendingLeaves([...scans.values()])

	const widest = new Map<string, number>()

	const leaves = new Map<string, number>()

	const rendered = new Map<string, number>()

	// No width rounds. Each one is the width that the browser lays out, so an
	// auto-size action gives a column the width of the automatic layout. That
	// layout also shows each title in full.
	for (const [id, { widest: width, least }] of scans) {
		widest.set(id, Math.max(width, titles.get(id) ?? 0))

		if (least > 0) leaves.set(id, least)

		const th = headers.get(id)

		if (th) rendered.set(id, th.getBoundingClientRect().width)
	}

	// A collapse alone keeps a boundary in the last leaf. A boundary at the
	// document start collapses the range there and releases that leaf.
	sharedRange?.setEnd(document, 0)

	return { floors, bodies: widest, cells, fits, leaves, rendered }
}
