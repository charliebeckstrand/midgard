/**
 * Client-side export helpers behind the chart context menu: rasterising the
 * plot SVG to a bitmap, building a CSV from the readout, and the download /
 * clipboard plumbing they hand off to. Pure DOM work run on a menu action, so
 * they touch `document` / `navigator` only when called.
 */

import type { ChartReadout } from './types'

/** The bitmap formats the chart exports to. @internal */
export type ChartImageType = 'image/png' | 'image/jpeg'

/**
 * The SVG presentation properties copied inline before rasterising. The plot's
 * paint lives in CSS classes and `currentColor`, which a serialised SVG loses
 * once it leaves the document, so each is resolved through `getComputedStyle`
 * and written onto the clone.
 *
 * @internal
 */
const INLINED_STYLE_PROPERTIES = [
	'fill',
	'fill-opacity',
	'fill-rule',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-linecap',
	'stroke-linejoin',
	'opacity',
	'color',
	'font-family',
	'font-size',
	'font-weight',
	'font-style',
	'text-anchor',
	'dominant-baseline',
	'letter-spacing',
	'visibility',
	'display',
	'mix-blend-mode',
] as const

/** The pixel scale a rasterised chart is drawn at, so the bitmap stays crisp on hi-dpi displays. @internal */
const RASTER_SCALE = 2

/** The JPEG quality passed to `toBlob`. @internal */
const JPEG_QUALITY = 0.95

/**
 * Walks a source element and its clone in lockstep, writing the source's
 * resolved presentation styles onto the clone. `getComputedStyle` resolves
 * `currentColor` and class-driven paint to used values, so the detached clone
 * carries its own colours once the document's stylesheets no longer reach it.
 *
 * @internal
 */
function inlineComputedStyles(source: Element, clone: Element): void {
	const computed = getComputedStyle(source)

	let inline = ''

	for (const property of INLINED_STYLE_PROPERTIES) {
		const value = computed.getPropertyValue(property)

		if (value) inline += `${property}:${value};`
	}

	clone.setAttribute('style', inline)

	const sourceChildren = source.children

	const cloneChildren = clone.children

	for (let index = 0; index < sourceChildren.length; index++) {
		const sourceChild = sourceChildren.item(index)

		const cloneChild = cloneChildren.item(index)

		if (sourceChild && cloneChild) inlineComputedStyles(sourceChild, cloneChild)
	}
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
 * Rasterises a plot SVG to a {@link Blob}: clones it, inlines its computed
 * paint, serialises it to a data-URL, then draws it to a `2×` canvas. A `'image/jpeg'`
 * type paints an opaque white ground first (JPEG has no alpha); PNG stays
 * transparent.
 *
 * @param svg - The live plot `<svg>` to capture.
 * @param type - The bitmap format to encode.
 * @returns The encoded image, or `null` when the canvas cannot encode it.
 */
export async function rasterizeChartSvg(
	svg: SVGSVGElement,
	type: ChartImageType,
): Promise<Blob | null> {
	const rect = svg.getBoundingClientRect()

	const width = Math.max(1, Math.round(rect.width))

	const height = Math.max(1, Math.round(rect.height))

	const clone = svg.cloneNode(true) as SVGSVGElement

	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

	clone.setAttribute('width', String(width))

	clone.setAttribute('height', String(height))

	inlineComputedStyles(svg, clone)

	const serialized = new XMLSerializer().serializeToString(clone)

	const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`

	const image = await loadImage(dataUrl)

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

/** Prefix stamped on a snapshot's ids and references, so the clone never collides with the live chart's ids. @internal */
const SNAPSHOT_ID_PREFIX = 'chart-fs-'

/**
 * Namespaces every `id` and same-document reference (`url(#…)`, `href="#…"`) in
 * a markup string, so a chart cloned into the fullscreen dialog stays
 * self-consistent without colliding with the live chart's ids — a textured
 * chart's pattern fills keep resolving to the clone's own defs, not the
 * original's.
 *
 * @internal
 */
function namespaceSvgIds(markup: string): string {
	return markup
		.replace(/\bid="([^"]+)"/g, `id="${SNAPSHOT_ID_PREFIX}$1"`)
		.replace(/url\(#([^)]+)\)/g, `url(#${SNAPSHOT_ID_PREFIX}$1)`)
		.replace(/((?:xlink:href|href)=")#([^"]+)"/g, `$1#${SNAPSHOT_ID_PREFIX}$2`)
}

/**
 * Captures a chart's rendered markup as an id-namespaced HTML string for the
 * fullscreen dialog — a same-document snapshot whose CSS classes still resolve,
 * so the enlarged chart keeps its paint without re-measuring. It is a visual
 * still: the live chart and its data table stay the accessible source.
 *
 * @param root - The chart root element to clone.
 * @returns The chart's `outerHTML` with its ids namespaced.
 */
export function captureChartSnapshot(root: HTMLElement): string {
	return namespaceSvgIds(root.outerHTML)
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

/**
 * Whether the async Clipboard image API is available — a secure context with
 * `ClipboardItem`. Gates the "Copy image" action, so it never renders where the
 * write would throw.
 *
 * @internal
 */
export function canCopyImage(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		Boolean(navigator.clipboard) &&
		typeof ClipboardItem !== 'undefined'
	)
}

/** Writes an image blob to the clipboard; a rejected write (denied permission) no-ops. @internal */
export async function copyImage(blob: Blob): Promise<void> {
	if (!canCopyImage()) return

	try {
		await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
	} catch {
		// Fire-and-forget: a denied permission or unfocused document has no
		// copy-failed affordance to drive, matching the grid's clipboard writes.
	}
}

/** Writes text to the clipboard; a rejected write no-ops. @internal */
export function copyText(text: string): void {
	navigator.clipboard?.writeText(text).catch(() => {})
}
