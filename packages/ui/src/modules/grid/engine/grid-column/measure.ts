import type { Table } from '@tanstack/react-table'
import { clamp, isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import {
	DEFAULT_COLUMN_SIZE,
	DEFAULT_CONTENT_MAX,
	DEFAULT_MIN_COLUMN_SIZE,
	HEADER_TRUNCATE_ALLOWANCE,
} from '../grid-constants'
import { isFrozen } from '../grid-pin/overrides'
import { parsePxWidth } from '../grid-table/options'
import type { ColumnSizeProfile } from './allocate'

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

/** A measured column slice: the auto-sized columns' {@link ColumnSizeProfile}s, the summed width held by the rest, and every data column's floor. @internal */
export type ColumnMeasurement = {
	/** Profiles for the columns the allocator distributes width across. */
	profiles: ColumnSizeProfile[]
	/** Total width (px) of the columns excluded from allocation — non-data, `width`-held, and manually resized. */
	fixed: number
	/** Per-data-column hard floor (px) — held and auto-sized alike — the width a drag-resize cannot cross (see {@link columnFloor}). */
	floors: Map<string, number>
	/**
	 * Body cells the pass read. Zero means the body rendered none:
	 *
	 * - A loading skeleton, whose placeholder cells carry no column id.
	 * - An empty result.
	 * - A virtualized window that hasn't landed yet.
	 *
	 * The pass then saw no content at all, and every profile fell back to its
	 * header floor. Such a measurement is provisional: the caller re-measures
	 * rather than reusing or freezing it.
	 */
	cells: number
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
	/** Columns whose `width` seed the user released via "Auto-size all columns"; they auto-size again instead of holding `width`. */
	released: ReadonlySet<string>
	/**
	 * Per-column running-max content width (border-box), carried across passes. A
	 * wider row scrolling or paging into view therefore only grows a column, never
	 * shrinks it (no jitter). Mutated in place; cleared by the caller on a
	 * structural change.
	 */
	runningContent: Map<string, number>
	/**
	 * Columns measured to their full content width. The automatic fit's
	 * runaway-cell cap ({@link DEFAULT_CONTENT_MAX}) lifts to each column's own
	 * `maxWidth`. A user-invoked fit ("Auto-size this column" / "Auto-size all
	 * columns") therefore lands on the smallest width that shows the content
	 * untruncated.
	 * Absent for the automatic passes, which keep the cap.
	 */
	uncapped?: ReadonlySet<string>
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
 * Builds one auto-sized data column's {@link ColumnSizeProfile} from its `floor`
 * (see {@link columnFloor}) and measured body width (see {@link scanBodyCells}).
 * The width is driven by the body content. It is capped so a runaway cell can't
 * starve the rest. It is then folded into the running max, so a wider row paging
 * in only grows the column. The floor is always honored, so a single-word header
 * still fits while a multi-word one truncates to the data. `max` is the column's
 * `maxWidth`, else unbounded — which also lifts the content cap, an explicit
 * ceiling being deliberate. An `uncapped` column (a user-invoked fit) lifts the
 * cap the same way. Showing the content whole is the point of the action, and a
 * horizontal overflow is the accepted cost. A frozen (pinned or locked) column
 * is marked so the allocator holds it at content rather than lifting it into
 * the surplus.
 *
 * @internal
 */
function columnProfile<T>(
	col: GridColumn<T>,
	bodyWidth: number,
	floor: number,
	runningContent: Map<string, number>,
	uncapped: boolean,
): ColumnSizeProfile {
	const id = String(col.id)

	const max = col.maxWidth ?? Number.MAX_SAFE_INTEGER

	const cap = uncapped ? max : (col.maxWidth ?? DEFAULT_CONTENT_MAX)

	const measured = Math.max(floor, Math.min(bodyWidth, cap))

	const content = Math.max(measured, runningContent.get(id) ?? 0)

	runningContent.set(id, content)

	return { id, min: floor, content, max, frozen: isFrozen(col) }
}

/**
 * Whether a column is auto-sized — a data column the allocator distributes width
 * across, rather than one holding a fixed width. A drag-resized column (in
 * `manualPinned`) holds its width. A `width`-seeded column holds its initial
 * width too, until the user releases it via "Auto-size all columns" (its id
 * lands in `released`). It then rejoins the fit like a width-less column.
 *
 * @internal
 */
export function isAutoSized<T>(
	col: GridColumn<T>,
	manualPinned: ReadonlySet<string>,
	released: ReadonlySet<string>,
): boolean {
	if (!isDataColumn(col)) return false

	const id = String(col.id)

	if (manualPinned.has(id)) return false

	return parsePxWidth(col.width) == null || released.has(id)
}

/**
 * Reads the rendered grid and resolves, per auto-sized data column, the
 * {@link ColumnSizeProfile} the allocator needs (see {@link columnProfile}). It
 * also resolves every data column's {@link columnFloor}, held columns included.
 * A drag therefore honors the floor even on a column that sits out the
 * distribution. Non-data columns (selection / actions), `width`-held columns,
 * and manually drag-resized columns are excluded from the profiles. Their widths
 * sum into `fixed` for the caller to reserve.
 *
 * Measurements are read from the live DOM unclipped by the current column widths
 * (see {@link headerWidth} / {@link scanBodyCells}). Re-measuring after the
 * autosizer resizes a column therefore yields the same profile, with no feedback
 * loop. Reads against the current layout all land first. The one measurement
 * that needs a different layout is an element-bearing leaf, whose shrink-to-fit
 * content clips with the cell. It then runs as a single batched
 * widen-read-revert (see {@link resolvePendingLeaves}).
 *
 * @internal
 */
export function measureColumnIntrinsics<T>({
	table,
	columns,
	container,
	manualPinned,
	released,
	runningContent,
	uncapped,
}: MeasureOptions<T>): ColumnMeasurement {
	const { headers, bodies, cells } = collectCells(container)

	// The header flex row's `column-gap` is identical across columns (one recipe
	// class), so read it once for the whole pass instead of per column.
	const slotGap = headerSlotGap(headers)

	const scans = new Map<string, ColumnScan>()

	const floors = new Map<string, number>()

	let fixed = 0

	// Pass one: every read against the current layout — header floors and body
	// scans — before the batched leaf widening below dirties it.
	for (const col of columns) {
		const id = String(col.id)

		if (!isDataColumn(col)) {
			// Selection / actions columns keep their engine width and sit out the fit.
			fixed += table.getColumn(id)?.getSize() ?? DEFAULT_COLUMN_SIZE

			continue
		}

		// Every data column gets a floor — a `width`-held or drag-held one honors it on
		// a resize even though it sits out the distribution.
		floors.set(id, columnFloor(col, headers.get(id), slotGap))

		if (isAutoSized(col, manualPinned, released)) {
			scans.set(id, scanBodyCells(bodies.get(id) ?? []))
		} else {
			fixed += table.getColumn(id)?.getSize() ?? DEFAULT_COLUMN_SIZE
		}
	}

	// Pass two: widen the element-bearing leaves to `max-content` and read the
	// widths the clipped layout couldn't show (a Badge shrunk into a narrow cell).
	resolvePendingLeaves([...scans.values()])

	const profiles: ColumnSizeProfile[] = []

	for (const col of columns) {
		const id = String(col.id)

		const scan = scans.get(id)

		if (!scan) continue

		profiles.push(
			columnProfile(
				col,
				scan.widest,
				floors.get(id) ?? 0,
				runningContent,
				uncapped?.has(id) ?? false,
			),
		)
	}

	return { profiles, fixed, floors, cells }
}
