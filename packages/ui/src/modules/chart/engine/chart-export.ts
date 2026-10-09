/**
 * Client-side export helpers behind the chart context menu. They rasterize the
 * chart to a bitmap, build a CSV from the readout, and hand off to the download
 * plumbing. Pure DOM work run on a menu action, so they touch
 * `document` only when called.
 */

import { clamp } from '../../../utilities'
import { csvField } from '../../../utilities/export-output'
import type { ChartReadout } from './types'

/** The bitmap formats the chart exports to; {@link ChartExportOutcome} names the one a download asked for. */
export type ChartImageType = 'image/png' | 'image/jpeg'

/** The pixel scale a rasterized chart is drawn at, so the bitmap stays crisp on hi-dpi displays. @internal */
const RASTER_SCALE = 2

/** The JPEG quality passed to `toBlob`. @internal */
const JPEG_QUALITY = 0.95

/** The chart's legend containers, pruned from the clone when an image export drops the legend. @internal */
const LEGEND_SELECTOR =
	'[data-slot="chart-legend"],[data-slot="heatmap-legend-box"],[data-slot="map-legend-box"]'

/** The plot regions. The first SVG in each is the drawing that an export without the legend keeps. @internal */
const PLOT_SELECTOR = '[data-slot="chart-plot"],[data-slot="map-plot"]'

/** The chart header. An export without the legend keeps the extent of its text. @internal */
const HEADER_SELECTOR = '[data-slot="chart-header"]'

/**
 * The latin face of the ui font. The bundler of the app copies the file and
 * gives its URL. The face of the page comes from the bytes in
 * `google-sans-flex-latin.js`, and a page cannot read the bytes of a face back.
 * The export thus loads the same subset from this file.
 *
 * @internal
 */
const FONT_URL = new URL('../../../fonts/google-sans-flex-latin.woff2', import.meta.url)

/** The `@font-face` rule that an export embeds, once a load of {@link FONT_URL} succeeds. @internal */
let fontRule: Promise<string> | undefined

/** The subpixel slack of an edge test, so a sibling that meets a box edge to edge counts as past it. @internal */
const EDGE_SLACK = 0.5

/** A box in CSS pixels, relative to the border box of the chart root. @internal */
type CaptureBox = { x: number; y: number; width: number; height: number }

/** A move in CSS pixels. @internal */
type Shift = { x: number; y: number }

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

/** The alpha of a computed CSS color: `rgba(…)`, a slash alpha, or opaque. @internal */
function alphaOf(color: string): number {
	if (color === 'transparent') return 0

	const alpha =
		/\/\s*([\d.]+)(%?)\s*\)$/.exec(color) ?? /^rgba\((?:[^,]+,){3}\s*([\d.]+)()\)$/.exec(color)

	if (!alpha) return 1

	return Number(alpha[1]) / (alpha[2] === '%' ? 100 : 1)
}

/**
 * The background colors under `root`, from the nearest opaque one inward,
 * outermost first: the surface that a chart with no background of its own
 * reads on. A translucent surface keeps the ones beneath it, so a painter can
 * layer them.
 *
 * @internal
 */
function groundOf(root: HTMLElement): string[] {
	const layers: string[] = []

	for (let node: HTMLElement | null = root; node; node = node.parentElement) {
		const color = getComputedStyle(node).backgroundColor

		const alpha = alphaOf(color)

		if (alpha > 0) layers.unshift(color)

		if (alpha >= 1) break
	}

	return layers
}

/**
 * What an export without the legend does to the clone: the legend boxes that it
 * prunes, and the moves that close the bands they leave.
 *
 * @internal
 */
type CapturePlan = {
	pruned: ReadonlySet<Element>
	shifts: ReadonlyMap<Element, Shift>
}

/** The plan of an export that keeps the legend: it prunes and moves nothing. @internal */
const KEEP_ALL: CapturePlan = { pruned: new Set(), shifts: new Map() }

/**
 * Tells whether an element paints nothing and takes no space in the flow. The
 * clone drops such an element and its subtree, so it copies no style for them.
 * A hidden box in the flow stays, because it holds space.
 *
 * Three patterns match. The first is `display: none`. The second is the
 * `sr-only` pattern of the data table and the reference list: an out-of-flow
 * box of 1px or less, which a clip hides. The third is an out-of-flow box with
 * `visibility: hidden`, such as the ghost row of a capped legend.
 *
 * @internal
 */
function paintsNothing(style: CSSStyleDeclaration): boolean {
	if (style.display === 'none') return true

	if (style.position !== 'absolute' && style.position !== 'fixed') return false

	if (style.visibility !== 'visible') return true

	const clipped = style.clipPath !== 'none' || style.getPropertyValue('clip') !== 'auto'

	return clipped && Number.parseFloat(style.width) <= 1 && Number.parseFloat(style.height) <= 1
}

