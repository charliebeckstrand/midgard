/**
 * Client-side export helpers behind the chart context menu. They rasterize the
 * chart to a bitmap, build a CSV from the readout, and hand off to the download
 * plumbing. Pure DOM work run on a menu action, so they touch
 * `document` only when called.
 */

import {
	type CaptureBox,
	type CapturePlan,
	drawClone,
	freezeStyleTree,
	KEEP_ALL,
	paintsNothing,
	type RasterImageType,
	readGround,
	type Shift,
} from '../../../core/rasterize-element'
import { clamp } from '../../../utilities/clamp'
import { csvField } from '../../../utilities/export-output'
import type { ChartReadout } from './types'

/** The bitmap formats the chart exports to; {@link ChartExportOutcome} names the one a download asked for. */
export type ChartImageType = RasterImageType

/** The chart's legend containers, pruned from the clone when an image export drops the legend. @internal */
const LEGEND_SELECTOR =
	'[data-slot="chart-legend"],[data-slot="heatmap-legend-box"],[data-slot="map-legend-box"]'

/** The plot regions. The first SVG in each is the drawing that an export without the legend keeps. @internal */
const PLOT_SELECTOR = '[data-slot="chart-plot"],[data-slot="map-plot"]'

/** The chart header. An export without the legend keeps the extent of its text. @internal */
const HEADER_SELECTOR = '[data-slot="chart-header"]'

/** The subpixel slack of an edge test, so a sibling that meets a box edge to edge counts as past it. @internal */
const EDGE_SLACK = 0.5

/**
 * The synchronous half of an image export: the clone that the bitmap draws, and
 * the box that the bitmap crops to.
 *
 * @internal
 */
export type ChartCapture = {
	/** The detached copy of the chart root, with the computed style of each node inline. It keeps the size of the root. */
	clone: HTMLElement
	/** The crop, relative to the border box of the root. */
	box: CaptureBox
	/**
	 * The surface under the chart, as the background colors from the nearest
	 * opaque one inward, outermost first. A JPEG paints them in that order under
	 * the image. It is empty where no ancestor paints a background.
	 */
	ground: string[]
}

/** Tells whether each sibling of `element` paints nothing. @internal */
function paintsAlone(element: Element): boolean {
	const siblings = element.parentElement?.children ?? []

	for (const sibling of siblings) {
		if (sibling !== element && !paintsNothing(getComputedStyle(sibling))) return false
	}

	return true
}

/**
 * Finds the legend boxes to prune. A box is the legend, or its outermost
 * ancestor that holds nothing else that paints. A capped legend shares its
 * wrapper only with its ghost row, so the wrapper is the box, and its gap goes
 * with it.
 *
 * @internal
 */
function legendBoxes(root: HTMLElement): Set<Element> {
	const boxes = new Set<Element>()

	for (const legend of root.querySelectorAll(LEGEND_SELECTOR)) {
		let box: Element = legend

		while (box.parentElement && box.parentElement !== root && paintsAlone(box)) {
			box = box.parentElement
		}

		boxes.add(box)
	}

	return boxes
}

/**
 * Plans the move that closes the band a pruned box leaves. Each sibling past the
 * box, along the main axis of the parent, moves back to where the box started. A
 * column closes up. A row closes toward its inline start, which is the left in
 * LTR and the right in RTL. A side legend on the inline-start side then gives
 * its rail to the plot, and a top legend gives its band. The plot then sits
 * under the header, as it does in a chart that has no legend.
 *
 * @internal
 */
function closeBand(box: Element, shifts: Map<Element, Shift>): void {
	const parent = box.parentElement

	if (!parent) return

	const layout = getComputedStyle(parent)

	const row = layout.display.endsWith('flex') && layout.flexDirection.startsWith('row')

	const rtl = layout.direction === 'rtl'

	const edge = box.getBoundingClientRect()

	// How far past the start of the box a sibling starts, or `null` when the
	// sibling does not lie past the box.
	const distance = (rect: DOMRect): number | null => {
		if (!row) return rect.top >= edge.bottom - EDGE_SLACK ? rect.top - edge.top : null

		if (rtl) return rect.right <= edge.left + EDGE_SLACK ? edge.right - rect.right : null

		return rect.left >= edge.right - EDGE_SLACK ? rect.left - edge.left : null
	}

	const past: Element[] = []

	let band = Number.POSITIVE_INFINITY

	for (const sibling of parent.children) {
		if (sibling === box || paintsNothing(getComputedStyle(sibling))) continue

		const reach = distance(sibling.getBoundingClientRect())

		if (reach === null) continue

		past.push(sibling)

		band = Math.min(band, reach)
	}

	const move: Shift = row ? { x: rtl ? band : -band, y: 0 } : { x: 0, y: -band }

	for (const sibling of past) {
		const held = shifts.get(sibling)

		shifts.set(sibling, { x: (held?.x ?? 0) + move.x, y: (held?.y ?? 0) + move.y })
	}
}

