/**
 * The saved board as plain data, and the pure operations that change it.
 *
 * A spec holds the tiles, their layout, and the filter. Each operation takes a
 * spec and returns a new spec, and it keeps the tiles and the entries that it
 * does not touch. An operation that changes nothing returns the same spec, so a
 * caller can compare specs by identity.
 */

import type { QueryGroup } from '../../query/engine/types'
import type { DashboardLayoutItem, DashboardTileSize } from './dashboard-layout'
import { isId } from './dashboard-spec-parse'

/**
 * One tile of a {@link DashboardSpec}: plain data that names a widget kind. The
 * tile renders through the widget that the nearest `DashboardWidgetProvider`
 * registers under that name.
 */
export type DashboardSpecTile = {
	/** The stable id that joins the tile to its layout entry. Each id is unique in the spec. */
	id: string
	/** The name of the widget kind that draws the tile. */
	widget: string
	/** The heading of the tile. */
	title?: string
	/** A muted line under the title. */
	description?: string
	/**
	 * The options that the renderer reads. Keep them plain data, so the spec
	 * survives a save and a load.
	 */
	options?: unknown
	/**
	 * The span of the tile before the layout holds an entry for it. It replaces
	 * the `defaultSize` of the kind. {@link duplicateSpecTile} sets it, so a copy
	 * takes the span of its source.
	 */
	defaultSize?: DashboardTileSize
}

/**
 * A saved board as plain data: the spec tiles, their layout, and the filter.
 *
 * @remarks
 * The spec is a type and not a binding. Bind `layout` and `filter` on
 * `Dashboard`, and render `tiles` with `DashboardTiles` inside it. Each value
 * then has one binding. Change the tiles with {@link addSpecTile},
 * {@link removeSpecTile}, and {@link duplicateSpecTile}, which keep the tiles and
 * the layout in step. Read a stored spec through `parseDashboardSpec`, which
 * repairs a stale or damaged spec and reports each change. Start a board from a
 * named spec with `startFromPreset`.
 */
export type DashboardSpec = {
	/**
	 * The tiles. The board renders them by their place, not in this order. The
	 * order places the tiles that have no layout entry yet, one row each.
	 */
	tiles: DashboardSpecTile[]
	/** The saved layout of the tiles. */
	layout: DashboardLayoutItem[]
	/** The filter that the app owns. */
	filter?: QueryGroup
}

/**
 * The first id of the form `{prefix}-{n}`, from `n = 1`, that no tile and no
 * layout entry of `spec` uses. An id that only a stale entry holds is not free,
 * because a new tile with that id takes the place of the stale entry.
 *
 * @param spec - The spec that the new id joins.
 * @param prefix - The text before the number.
 * @returns A free tile id.
 */
export function nextSpecTileId(spec: DashboardSpec, prefix = 'tile'): string {
	const used = new Set([
		...spec.tiles.map((tile) => tile.id),
		...spec.layout.map((item) => item.id),
	])

	let n = 1

	while (used.has(`${prefix}-${n}`)) n += 1

	return `${prefix}-${n}`
}

/**
 * The spec with `tile` added at the end of the tiles. The new tile has no layout
 * entry, so the board places it in a new row under the lowest tile, at its
 * `defaultSize`. The first commit then writes its entry.
 *
 * @remarks
 * A stale layout entry with the same id goes away, so the new tile does not take
 * a place that it did not earn. When a tile with the same id is in the spec, or
 * the id is empty, the spec returns unchanged. Mint the id with
 * {@link nextSpecTileId}.
 *
 * @param spec - The spec to change.
 * @param tile - The tile to add.
 * @returns The new spec, or `spec` when the id is taken or empty.
 */
export function addSpecTile(spec: DashboardSpec, tile: DashboardSpecTile): DashboardSpec {
	if (!isId(tile.id) || spec.tiles.some((item) => item.id === tile.id)) return spec

	return {
		...spec,
		tiles: [...spec.tiles, tile],
		layout: withoutEntry(spec.layout, tile.id),
	}
}

/**
 * The spec without the tile `id` and without its layout entry. The entry must go
 * too: else it stays in the saved layout, and its space stays open.
 *
 * @param spec - The spec to change.
 * @param id - The id of the tile to remove.
 * @returns The new spec, or `spec` when it holds no tile and no entry with that id.
 */
export function removeSpecTile(spec: DashboardSpec, id: string): DashboardSpec {
	const tiles = spec.tiles.filter((tile) => tile.id !== id)

	const layout = withoutEntry(spec.layout, id)

	if (tiles.length === spec.tiles.length && layout === spec.layout) return spec

	return { ...spec, tiles, layout }
}

/**
 * The spec with a copy of the tile `id` right after it in the tiles. The copy
 * takes the kind, the title, the description, and the options of its source.
 *
 * The copy has no layout entry, so the board places it in a new row under the
 * lowest tile. It takes the span of its source through `defaultSize`: the span
 * of the entry of the source, else the `defaultSize` of the source.
 *
 * @remarks
 * The copy shares the `options` object of its source. A spec is plain data that
 * nothing mutates, so a shared object is safe. Replace `options` to change them.
 *
 * @param spec - The spec to change.
 * @param id - The id of the tile to copy.
 * @param copyId - The id of the copy. Defaults to {@link nextSpecTileId}.
 * @returns The new spec, or `spec` when no tile has the id `id`, or when `copyId` is taken or empty.
 */
export function duplicateSpecTile(
	spec: DashboardSpec,
	id: string,
	copyId: string = nextSpecTileId(spec),
): DashboardSpec {
	const index = spec.tiles.findIndex((tile) => tile.id === id)

	const source = spec.tiles[index]

	if (source === undefined || !isId(copyId) || spec.tiles.some((tile) => tile.id === copyId)) {
		return spec
	}

	const entry = spec.layout.find((item) => item.id === id)

	const span = entry === undefined ? source.defaultSize : spanOf(entry)

	// With no entry, the span is the source's own `defaultSize`, which the spread carries.
	const copy: DashboardSpecTile = { ...source, id: copyId, ...(span && { defaultSize: span }) }

	const tiles = [...spec.tiles]

	tiles.splice(index + 1, 0, copy)

	return { ...spec, tiles, layout: withoutEntry(spec.layout, copyId) }
}

/** The span of a layout entry. An entry of a tile with a fixed ratio has no `h`. */
function spanOf(entry: DashboardLayoutItem): DashboardTileSize {
	return entry.h === undefined ? { w: entry.w } : { w: entry.w, h: entry.h }
}

/** The layout without the entries of `id`, or `layout` itself when it has none. */
function withoutEntry(layout: DashboardLayoutItem[], id: string): DashboardLayoutItem[] {
	return layout.some((item) => item.id === id) ? layout.filter((item) => item.id !== id) : layout
}
