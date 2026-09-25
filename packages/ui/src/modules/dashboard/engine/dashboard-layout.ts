/**
 * The pure layout core of the dashboard: a fixed-column canvas of integer cells.
 *
 * A tile sits exactly where it is placed. There is no gravity and no compaction,
 * so the board moves only when a gesture moves it. Each operation takes cells and
 * returns a new array. A cell that the operation does not touch keeps its object,
 * so a caller can compare cells by identity.
 */

/**
 * Sub-rows per column width, so the row pitch is a quarter of the column pitch.
 * Finer rows let a derived height land near its true value, and the heights stay
 * integers that the collision math can trust.
 */
export const ROW_SUBDIVISION = 4

/** The default column count. It divides into halves, thirds, quarters, sixths, and eighths. */
export const DEFAULT_COLUMNS = 24

/** The column span of a tile that mounts with no layout entry and no `defaultSize`. */
export const DEFAULT_CELL_WIDTH = 8

/**
 * The row span of a free-form tile with no stored height and no default height.
 * It is the height of a 16:9 tile at a third of 24 columns, so an unset tile
 * still has a board shape.
 */
export const DEFAULT_CELL_HEIGHT = 18

/**
 * One saved tile: its geometry in integer grid units. A saved layout holds only
 * these four numbers for each tile. It renders as saved within the columns. An
 * entry that the clamp moves onto another tile takes a new row, as the `columns`
 * prop of `Dashboard` describes.
 */
export type DashboardLayoutItem = {
	/** The `id` of the `DashboardTile` that this entry places. */
	id: string
	/** The leftmost column, from `0`, within `[0, columns - w]`. */
	x: number
	/** The top row, from `0`. The board never packs tiles, so a gap persists. */
	y: number
	/** The column span, at least `1`. */
	w: number
	/**
	 * The row span. Omit it for a tile with a fixed `ratio`, because that tile
	 * derives its height from its width. The binding emits such a tile without `h`.
	 */
	h?: number
	/**
	 * A static tile never moves. It does not drag, swap, or resize.
	 * @defaultValue false
	 */
	static?: boolean
}

/**
 * The span of a tile in grid units, for a tile that the saved layout does not
 * place yet. With each axis optional, it is also a span limit.
 */
export type DashboardTileSize = {
	/** The column span. */
	w: number
	/** The row span. Only a free-form tile reads it, because a tile with a fixed ratio derives its height. */
	h?: number
}

/**
 * What a mounted tile demands of its cell. The tile registers these values; the
 * saved layout never stores them.
 */
export type DashboardTileDemands = {
	/** The fixed `width / height` ratio of the content box, or `undefined` for a free-form tile. */
	ratio?: number
	/** The narrowest content width in px at which the content stays legible. */
	minWidth?: number
	/** The name that the live region reads for the tile. */
	label?: string
	/** The span of the tile when the saved layout holds no entry for it. */
	defaultSize?: DashboardTileSize
	/** The smallest span that a resize or a new placement gives the tile. */
	minSize?: Partial<DashboardTileSize>
	/** The largest span that a resize or a new placement gives the tile. */
	maxSize?: Partial<DashboardTileSize>
}

/** One resolved cell in grid units. The height is always concrete. */
export type DashboardCell = {
	id: string
	/** The leftmost column, from `0`. */
	x: number
	/** The top row, from `0`, unbounded downward. */
	y: number
	/** The column span, at least `1`. */
	w: number
	/** The row span, at least `1`. */
	h: number
	/** A static cell never moves. */
	static: boolean
}

/**
 * `ratio`, or `undefined` when it is not a finite number above 0. The tile is then
 * free-form. A ratio of 0 would give an infinite height, and NaN a NaN height.
 */
function usableRatio(ratio: number | undefined): number | undefined {
	return ratio !== undefined && Number.isFinite(ratio) && ratio > 0 ? ratio : undefined
}

/**
 * `demands` without a `ratio` or a `minWidth` that the engine cannot use. A
 * `minWidth` that is not a finite number of 0 or more puts no floor on the width.
 *
 * @remarks
 * The values come from app props, and a computed value can be bad for a moment.
 * For example, the ratio of an image before it loads is 0/0. The store checks each
 * registration, so no NaN or infinite cell reaches a gesture or the saved layout.
 *
 * @returns `demands` itself when each value is usable.
 */