/** Plans an export without the legend: the legend boxes to prune, and the moves that close their bands. @internal */
function planWithoutLegend(root: HTMLElement): CapturePlan {
	const pruned = legendBoxes(root)

	const shifts = new Map<Element, Shift>()

	for (const box of pruned) closeBand(box, shifts)

	return { pruned, shifts }
}

/** Tells whether `element` is in a pruned box of `plan`, below `root`. @internal */
function isPruned(element: Element, root: Element, plan: CapturePlan): boolean {
	for (let node: Element | null = element; node && node !== root; node = node.parentElement) {
		if (plan.pruned.has(node)) return true
	}

	return false
}

/** Adds the moves of `element` and of its ancestors below `root`. @internal */
function measureShift(element: Element, root: Element, plan: CapturePlan): Shift {
	let x = 0

	let y = 0

	for (let node: Element | null = element; node && node !== root; node = node.parentElement) {
		const shift = plan.shifts.get(node)

		x += shift?.x ?? 0

		y += shift?.y ?? 0
	}

	return { x, y }
}

/**
 * Measures the drawn content of a chart without its legend. That is the union of
 * each drawing SVG and the text of the header, at the places the planned moves
 * give them in the clone. A `Range` measures the text, because the header box
 * spans the chart and its text does not. The box is relative to the root,
 * rounded out to whole pixels, and held inside `full`.
 *
 * @returns The box, or `null` when the chart has no drawing to measure.
 * @internal
 */
function drawnBox(root: HTMLElement, plan: CapturePlan, full: CaptureBox): CaptureBox | null {
	const origin = root.getBoundingClientRect()

	let left = Number.POSITIVE_INFINITY

	let top = Number.POSITIVE_INFINITY

	let right = Number.NEGATIVE_INFINITY

	let bottom = Number.NEGATIVE_INFINITY

	const add = (
		edges: { left: number; top: number; right: number; bottom: number },
		shift: Shift,
	) => {
		if (edges.right <= edges.left || edges.bottom <= edges.top) return

		left = Math.min(left, edges.left + shift.x)

		top = Math.min(top, edges.top + shift.y)

		right = Math.max(right, edges.right + shift.x)

		bottom = Math.max(bottom, edges.bottom + shift.y)
	}

	for (const plot of root.querySelectorAll(PLOT_SELECTOR)) {
		const svg = plot.querySelector('svg')

		if (svg && !isPruned(svg, root, plan)) {
			add(svg.getBoundingClientRect(), measureShift(svg, root, plan))
		}
	}

	if (right === Number.NEGATIVE_INFINITY) return null

	const range = root.ownerDocument.createRange()

	for (const header of root.querySelectorAll(HEADER_SELECTOR)) {
		if (isPruned(header, root, plan)) continue

		// The text of a clipped line runs past its box, so each extent stops at the header.
		const frame = header.getBoundingClientRect()

		const shift = measureShift(header, root, plan)

		const walker = root.ownerDocument.createTreeWalker(header, NodeFilter.SHOW_TEXT)

		for (let text = walker.nextNode(); text; text = walker.nextNode()) {
			range.selectNodeContents(text)

			const extent = range.getBoundingClientRect()

			add(
				{
					left: Math.max(extent.left, frame.left),
					top: Math.max(extent.top, frame.top),
					right: Math.min(extent.right, frame.right),
					bottom: Math.min(extent.bottom, frame.bottom),
				},
				shift,
			)
		}
	}

	const x = clamp(Math.floor(left - origin.left), 0, full.width)

	const y = clamp(Math.floor(top - origin.top), 0, full.height)

	const width = clamp(Math.ceil(right - origin.left), 0, full.width) - x

	const height = clamp(Math.ceil(bottom - origin.top), 0, full.height) - y

	return width > 0 && height > 0 ? { x, y, width, height } : null
}