/**
 * The SVG elements that paint only by reference: the definitions, the paint
 * servers, and the masks, clips, markers, symbols, and filters. The SVG 2
 * user-agent sheet sets `display: none` on them, but a reference still paints
 * them, so the capture keeps them whatever their display.
 *
 * @internal
 */
const SVG_RESOURCES = new Set([
	'defs',
	'pattern',
	'lineargradient',
	'radialgradient',
	'mask',
	'clippath',
	'marker',
	'symbol',
	'filter',
])

/** Whether `element` is an SVG element that paints only by reference. @internal */
function isSvgResource(element: Element): boolean {
	return element instanceof SVGElement && SVG_RESOURCES.has(element.localName.toLowerCase())
}

/**
 * Copies a source element's full computed style inline onto its clone.
 * Rasterizing through a `foreignObject` renders the clone detached from the
 * document's stylesheets. Every class-driven and inherited value — color,
 * layout, and font — therefore has to travel on the element itself. The
 * declarations in `extra` come last, so they override the copied values.
 *
 * @internal
 */
function copyComputedStyle(computed: CSSStyleDeclaration, clone: Element, extra: string): void {
	clone.setAttribute(
		'style',
		Array.from(computed, (property) => `${property}:${computed.getPropertyValue(property)};`).join(
			'',
		) + extra,
	)
}

/**
 * Walks a source tree and its clone in lockstep, and freezes each node's
 * computed style onto the clone ({@link copyComputedStyle}). The detached copy
 * then lays out and paints exactly as rendered. The walk drops each child that
 * paints nothing ({@link paintsNothing}). It empties each box that the plan
 * prunes, and moves each box that the plan moves.
 *
 * @internal
 */
function freezeStyleTree(
	source: Element,
	clone: Element,
	computed: CSSStyleDeclaration,
	plan: CapturePlan,
): void {
	// A pruned box stays as an empty, hidden box of the same size. The rest of
	// the clone then lays out as the chart does, and the planned moves hold.
	if (plan.pruned.has(source)) {
		clone.replaceChildren()

		copyComputedStyle(computed, clone, 'visibility:hidden;')

		return
	}

	// The siblings that a pruned box leaves carry no translate of their own, so
	// the move can take the property.
	const shift = plan.shifts.get(source)

	copyComputedStyle(computed, clone, shift ? `translate:${shift.x}px ${shift.y}px;` : '')

	// Pair the children before a removal, so the two lists stay in step.
	const sourceChildren = Array.from(source.children)

	const cloneChildren = Array.from(clone.children)

	for (const [index, sourceChild] of sourceChildren.entries()) {
		const cloneChild = cloneChildren[index]

		if (!cloneChild) continue

		const style = getComputedStyle(sourceChild)

		if (paintsNothing(style) && !isSvgResource(sourceChild)) cloneChild.remove()
		else freezeStyleTree(sourceChild, cloneChild, style, plan)
	}
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
function shiftOf(element: Element, root: Element, plan: CapturePlan): Shift {
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
			add(svg.getBoundingClientRect(), shiftOf(svg, root, plan))
		}
	}

	if (right === Number.NEGATIVE_INFINITY) return null

	const range = root.ownerDocument.createRange()

	for (const header of root.querySelectorAll(HEADER_SELECTOR)) {
		if (isPruned(header, root, plan)) continue

		// The text of a clipped line runs past its box, so each extent stops at the header.
		const frame = header.getBoundingClientRect()

		const shift = shiftOf(header, root, plan)

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
 * half of {@link rasterizeChartImage}. It reads the live chart and writes nothing
 * to it. It clones the root and freezes the computed style of each node onto the
 * clone. It drops each node that paints nothing, such as the hidden data table.
 *
 * Without the legend, it prunes each legend box from the clone and closes the
 * band that the box leaves. It then crops to the drawing and the header text.
 *
 * @param root - The chart root element to capture.
 * @param includeLegend - Whether the capture keeps the legend.
 * @returns The clone and the box that the bitmap crops to.
 * @internal
 */
export function prepareChartCapture(root: HTMLElement, includeLegend: boolean): ChartCapture {
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

	return { clone, box, ground: groundOf(root) }
}

/** Reads a blob as a `data:` URL. @internal */
function dataUrlOf(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()

		reader.addEventListener('load', () => resolve(reader.result as string))

		reader.addEventListener('error', () => reject(reader.error))

		reader.readAsDataURL(blob)
	})
}