export function usableDemands(demands: DashboardTileDemands): DashboardTileDemands {
	const ratio = usableRatio(demands.ratio)

	const width = demands.minWidth

	const minWidth = width !== undefined && Number.isFinite(width) && width >= 0 ? width : undefined

	if (ratio === demands.ratio && minWidth === width) return demands

	return { ...demands, ratio, minWidth }
}

/**
 * The row span of a tile with a fixed ratio, at `w` columns. The result depends
 * only on `w` and `ratio`, so two equal tiles get the same height by construction.
 */
export function deriveHeight(w: number, ratio: number): number {
	return Math.max(1, Math.round((ROW_SUBDIVISION * w) / ratio))
}

/**
 * `value` within `[min, max]`. An absent bound does not apply. When the minimum
 * is larger than the maximum, the minimum wins, as CSS `min-width` does.
 */
export function clampSpan(value: number, min: number | undefined, max: number | undefined): number {
	const capped = max === undefined ? value : Math.min(value, max)

	return min === undefined ? capped : Math.max(capped, min)
}

/**
 * The narrowest column span whose content box still holds `minWidth` px. The
 * cell insets half the gap on each side, so the span must cover one more gap.
 */
export function minColumns(minWidth: number, gap: number, pitch: number, columns: number): number {
	if (pitch <= 0) return 1

	return Math.min(columns, Math.max(1, Math.ceil((minWidth + gap) / pitch)))
}

/**
 * Resolves one saved item to a cell. It rounds each value and clamps it into the
 * canvas. A tile with a fixed ratio takes its derived height, not the stored one.
 */
export function resolveCell(
	item: DashboardLayoutItem,
	demands: DashboardTileDemands | undefined,
	columns: number,
): DashboardCell {
	const w = Math.min(columns, Math.max(1, Math.round(item.w)))

	// A tile that has not registered passes its raw props, so the ratio gets the check here too.
	const ratio = usableRatio(demands?.ratio)

	const h =
		ratio === undefined
			? Math.max(1, Math.round(item.h ?? DEFAULT_CELL_HEIGHT))
			: deriveHeight(w, ratio)

	return {
		id: item.id,
		x: Math.min(columns - w, Math.max(0, Math.round(item.x))),
		y: Math.max(0, Math.round(item.y)),
		w,
		h,
		static: item.static ?? false,
	}
}

/** Writes a cell back as a saved item. A tile with a fixed ratio emits no `h`. */
export function toLayoutItem(
	cell: DashboardCell,
	demands: DashboardTileDemands | undefined,
): DashboardLayoutItem {
	return {
		id: cell.id,
		x: cell.x,
		y: cell.y,
		w: cell.w,
		...(demands?.ratio === undefined && { h: cell.h }),
		...(cell.static && { static: true }),
	}
}

/**
 * The sign that turns a horizontal travel in px into columns. It is `1` in a
 * left-to-right board. It is `-1` in a right-to-left board, where the grid puts
 * column `0` at the right edge. The saved layout stays in columns, so one layout
 * renders mirrored in both directions.
 */
export function inlineSign(direction: string | null | undefined): 1 | -1 {
	return direction === 'rtl' ? -1 : 1
}

/** The CSS `grid-area` of a cell: the grid lines count from `1`. */
export function gridArea(cell: DashboardCell): string {
	return `${cell.y + 1} / ${cell.x + 1} / span ${cell.h} / span ${cell.w}`
}

/** Whether the boxes of two different cells overlap. */
export function collides(a: DashboardCell, b: DashboardCell): boolean {
	if (a.id === b.id) return false

	if (a.x + a.w <= b.x || a.x >= b.x + b.w) return false

	return !(a.y + a.h <= b.y || a.y >= b.y + b.h)
}

/**
 * Whether a placement holds: inside the columns, not above the top edge, and
 * clear of each other cell. The cell with the same id does not count.
 */