/**
 * Prepares the capture of a chart for an image export. It is the synchronous
 * half of {@link rasterizeImage}. It reads the live chart and writes nothing
 * to it. It clones the root and freezes the computed style of each node onto the
 * clone. It drops each node that paints nothing, such as the hidden data table.
 * The clone of the root has no margin, so it fills the box from its origin.
 *
 * Without the legend, it prunes each legend box from the clone and closes the
 * band that the box leaves. It then crops to the drawing and the header text.
 *
 * @param root - The chart root element to capture.
 * @param includeLegend - Whether the capture keeps the legend.
 * @returns The clone and the box that the bitmap crops to.
 * @internal
 */
export function prepareCapture(root: HTMLElement, includeLegend: boolean): ChartCapture {
	const rect = root.getBoundingClientRect()

	const full: CaptureBox = {
		x: 0,
		y: 0,
		width: Math.max(1, Math.round(rect.width)),
		height: Math.max(1, Math.round(rect.height)),
	}

	const plan = includeLegend ? KEEP_ALL : planWithoutLegend(root)

	const box = includeLegend ? full : (drawnBox(root, plan, full) ?? full)

	const clone = root.cloneNode(true) as HTMLElement

	freezeStyleTree(root, clone, getComputedStyle(root), plan)

	// The box is the border box of the root, which excludes its margin. The
	// clone therefore drops the margin, so it starts at the origin of the box.
	clone.style.margin = '0'

	return { clone, box, ground: readGround(root) }
}

/**
 * Rasterizes a whole chart (plot, header, and, by default, legend) to a
 * {@link Blob}. Clones the root, freezes its computed styles onto the clone,
 * and draws it through an SVG `foreignObject`. The HTML chrome and the SVG
 * marks then export as one image. The SVG embeds the latin face of the ui font,
 * so the text of the image keeps the font of the chart. `includeLegend: false`
 * prunes the legend from the clone and crops the image to the plot and the
 * header text, so no blank band remains. The live chart does not change. A JPEG
 * takes the surface under the chart as its ground, so a dark theme exports on
 * its dark surface. A PNG stays transparent.
 *
 * @param root - The chart root element to capture.
 * @param options - The bitmap `type` and whether to keep the legend.
 * @returns The encoded image, or `null` when the canvas cannot encode it.
 */
export async function rasterizeImage(
	root: HTMLElement,
	{ type, includeLegend }: { type: ChartImageType; includeLegend: boolean },
): Promise<Blob | null> {
	// Synchronous capture: measure and clone before the first await, so the
	// image shows the chart as it is now.
	const { clone, box, ground } = prepareCapture(root, includeLegend)

	// A PNG stays transparent, and a JPEG paints the ground.
	return drawClone(clone, box, type, type === 'image/jpeg' ? ground : null)
}

/**
 * Builds a CSV from a chart's readout: a leading corner cell (the readout's
 * `corner`, else empty), then one column per series, and one row per category. It is the same category × series
 * grid that the visually-hidden data table renders, so the export mirrors what
 * assistive tech reads. Values are the chart's formatted display strings.
 *
 * @param readout - The values behind the marks.
 * @returns The CSV text, CRLF-delimited.
 */
export function readoutToCsv(readout: ChartReadout): string {
	const header = [readout.corner ?? '', ...readout.rows.map((row) => row.label)]

	const body = readout.categories.map((category, index) => [
		category,
		...readout.rows.map((row) => row.values[index] ?? ''),
	])

	return [header, ...body]
		.map((row) => row.map((field) => csvField(field, { formatted: true })).join(','))
		.join('\r\n')
}

/**
 * The combining diacritics that NFKD splits from an accented Latin, Greek, or
 * Cyrillic letter. The slug removes them and keeps the base letter. The marks of
 * other scripts, such as a Devanagari vowel sign, are part of the word and stay.
 *
 * @internal
 */
const DIACRITICS = /[\u0300-\u036f]/g

/**
 * Slugifies a chart title into a filename stem, falling back to `'chart'`. The
 * slug folds a Latin accent to its base letter, and keeps the letters, marks,
 * and digits of each script. `Umsätze München` gives `umsatze-munchen`, and
 * `売上` stays `売上`. NFC then composes each character that NFKD split, such as
 * a Hangul syllable.
 *
 * @internal
 */
function fileStem(title: string | undefined): string {
	const slug = (title ?? '')
		.trim()
		.toLowerCase()
		.normalize('NFKD')
		.replace(DIACRITICS, '')
		.normalize('NFC')
		.replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '')

	return slug || 'chart'
}

/** The export filename for a chart: its slugified title and the format's extension. @internal */
export function chartFileName(title: string | undefined, extension: string): string {
	return `${fileStem(title)}.${extension}`
}