/**
 * Gives the `@font-face` rule of the latin face of the ui font, with the bytes
 * of the face in a `data:` URL.
 *
 * An image that an SVG draws loads no file, so the face of the page does not
 * reach the `foreignObject` raster, and the text of the image falls back to a
 * system font. A `data:` URL holds the bytes in the image, so the raster draws
 * the text in the ui font. The first export loads the file, and each later
 * export uses the same rule. When the load fails, the rule is empty, the image
 * draws its text in the fallback font, and the next export tries again.
 *
 * @internal
 */
function embeddedFontRule(): Promise<string> {
	fontRule ??= fetch(FONT_URL)
		.then((response) => {
			if (!response.ok) throw new Error(`chart font failed to load: ${response.status}`)

			return response.blob()
		})
		.then((blob) => dataUrlOf(new Blob([blob], { type: 'font/woff2' })))
		.then(
			(source) =>
				`@font-face{font-family:'Google Sans Flex';font-weight:300 900;font-display:block;src:url(${source}) format('woff2-variations');}`,
		)
		.catch(() => {
			fontRule = undefined

			return ''
		})

	return fontRule
}

/** Loads a data-URL into an `Image`, resolving once decoded. @internal */
function loadImage(source: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()

		image.decoding = 'async'

		image.addEventListener('load', () => resolve(image))

		image.addEventListener('error', () => reject(new Error('chart image failed to load')))

		image.src = source
	})
}

/**
 * Draws a decoded image to a `2×` canvas and encodes it. A JPEG has no alpha, so
 * it paints the `ground` under the image first: white, then each surface layer.
 * A PNG stays transparent.
 *
 * @internal
 */
async function encode(
	image: HTMLImageElement,
	width: number,
	height: number,
	type: ChartImageType,
	ground: string[],
): Promise<Blob | null> {
	const canvas = document.createElement('canvas')

	canvas.width = width * RASTER_SCALE

	canvas.height = height * RASTER_SCALE

	const context = canvas.getContext('2d')

	if (!context) return null

	if (type === 'image/jpeg') {
		// White under all, so a translucent ground with no opaque one beneath it
		// never blends with the black of an empty canvas.
		for (const color of ['#ffffff', ...ground]) {
			context.fillStyle = color

			context.fillRect(0, 0, canvas.width, canvas.height)
		}
	}

	context.drawImage(image, 0, 0, canvas.width, canvas.height)

	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), type, JPEG_QUALITY)
	})
}

/**
 * Rasterizes a whole chart — plot, header, and (by default) legend — to a
 * {@link Blob}. Clones the root, freezes its computed styles onto the clone, and
 * draws it through an SVG `foreignObject`. The HTML chrome and the SVG marks
 * then export as one image. The SVG embeds the latin face of the ui font, so
 * the text of the image keeps the font of the chart. `includeLegend: false` prunes the legend from the
 * clone and crops the image to the plot and the header text, so no blank band
 * remains. The live chart does not change. A JPEG takes the surface under the
 * chart as its ground, so a dark theme exports on its dark surface. A PNG stays
 * transparent.
 *
 * @param root - The chart root element to capture.
 * @param options - The bitmap `type` and whether to keep the legend.
 * @returns The encoded image, or `null` when the canvas cannot encode it.
 */
export async function rasterizeChartImage(
	root: HTMLElement,
	{ type, includeLegend }: { type: ChartImageType; includeLegend: boolean },
): Promise<Blob | null> {
	// Synchronous capture: measure and clone before the first await, so the
	// image shows the chart as it is now.
	const { clone, box, ground } = prepareChartCapture(root, includeLegend)

	// The clone keeps the size of the root. It moves by the crop origin, so the
	// crop fills the image.
	clone.style.translate = `${-box.x}px ${-box.y}px`

	clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')

	const serialized = new XMLSerializer().serializeToString(clone)

	const font = await embeddedFontRule()

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}">` +
		`<style>${font}</style>` +
		`<foreignObject x="0" y="0" width="${box.width}" height="${box.height}">${serialized}</foreignObject></svg>`

	const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

	const image = await loadImage(dataUrl)

	return encode(image, box.width, box.height, type, ground)
}

/**
 * Builds a CSV from a chart's readout: a leading empty corner cell, then one
 * column per series, and one row per category. It is the same category × series
 * grid that the visually-hidden data table renders, so the export mirrors what
 * assistive tech reads. Values are the chart's formatted display strings.
 *
 * @param readout - The values behind the marks.
 * @returns The CSV text, CRLF-delimited.
 */
export function readoutToCsv(readout: ChartReadout): string {
	const header = ['', ...readout.rows.map((row) => row.label)]

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
