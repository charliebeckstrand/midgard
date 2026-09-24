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
 * these four numbers for each tile, and it renders exactly as saved.
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
 * place yet.
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
 * The row span of a tile with a fixed ratio, at `w` columns. The result depends
 * only on `w` and `ratio`, so two equal tiles get the same height by construction.
 */
export function deriveHeight(w: number, ratio: number): number {
	return Math.max(1, Math.round((ROW_SUBDIVISION * w) / ratio))
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

	const ratio = demands?.ratio

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
 * of neighbours shifts, and nothing outside the run moves.
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

/**
 * Resolves a saved layout against the mounted tiles. An entry keeps its place.
 * A mounted tile with no entry takes a new row under the lowest tile, in mount
 * order, at its `defaultSize`. An entry with no mounted tile is ignored, and its
 * space stays open.
 */
export function resolveLayout(
	items: readonly DashboardLayoutItem[],
	demands: ReadonlyMap<string, DashboardTileDemands>,
	columns: number,
): DashboardCell[] {
	const cells: DashboardCell[] = []

	const placed = new Set<string>()

	for (const item of items) {
		const demand = demands.get(item.id)

		if (demand === undefined || placed.has(item.id)) continue

		placed.add(item.id)

		cells.push(resolveCell(item, demand, columns))
	}

	for (const [id, demand] of demands) {
		if (placed.has(id)) continue

		const size = demand.defaultSize

		const item = { id, x: 0, y: bottom(cells), w: size?.w ?? DEFAULT_CELL_WIDTH, h: size?.h }

		cells.push(resolveCell(item, demand, columns))
	}

	return cells
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
 * Writes committed cells back into the saved layout. An entry of a mounted tile
 * takes its new geometry. An entry of a tile that is not mounted stays as saved,
 * so a tile that renders only sometimes keeps its place. A mounted tile with no
 * entry is appended. An entry whose geometry does not change keeps its object.
 */
export function mergeLayout(
	saved: readonly DashboardLayoutItem[],
	cells: readonly DashboardCell[],
	demands: ReadonlyMap<string, DashboardTileDemands>,
): DashboardLayoutItem[] {
	const byId = new Map(cells.map((cell) => [cell.id, cell]))

	const written = new Set<string>()

	const merged = saved.map((item) => {
		const cell = byId.get(item.id)

		if (cell === undefined || written.has(item.id)) return item

		written.add(item.id)

		const next = toLayoutItem(cell, demands.get(item.id))

		return sameItem(item, next) ? item : next
	})

	for (const cell of cells) {
		if (!written.has(cell.id)) merged.push(toLayoutItem(cell, demands.get(cell.id)))
	}

	return merged
}
