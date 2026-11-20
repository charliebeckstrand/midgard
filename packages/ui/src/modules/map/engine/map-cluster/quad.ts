/**
 * The quadtree that the merge tree of the dots searches (`tree.ts`). React-free,
 * like the rest of the engine.
 *
 * The uniform grid of `grid.ts` gives each mark the marks within one reach in
 * nine cells. That is a linear pass while the marks spread over the cells. Dots
 * that stand close together fall in one cell, so each search of the grid reads
 * each dot, and the merges of a dense pile cost the square of its count. A
 * quadtree splits each box that holds too many entries, so a dense pile gets
 * small boxes, and a search reads only the boxes that it cannot rule out.
 *
 * The tree holds the indices of the live nodes. The caller owns the position
 * and the key of each index, and reads them through the accessors. Each box
 * keeps the count of its entries and the largest key among them, so a search
 * can rule out a box from the box alone.
 */

import type { MapPoint2D } from '../types'

/**
 * The entries that a box holds before it splits. A read of one more entry costs
 * less than a step into one more box, so a box holds a few dozen. At 8, a set
 * of 120 dots took half as long again as the grid did.
 *
 * @internal
 */
const QUAD_CAPACITY = 32

/**
 * The depth at which a box no longer splits. Dots at one position cannot part,
 * so a pile of them stays in one box at this depth.
 *
 * @internal
 */
const QUAD_DEPTH = 40

/** One box of a {@link MapQuadTree}. @internal */
export type MapQuad = {
	/** The bounds of the box. Each entry below the box stands inside them. */
	x0: number
	y0: number
	x1: number
	y1: number
	/** The point where the box splits, which stays fixed after the split. */
	midX: number
	midY: number
	depth: number
	parent: MapQuad | null
	/** The four boxes of a split box, `null` for a box that holds its entries. */
	children: MapQuad[] | null
	/** The entries of a box that has not split. */
	items: number[]
	/** The count of the entries below the box. */
	count: number
	/** The largest key of the entries below the box, `-Infinity` for none. */
	max: number
}

/** A quadtree of indices, over the positions and the keys that the caller holds. @internal */
export type MapQuadTree = {
	root: MapQuad
	/** The box that holds each index, `null` for an index that the tree does not hold. */
	leafOf: (MapQuad | null)[]
	/** The place of each index in the entries of its box. */
	slotOf: number[]
	at: (index: number) => MapPoint2D
	key: (index: number) => number
}

/** A box with no entries. @internal */
function emptyQuad(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	parent: MapQuad | null,
): MapQuad {
	return {
		x0,
		y0,
		x1,
		y1,
		midX: (x0 + x1) / 2,
		midY: (y0 + y1) / 2,
		depth: parent === null ? 0 : parent.depth + 1,
		parent,
		children: null,
		items: [],
		count: 0,
		max: Number.NEGATIVE_INFINITY,
	}
}

/**
 * Makes an empty quadtree over the box from `x0`, `y0` to `x1`, `y1`. An entry
 * outside the box grows the boxes that hold it.
 *
 * @internal
 */
export function quadTree(
	bounds: { x0: number; y0: number; x1: number; y1: number },
	at: (index: number) => MapPoint2D,
	key: (index: number) => number,
): MapQuadTree {
	return {
		root: emptyQuad(bounds.x0, bounds.y0, bounds.x1, bounds.y1, null),
		leafOf: [],
		slotOf: [],
		at,
		key,
	}
}

/** Grows the bounds of `quad` to hold `point`. @internal */
function holdPoint(quad: MapQuad, point: MapPoint2D): void {
	quad.x0 = Math.min(quad.x0, point.x)

	quad.y0 = Math.min(quad.y0, point.y)

	quad.x1 = Math.max(quad.x1, point.x)

	quad.y1 = Math.max(quad.y1, point.y)
}

/** The child of a split box that takes `point`. @internal */
function childFor(quad: MapQuad, point: MapPoint2D): MapQuad {
	const children = quad.children as MapQuad[]

	return children[(point.x < quad.midX ? 0 : 1) + (point.y < quad.midY ? 0 : 2)] as MapQuad
}

/** Puts `index` in the entries of the box `leaf`. @internal */
function fileItem(tree: MapQuadTree, leaf: MapQuad, index: number): void {
	tree.leafOf[index] = leaf

	tree.slotOf[index] = leaf.items.push(index) - 1
}

/** Gives the entries of a full box to four new boxes. @internal */
function splitQuad(tree: MapQuadTree, quad: MapQuad): void {
	const { x0, y0, x1, y1, midX, midY } = quad

	quad.children = [
		emptyQuad(x0, y0, midX, midY, quad),
		emptyQuad(midX, y0, x1, midY, quad),
		emptyQuad(x0, midY, midX, y1, quad),
		emptyQuad(midX, midY, x1, y1, quad),
	]

	for (const index of quad.items) {
		const child = childFor(quad, tree.at(index))

		fileItem(tree, child, index)

		child.count++
	}

	quad.items = []

	for (const child of quad.children) refreshMax(tree, child)
}

