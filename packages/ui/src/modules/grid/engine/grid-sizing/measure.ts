import { clamp, isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { DEFAULT_MIN_COLUMN_SIZE, HEADER_TRUNCATE_ALLOWANCE } from '../grid-constants'

/**
 * The intrinsic content width of an element's text — the width it wants before
 * any truncation clip. It is read sub-pixel from a `Range` over its contents.
 * `scrollWidth` is the integer fallback where `Range` geometry is unavailable
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

	const childrenWidth = children.reduce((sum, child) => sum + child.offsetWidth, 0)

	const minGaps = Math.max(0, children.length - 1) * slotGap

	// The free space the flex row spreads between its items beyond their natural
	// widths and the fixed gaps; subtract it to reach the tight row.
	const free = Math.max(0, slot.clientWidth - childrenWidth - minGaps)

	const titleGrowth = Math.max(0, titleIntrinsic - titleLeaf.offsetWidth)

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

/** Whether a column title is a single whitespace-free word — the headers that never truncate. @internal */
function isSingleWordTitle(title: GridColumn<unknown>['title']): boolean {
	return typeof title === 'string' && title.trim().length > 0 && !/\s/.test(title.trim())
}

/** The rendered `<th>`/`<td>` cells grouped by their `data-grid-col` id, read once per measurement pass. @internal */
function collectCells(container: HTMLElement): {
	headers: Map<string, HTMLElement>
	bodies: Map<string, HTMLElement[]>
	/** Body cells found across every column — zero when the body rendered none. */
	cells: number
} {
	const headers = new Map<string, HTMLElement>()

	for (const th of container.querySelectorAll<HTMLElement>('th[data-grid-col]')) {
		const id = th.getAttribute('data-grid-col')

		if (id != null) headers.set(id, th)
	}

	const bodies = new Map<string, HTMLElement[]>()

	let cells = 0

	for (const td of container.querySelectorAll<HTMLElement>('td[data-grid-col]')) {
		const id = td.getAttribute('data-grid-col')

		if (id == null) continue

		cells++

		const list = bodies.get(id)

		if (list) list.push(td)
		else bodies.set(id, [td])
	}

	return { headers, bodies, cells }
}

/**
 * A body leaf whose contents include element children (a Badge, an icon row, a
 * composed cell), deferred to the batched `max-content` read — see
 * {@link resolvePendingLeaves}. `chrome` is its cell's padding and border (the
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
 * @internal
 */
type ColumnScan = { widest: number; pending: PendingLeaf[] }

/**
 * Scans a column's body cells against the current layout, in border-box pixels.
 * Each truncating leaf (`data-grid-content`) fills its cell. The cell's border
 * box minus the leaf's box is therefore the cell chrome (padding + border). The
 * leaf's content width added back gives the width the cell wants.
 *
 * A text-only leaf resolves here. Clipped or not, `nowrap` text lays out at its
 * full width under the overflow, so its intrinsic width (see
 * {@link intrinsicWidth}) reads true in place. A leaf holding element children
 * does not. An atomic shrink-to-fit box (a Badge's `fit-content`) genuinely
 * narrows into a tight cell. Its in-place rect therefore reports the shrunk
 * width, not the natural one. Those leaves defer to
 * {@link resolvePendingLeaves}. A cell with no
 * leaf (the editable grid's mounted editor, or empty content) falls back to its
 * own `scrollWidth`.
 *
 * @internal
 */
function scanBodyCells(cells: HTMLElement[]): ColumnScan {
	let widest = 0

	const pending: PendingLeaf[] = []

	for (const td of cells) {
		const leaf = td.querySelector<HTMLElement>('[data-grid-content]')

		if (!leaf) {
			if (td.scrollWidth > widest) widest = td.scrollWidth

			continue
		}

		const chrome = td.getBoundingClientRect().width - leaf.offsetWidth

		if (leaf.childElementCount > 0) {
			pending.push({ leaf, chrome })
		} else {
			const need = chrome + intrinsicWidth(leaf)

			if (need > widest) widest = need
		}
	}

	return { widest, pending }
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

	const prior = pending.map(({ leaf }) => leaf.style.width)

	for (const { leaf } of pending) leaf.style.width = 'max-content'

	for (const scan of scans) {
		for (const { leaf, chrome } of scan.pending) {
			const need = chrome + (Math.ceil(leaf.getBoundingClientRect().width) || leaf.scrollWidth)

			if (need > scan.widest) scan.widest = need
		}
	}

	for (const [i, { leaf }] of pending.entries()) leaf.style.width = prior[i] ?? ''
}

/**
 * A data column's hard floor (px): the narrowest it can be sized — by the
 * allocator or a drag-resize — before its header can't show. A single-word title
 * reserves its full width, so the column is at least that wide and the header
 * never truncates. A multi-word or non-string title reserves only its affordance
 * icons plus a small text allowance. A narrow-data column then stays narrow, and
 * that header truncates. Clamped up to the column's declared `minWidth` and down
 * to its `maxWidth`. It is read from the header DOM unclipped by the column's
 * current width (see {@link headerWidth}). A wide column therefore reports the
 * tight floor, not its current size. It is the same floor whatever width it
 * holds.
 *
 * @internal
 */
function columnFloor<T>(col: GridColumn<T>, th: HTMLElement | undefined, slotGap: number): number {
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

	return clamp(headerFloor, col.minWidth ?? DEFAULT_MIN_COLUMN_SIZE, max)
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
	 * The widest body cell (px, border box, rounded up) of each scanned column.
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

	const scans = new Map<string, ColumnScan>()

	// Pass one: every read against the current layout — header floors and body
	// scans — before the batched leaf widening below dirties it.
	for (const col of columns) {
		if (!isDataColumn(col)) continue

		const id = String(col.id)

		floors.set(id, Math.ceil(columnFloor(col, headers.get(id), slotGap)))

		const cellsOfColumn = bodies.get(id)

		if (scan.has(id) && cellsOfColumn) scans.set(id, scanBodyCells(cellsOfColumn))
	}

	// Pass two: widen the element-bearing leaves to `max-content` and read the
	// widths the clipped layout could not show (a Badge shrunk into a narrow cell).
	resolvePendingLeaves([...scans.values()])

	const widest = new Map<string, number>()

	// Every width rounds up, so that a fractional pixel never clips the content.
	for (const [id, { widest: width }] of scans) widest.set(id, Math.ceil(width))

	return { floors, bodies: widest, cells }
}
