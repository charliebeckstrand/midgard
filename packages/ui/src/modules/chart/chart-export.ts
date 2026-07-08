/**
 * Client-side export helpers behind the chart context menu: rasterising the
 * chart to a bitmap, building a CSV from the readout, and the download plumbing
 * they hand off to. Pure DOM work run on a menu action, so they touch
 * `document` only when called.
 */

import type { ChartReadout } from './types'

/** The bitmap formats the chart exports to. @internal */
export type ChartImageType = 'image/png' | 'image/jpeg'

/** The pixel scale a rasterised chart is drawn at, so the bitmap stays crisp on hi-dpi displays. @internal */
const RASTER_SCALE = 2

/** The JPEG quality passed to `toBlob`. @internal */
const JPEG_QUALITY = 0.95

/** The chart's legend containers, hidden when an image export drops the legend. @internal */
const LEGEND_SELECTOR = '[data-slot="chart-legend"],[data-slot="heatmap-legend-box"]'

/**
 * Copies a source element's full computed style inline onto its clone.
 * Rasterising through a `foreignObject` renders the clone detached from the
 * document's stylesheets, so every class-driven and inherited value — colour,
 * layout, and font — has to travel on the element itself.
 *
 * @internal
 */
function copyComputedStyle(source: Element, clone: Element): void {
	const computed = getComputedStyle(source)

	let cssText = ''

	for (let index = 0; index < computed.length; index++) {
		const property = computed.item(index)

		cssText += `${property}:${computed.getPropertyValue(property)};`
	}

	clone.setAttribute('style', cssText)
}

/**
 * Walks a source tree and its clone in lockstep, freezing each node's computed
 * style onto the clone ({@link copyComputedStyle}) so the detached copy lays out
 * and paints exactly as rendered.
 *
 * @internal
 */
function freezeStyleTree(source: Element, clone: Element): void {
	copyComputedStyle(source, clone)

	const sourceChildren = source.children

	const cloneChildren = clone.children

	const count = Math.min(sourceChildren.length, cloneChildren.length)

	for (let index = 0; index < count; index++) {
		const sourceChild = sourceChildren.item(index)

		const cloneChild = cloneChildren.item(index)

		if (sourceChild && cloneChild) freezeStyleTree(sourceChild, cloneChild)
	}
}

/**
 * Hides a chart's legend containers in place, returning a restore per node. Used
 * to reflow the live chart without its legend before the styles are frozen, so
 * an export that drops the legend leaves no gap where it sat. Synchronous — the
 * caller restores before yielding, so the page never repaints the hidden state.
 *
 * @internal
 */
function hideLegends(root: Element): (() => void)[] {
	const restores: (() => void)[] = []

	for (const node of root.querySelectorAll<HTMLElement>(LEGEND_SELECTOR)) {
		const previous = node.style.display

		node.style.display = 'none'

		restores.push(() => {
			node.style.display = previous
		})
	}

	return restores
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

/** Draws a decoded image to a `2×` canvas — white-grounded for JPEG, transparent for PNG — and encodes it. @internal */
async function encode(
	image: HTMLImageElement,
	width: number,
	height: number,
	type: ChartImageType,
): Promise<Blob | null> {
	const canvas = document.createElement('canvas')

	canvas.width = width * RASTER_SCALE

	canvas.height = height * RASTER_SCALE

	const context = canvas.getContext('2d')

	if (!context) return null

	if (type === 'image/jpeg') {
		context.fillStyle = '#ffffff'

		context.fillRect(0, 0, canvas.width, canvas.height)
	}

	context.drawImage(image, 0, 0, canvas.width, canvas.height)

	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), type, JPEG_QUALITY)
	})
}

/**
 * Rasterises a whole chart — plot, header, and (by default) legend — to a
 * {@link Blob}. Clones the root, freezes its computed styles onto the clone, and
 * draws it through an SVG `foreignObject` so the HTML chrome and the SVG marks
 * export as one image. `includeLegend: false` hides the legend first, so the
 * chart reflows without it and no gap remains. JPEG gets an opaque white ground;
 * PNG stays transparent.
 *
 * @param root - The chart root element to capture.
 * @param options - The bitmap `type` and whether to keep the legend.
 * @returns The encoded image, or `null` when the canvas cannot encode it.
 */
export async function rasterizeChartImage(
	root: HTMLElement,
	{ type, includeLegend }: { type: ChartImageType; includeLegend: boolean },
): Promise<Blob | null> {
	// Synchronous capture: hide the legend, measure and clone the reflowed chart,
	// freeze its styles, then restore — all before the first await, so the page
	// never paints the hidden state.
	const restores = includeLegend ? [] : hideLegends(root)

	const rect = root.getBoundingClientRect()

	const width = Math.max(1, Math.round(rect.width))

	const height = Math.max(1, Math.round(rect.height))

	const clone = root.cloneNode(true) as HTMLElement

	freezeStyleTree(root, clone)

	for (const restore of restores) restore()

	clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')

	const serialized = new XMLSerializer().serializeToString(clone)

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
		`<foreignObject x="0" y="0" width="${width}" height="${height}">${serialized}</foreignObject></svg>`

	const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

	const image = await loadImage(dataUrl)

	return encode(image, width, height, type)
}

/** Escapes one CSV field, quoting it when it holds a comma, quote, or newline. @internal */
function csvField(value: string): string {
	return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Builds a CSV from a chart's readout: a leading empty corner cell then one
 * column per series, and one row per category — the same category × series grid
 * the visually-hidden data table renders, so the export mirrors what assistive
 * tech reads. Values are the chart's formatted display strings.
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

	return [header, ...body].map((row) => row.map(csvField).join(',')).join('\r\n')
}

/** Slugifies a chart title into a filename stem, falling back to `'chart'`. @internal */
function fileStem(title: string | undefined): string {
	const slug = (title ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

	return slug || 'chart'
}

/** The export filename for a chart: its slugified title and the format's extension. @internal */
export function chartFileName(title: string | undefined, extension: string): string {
	return `${fileStem(title)}.${extension}`
}

/** Downloads a blob under `filename` via a transient object URL. @internal */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)

	const anchor = document.createElement('a')

	anchor.href = url

	anchor.download = filename

	anchor.rel = 'noopener'

	document.body.append(anchor)

	anchor.click()

	anchor.remove()

	// Revoke on the next tick, after the click has been handed to the browser's
	// download machinery — revoking synchronously can cancel the download.
	setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Downloads text as a UTF-8 file of the given MIME type. @internal */
export function downloadText(text: string, filename: string, mime: string): void {
	downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename)
}

/** Writes text to the clipboard; a rejected write no-ops. @internal */
export function copyText(text: string): void {
	navigator.clipboard?.writeText(text).catch(() => {})
}
