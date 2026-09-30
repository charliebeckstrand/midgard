/**
 * The edges of an axis-aligned box, in the coordinates of the viewport. A
 * `DOMRect` is a `Box`, so a test can pass the result of
 * `getBoundingClientRect()` with no conversion.
 */
export type Box = {
	readonly left: number
	readonly top: number
	readonly right: number
	readonly bottom: number
}

/** A box, or an element whose bounding box a matcher reads. */
export type BoxSource = Box | Element

/** The four edges of a box, in the order that a failure message lists them. */
export const EDGES = ['left', 'top', 'right', 'bottom'] as const

/** One edge of a box. */
export type Edge = (typeof EDGES)[number]

/** A value for each edge of a box. */
export type EdgeValues = Record<Edge, number>

/**
 * Tells whether a value can give a box.
 *
 * @remarks
 * The check reads the shape of the value and never `instanceof Element`, so it
 * runs with no window: the `geometry` project runs in plain Node.
 */
export function isBoxSource(value: unknown): value is BoxSource {
	if (typeof value !== 'object' || value === null) return false

	if (typeof (value as Element).getBoundingClientRect === 'function') return true

	return EDGES.every((edge) => typeof (value as Record<string, unknown>)[edge] === 'number')
}

function isElement(source: BoxSource): source is Element {
	return typeof (source as Element).getBoundingClientRect === 'function'
}

/** Gives the box of a source. An element gives its bounding box. */
export function boxOf(source: BoxSource): Box {
	if (!isElement(source)) return source

	const { left, top, right, bottom } = source.getBoundingClientRect()

	return { left, top, right, bottom }
}

/**
 * Gives the distance by which `inner` extends past each edge of `outer`. A
 * value of zero or less means that the edge holds.
 */
export function overhang(inner: Box, outer: Box): EdgeValues {
	return {
		left: outer.left - inner.left,
		top: outer.top - inner.top,
		right: inner.right - outer.right,
		bottom: inner.bottom - outer.bottom,
	}
}

/** Gives the signed difference between each edge of `actual` and `expected`. */
export function edgeDelta(actual: Box, expected: Box): EdgeValues {
	return {
		left: actual.left - expected.left,
		top: actual.top - expected.top,
		right: actual.right - expected.right,
		bottom: actual.bottom - expected.bottom,
	}
}

/**
 * Writes a number for a failure message. Four decimals show a layout unit
 * (1/64 px), and the trailing zeros go.
 */
export function formatLength(value: number): string {
	return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)))
}

/** Writes a box for a failure message. */
export function formatBox(box: Box): string {
	return `{ ${EDGES.map((edge) => `${edge}: ${formatLength(box[edge])}`).join(', ')} }`
}

/**
 * Names a source for a failure message. An element gives its tag and the
 * `data-slot` of the element or of its nearest anchored ancestor.
 */
export function describeSource(source: BoxSource): string {
	if (!isElement(source)) return 'box'

	const slot = source.closest('[data-slot]')?.getAttribute('data-slot')

	return `<${source.tagName.toLowerCase()}>${slot ? `[data-slot="${slot}"]` : ''}`
}