export function fits(
	cells: readonly DashboardCell[],
	cell: DashboardCell,
	columns: number,
): boolean {
	if (cell.x < 0 || cell.y < 0 || cell.x + cell.w > columns) return false

	return cells.every((other) => !collides(other, cell))
}

/** The first row under all cells, less the cell `except` when you name one. */
export function bottom(cells: readonly DashboardCell[], except?: string): number {
	let edge = 0

	for (const cell of cells) {
		if (cell.id !== except) edge = Math.max(edge, cell.y + cell.h)
	}

	return edge
}

/** The grid-unit area that two cells share, or `0` when they stand apart. */
export function overlapArea(a: DashboardCell, b: DashboardCell): number {
	const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)

	const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)

	return Math.max(0, w) * Math.max(0, h)
}

/** Replaces the cells that `patch` names, and keeps each other cell object. */
export function patchCells(
	cells: readonly DashboardCell[],
	patch: ReadonlyMap<string, Partial<DashboardCell>>,
): DashboardCell[] {
	return cells.map((cell) => {
		const change = patch.get(cell.id)

		return change === undefined ? cell : { ...cell, ...change }
	})
}

/** Moves one cell to a new origin. The caller checks the fit first. */
export function moveCell(
	cells: readonly DashboardCell[],
	id: string,
	x: number,
	y: number,
): DashboardCell[] {
	return patchCells(cells, new Map([[id, { x, y }]]))
}

/**
 * Exchanges the origins of two cells, and each cell keeps its own span. The drag
 * policy offers a swap only between equal spans, where the exchange is exact.
 */
export function swapCells(
	cells: readonly DashboardCell[],
	aId: string,
	bId: string,
): DashboardCell[] {
	const a = cells.find((cell) => cell.id === aId)

	const b = cells.find((cell) => cell.id === bId)

	if (a === undefined || b === undefined || a.static || b.static) return [...cells]

	return patchCells(
		cells,
		new Map([
			[aId, { x: b.x, y: b.y }],
			[bId, { x: a.x, y: a.y }],
		]),
	)
}

/**
 * Moves one tile to the slot of a partner in the same row, and shifts each
 * equal-span tile between them over by one slot. This is the sortable feel: a run
 * of neighbors shifts, and nothing outside the run moves.
 */
export function shiftCells(
	cells: readonly DashboardCell[],
	movingId: string,
	targetId: string,
): DashboardCell[] {
	const moving = cells.find((cell) => cell.id === movingId)

	if (moving === undefined || moving.static) return [...cells]

	// The equal-span tiles of the row, left to right. Their origins are the fixed
	// slots that the shift rotates the tiles through.
	const row = cells
		.filter(
			(cell) => !cell.static && cell.y === moving.y && cell.w === moving.w && cell.h === moving.h,
		)
		.sort((a, b) => a.x - b.x)

	const from = row.findIndex((cell) => cell.id === movingId)

	const to = row.findIndex((cell) => cell.id === targetId)

	if (from === -1 || to === -1) return [...cells]

	const order = row.map((cell) => cell.id)

	order.splice(to, 0, ...order.splice(from, 1))

	const patch = new Map<string, Partial<DashboardCell>>()

	order.forEach((id, index) => {
		const slot = row[index]

		if (slot !== undefined && slot.id !== id) patch.set(id, { x: slot.x })
	})

	return patchCells(cells, patch)
}

/** One saved entry and the cell that the clamp of {@link resolveCell} gives it. */
type ClampedEntry = { item: DashboardLayoutItem; cell: DashboardCell }

/** Whether the clamp moves the cell off the saved origin or the saved span of the entry. */
function clampMoves({ item, cell }: ClampedEntry): boolean {
	return cell.x !== item.x || cell.y !== item.y || cell.w !== item.w
}

/** Compares two saved entries by row, then by column, then by id. */
function bySavedPlace(a: ClampedEntry, b: ClampedEntry): number {
	const id = a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0

	return a.item.y - b.item.y || a.item.x - b.item.x || id
}

/**
 * The cells of `entries`. A cell that the clamp moves onto another tile goes to a
 * new row, and {@link resolveLayout} states the rule. The result keeps the order
 * of `entries`, and the cells on new rows go last.
 */