/** Reads the largest key of a box again, from its entries or from its children. @internal */
function refreshMax(tree: MapQuadTree, quad: MapQuad): void {
	let max = Number.NEGATIVE_INFINITY

	if (quad.children === null) {
		for (const index of quad.items) max = Math.max(max, tree.key(index))
	} else {
		for (const child of quad.children) if (child.count > 0) max = Math.max(max, child.max)
	}

	quad.max = max
}

/**
 * Reads the largest key again in `quad` and in each box above it. A box reads
 * only the largest keys of its children, so the walk stops at the first box
 * whose largest key stays the same.
 *
 * @internal
 */
function refreshUp(tree: MapQuadTree, quad: MapQuad | null): void {
	for (let at = quad; at !== null; at = at.parent) {
		const before = at.max

		refreshMax(tree, at)

		if (at.max === before) return
	}
}

/** Adds `index` at its position. @internal */
export function insertQuad(tree: MapQuadTree, index: number): void {
	const point = tree.at(index)

	let quad = tree.root

	for (;;) {
		holdPoint(quad, point)

		quad.count++

		if (quad.children === null) break

		quad = childFor(quad, point)
	}

	fileItem(tree, quad, index)

	const splits =
		quad.items.length > QUAD_CAPACITY &&
		quad.depth < QUAD_DEPTH &&
		(quad.x1 > quad.x0 || quad.y1 > quad.y0)

	if (splits) splitQuad(tree, quad)

	refreshUp(tree, quad)
}

/** Removes `index`, if the tree holds it. @internal */
export function removeQuad(tree: MapQuadTree, index: number): void {
	const leaf = tree.leafOf[index]

	if (leaf === null || leaf === undefined) return

	const slot = tree.slotOf[index] as number

	const last = leaf.items.pop() as number

	if (last !== index) {
		leaf.items[slot] = last

		tree.slotOf[last] = slot
	}

	tree.leafOf[index] = null

	for (let at: MapQuad | null = leaf; at !== null; at = at.parent) at.count--

	refreshUp(tree, leaf)
}

/** Reads the key of `index` again, after the caller changed it. @internal */
export function rekeyQuad(tree: MapQuadTree, index: number): void {
	refreshUp(tree, tree.leafOf[index] ?? null)
}

/** The squared distance from `point` to the nearest point of the box `quad`. @internal */
export function quadDistance(quad: MapQuad, point: MapPoint2D): number {
	const dx = Math.max(quad.x0 - point.x, 0, point.x - quad.x1)

	const dy = Math.max(quad.y0 - point.y, 0, point.y - quad.y1)

	return dx * dx + dy * dy
}

/**
 * Visits the entries of each box that `enter` accepts, the boxes nearest to
 * `point` first. `enter` reads a box before the walk goes into it, so a search
 * that narrows as it goes rules out more of the later boxes. A visit can change
 * the key of an entry ({@link rekeyQuad}), but it must not add or remove one.
 *
 * @internal
 */
export function walkQuads(
	tree: MapQuadTree,
	point: MapPoint2D,
	enter: (quad: MapQuad) => boolean,
	visit: (index: number) => void,
): void {
	walkQuad(tree.root, point, enter, visit)
}

/** One step of {@link walkQuads}. @internal */
function walkQuad(
	quad: MapQuad,
	point: MapPoint2D,
	enter: (quad: MapQuad) => boolean,
	visit: (index: number) => void,
): void {
	if (quad.count === 0 || !enter(quad)) return

	if (quad.children === null) {
		for (const index of quad.items) visit(index)

		return
	}

	const [a, b, c, d] = quad.children as [MapQuad, MapQuad, MapQuad, MapQuad]

	// The four children, the nearest first, with no list to sort.
	const order = nearestFirst(
		a,
		b,
		c,
		d,
		quadDistance(a, point),
		quadDistance(b, point),
		quadDistance(c, point),
		quadDistance(d, point),
	)

	for (const child of order) walkQuad(child, point, enter, visit)
}

/** Four boxes in the order of their distances, the nearest first. @internal */
function nearestFirst(
	a: MapQuad,
	b: MapQuad,
	c: MapQuad,
	d: MapQuad,
	da: number,
	db: number,
	dc: number,
	dd: number,
): [MapQuad, MapQuad, MapQuad, MapQuad] {
	// A sort of four by five swaps: the two pairs, then their ends, then the middle.
	if (db < da) [a, b, da, db] = [b, a, db, da]

	if (dd < dc) [c, d, dc, dd] = [d, c, dd, dc]

	if (dc < da) [a, c, da, dc] = [c, a, dc, da]

	if (dd < db) [b, d, db, dd] = [d, b, dd, db]

	if (dc < db) [b, c] = [c, b]

	return [a, b, c, d]
}