function holdBack(entries: readonly ClampedEntry[]): DashboardCell[] {
	const moved = entries.filter(clampMoves).sort(bySavedPlace)

	const held = entries.filter((entry) => !clampMoves(entry)).map(({ cell }) => cell)

	const back = new Set<ClampedEntry>()

	for (const entry of moved) {
		if (held.some((other) => collides(other, entry.cell))) back.add(entry)
		else held.push(entry.cell)
	}

	const cells = entries.filter((entry) => !back.has(entry)).map(({ cell }) => cell)

	for (const entry of moved) {
		if (back.has(entry)) cells.push({ ...entry.cell, x: 0, y: bottom(cells) })
	}

	return cells
}

/**
 * The cells of the saved entries of the mounted tiles, from the first entry of
 * each id. An entry that the clamp moves onto another entry goes to a new row.
 */
function entryCells(
	items: readonly DashboardLayoutItem[],
	demands: ReadonlyMap<string, DashboardTileDemands>,
	columns: number,
): DashboardCell[] {
	const entries: ClampedEntry[] = []

	const placed = new Set<string>()

	for (const item of items) {
		const demand = demands.get(item.id)

		if (demand === undefined || placed.has(item.id)) continue

		placed.add(item.id)

		entries.push({ item, cell: resolveCell(item, demand, columns) })
	}

	return holdBack(entries)
}

/**
 * Resolves a saved layout against the mounted tiles. An entry keeps its place.
 * A mounted tile with no entry takes a new row under the lowest tile, in mount
 * order, at its `defaultSize` within its `minSize` and `maxSize`. An entry with
 * no mounted tile is ignored, and its space stays open.
 *
 * @remarks
 * The clamp of {@link resolveCell} can move an entry, for example after a change
 * of `columns`, or when `x` is past the edge. An entry that the clamp does not
 * move keeps its place, also when it overlaps another entry as saved. Then each
 * moved entry gets a place in the order of its saved row, its saved column, and
 * its id. A moved entry keeps its clamped cell when no entry with a place covers
 * that cell. If not, it takes a new row under the lowest tile, at column 0 and at
 * its resolved span.
 *
 * The new rows go in the same order, after the entries that keep their place, and
 * before the tiles with no entry. Thus the order of `items` changes no cell, but
 * the first entry of a repeated id wins.
 */
export function resolveLayout(
	items: readonly DashboardLayoutItem[],
	demands: ReadonlyMap<string, DashboardTileDemands>,
	columns: number,
): DashboardCell[] {
	const cells = entryCells(items, demands, columns)

	const placed = new Set(cells.map((cell) => cell.id))

	for (const [id, demand] of demands) {
		if (placed.has(id)) continue

		const { defaultSize: size, minSize: min, maxSize: max } = demand

		const item = {
			id,
			x: 0,
			y: bottom(cells),
			w: clampSpan(size?.w ?? DEFAULT_CELL_WIDTH, min?.w, max?.w),
			h: clampSpan(size?.h ?? DEFAULT_CELL_HEIGHT, min?.h, max?.h),
		}

		cells.push(resolveCell(item, demand, columns))
	}

	return cells
}

/**
 * The ids of `items` in reading order: by row, then by column. The keyboard and
 * assistive tech then meet the tiles in the order that the eye reads them.
 * Items at the same origin keep their input order.
 */
export function readingOrder(items: readonly { id: string; x: number; y: number }[]): string[] {
	return items
		.map((item, index) => ({ item, index }))
		.sort((a, b) => a.item.y - b.item.y || a.item.x - b.item.x || a.index - b.index)
		.map(({ item }) => item.id)
}

/**
 * `items` sorted by the rank of each id in `order`. An item whose id `order` does
 * not hold goes after the ranked items, in its input order. It returns `items`
 * itself when the order does not change, so a caller can compare by identity.
 */
export function sortByOrder<T>(
	items: readonly T[],
	order: readonly string[],
	idOf: (item: T) => string,
): readonly T[] {
	const rank = new Map(order.map((id, index) => [id, index]))

	const sorted = items
		.map((item, index) => ({ item, index, rank: rank.get(idOf(item)) ?? order.length + index }))
		.sort((a, b) => a.rank - b.rank)

	return sorted.every(({ index }, position) => index === position)
		? items
		: sorted.map(({ item }) => item)
}

/** Whether two layouts place each cell in the same place, id by id. */
export function sameGeometry(a: readonly DashboardCell[], b: readonly DashboardCell[]): boolean {
	if (a.length !== b.length) return false

	const byId = new Map(b.map((cell) => [cell.id, cell]))

	return a.every((cell) => {
		const other = byId.get(cell.id)

		return other !== undefined && sameCell(cell, other)
	})
}

/** Whether two cells have the same geometry and the same static flag. */
export function sameCell(a: DashboardCell, b: DashboardCell): boolean {
	return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.static === b.static
}

/** Whether two saved items hold the same geometry, so a caller can keep the first. */
function sameItem(a: DashboardLayoutItem, b: DashboardLayoutItem): boolean {
	return (
		a.id === b.id &&
		a.x === b.x &&
		a.y === b.y &&
		a.w === b.w &&
		a.h === b.h &&
		(a.static ?? false) === (b.static ?? false)
	)
}

/**
 * The first entry of each id in `items`, which is the entry that
 * {@link resolveLayout} reads. It returns `items` itself when no id repeats, so a
 * caller can compare by identity.
 */
export function firstEntries(
	items: readonly DashboardLayoutItem[],
): readonly DashboardLayoutItem[] {
	const seen = new Set<string>()

	const first = items.filter((item) => {
		if (seen.has(item.id)) return false

		seen.add(item.id)

		return true
	})

	return first.length === items.length ? items : first
}

/**
 * The first entry of each id in `items`, placed by the rule of {@link resolveLayout}
 * with provisional heights. A tile that has not registered paints this entry.
 *
 * @remarks
 * The ratios are not known before the tiles register, so each cell takes `h`, or
 * {@link DEFAULT_CELL_HEIGHT} when `h` is absent. A tile with a ratio can thus
 * still overlap another tile, or move, when it registers. An entry that moves
 * takes the new `x`, `y`, and `w`, and it keeps its other fields. It returns
 * `items` itself when no entry moves and no id repeats.
 */
export function placeEntries(
	items: readonly DashboardLayoutItem[],
	columns: number,
): readonly DashboardLayoutItem[] {
	const first = firstEntries(items)

	const cells = holdBack(
		first.map((item) => ({ item, cell: resolveCell(item, undefined, columns) })),
	)

	const byId = new Map(cells.map((cell) => [cell.id, cell]))

	const placed = first.map((item) => {
		const cell = byId.get(item.id)

		if (cell === undefined || (cell.x === item.x && cell.y === item.y && cell.w === item.w)) {
			return item
		}

		return { ...item, x: cell.x, y: cell.y, w: cell.w }
	})

	return placed.every((item, index) => item === first[index]) ? first : placed
}

/**
 * Writes committed cells back into the saved layout. An entry of a mounted tile
 * takes its new geometry. An entry of a tile that is not mounted stays as saved,
 * so a tile that renders only sometimes keeps its place. A mounted tile with no
 * entry is appended, and the cell of a tile that is not mounted adds no entry.
 * An entry whose geometry does not change keeps its object.
 * A repeated id keeps only its first entry, so a commit removes the stale entry.
 */
export function mergeLayout(
	saved: readonly DashboardLayoutItem[],
	cells: readonly DashboardCell[],
	demands: ReadonlyMap<string, DashboardTileDemands>,
): DashboardLayoutItem[] {
	const byId = new Map(cells.map((cell) => [cell.id, cell]))

	const written = new Set<string>()

	const merged = firstEntries(saved).map((item) => {
		const cell = byId.get(item.id)

		if (cell === undefined) return item

		written.add(item.id)

		const next = toLayoutItem(cell, demands.get(item.id))

		return sameItem(item, next) ? item : next
	})

	for (const cell of cells) {
		const tile = demands.get(cell.id)

		if (tile !== undefined && !written.has(cell.id)) merged.push(toLayoutItem(cell, tile))
	}

	return merged
}
