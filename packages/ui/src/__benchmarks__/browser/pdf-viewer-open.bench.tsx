/**
 * What a reader waits for when a PDF opens cold, and where that time goes.
 *
 * - `cold open · N pages` mounts `PdfViewer` on a document that nothing holds, and each
 *   sample ends when the render queue is idle: the shown page, its neighbor, and every
 *   thumbnail. The first page is when the reader can read, and the settle is when the rail is
 *   whole. The sample times the settle. The last sample of each count prints the mean time to
 *   the first painted page, and the full rasters that the open rendered.
 * - `stage · …` splits one page into the steps that the rasterizer takes: the pdf.js render
 *   onto a canvas, then the encode that turns the canvas into the image the viewer shows.
 *   The encoders beside PNG are the alternatives, so each one's cost is on record. The
 *   describe also prints the size of the page in each format. The `bitmap` row is the path that
 *   the viewer takes now: it keeps the canvas as an `ImageBitmap`, with no encode.
 *   The `work only` rows answer each animation frame that pdf.js waits for in a microtask, so
 *   they give the work of a render without its frame pacing.
 * - `flip · resident page` shows a page that has a full raster, from the commit to the page that
 *   can paint. The bench also prints the rasters that the document holds.
 * - `flip · far page` shows a page with no full raster, so each sample is one render.
 *
 * The documents come from `pdf-fixtures.ts`: US-Letter invoice pages with 40 rows of text,
 * built in memory. The file loads the legacy build of pdf.js, as the viewer does, because the
 * modern build calls built-ins that the pinned Chromium (141) lacks. Its worker goes in as the
 * global `workerPort`, so it lives for the whole run, as the viewer's shared worker does in an
 * app. The samples run one after another, so the overlap that the shared
 * worker exists for never comes up.
 *
 * Baseline (Chromium 141, headless, device pixel ratio 1, so the raster scale is 1.5):
 *
 * | Pages | First page painted | Settled |
 * | ---: | ---: | ---: |
 * | 1 | 63 ms | 75 ms |
 * | 3 | 107 ms | 119 ms |
 * | 14 | 343 ms | 356 ms |
 * | 50 | 1,199 ms | 1,213 ms |
 *
 * In that baseline, the first page painted only when the whole document settled, because the
 * viewport showed a page only while `loading` was false. The viewport now shows a page as it
 * lands, and the first page paints in about 60 ms at each page count (README, optimization
 * log). Each page after the first still adds about 23 ms to the settle. At 2x, one page renders in about 17.5 ms and encodes to PNG in
 * about 12.7 ms (269 KiB). JPEG encodes in about 16 ms (315 KiB), and WebP in about 176 ms
 * (148 KiB), so no other encoder is a cheaper path. The decoded page is 7.4 MiB.
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { bench, describe } from 'vitest'
import { PdfViewer } from '../../components/pdf-viewer'
import {
	documentCacheState,
	getDocumentSnapshot,
	hasRaster,
	resetDocumentCache,
	subscribeDocument,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { host } from './harness'
import { makeInvoicePdf, servePdf } from './pdf-fixtures'

pdfjs.GlobalWorkerOptions.workerPort = new Worker(
	new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
	{ type: 'module' },
)

/** The page counts: one scan, a carrier invoice, the demo's paper, and a long packet. */
const PAGE_COUNTS = [1, 3, 14, 50] as const

/** Few samples, because one sample of the long packet takes seconds. */
const OPEN_OPTIONS = { time: 0, iterations: 5, warmupIterations: 1 } as const

/** The ms from mount to the first painted page of each sample, per page count. */
const firstPage = new Map<number, number[]>()

/** The full rasters that each sample rendered, per page count. */
const fullRasters = new Map<number, number[]>()

/**
 * Mounts a viewer on a fresh copy of the document and resolves when it settles.
 *
 * @returns The ms from mount to the first page image that decoded in the viewport.
 */
async function openCold(bytes: Uint8Array): Promise<{ painted: number; rasters: number }> {
	resetDocumentCache()

	const src = servePdf(bytes)

	// A sized box, as a panel gives it, so the viewport measures and shows the page.
	const box = host({ width: 800, height: 1000 })

	const root = createRoot(box)

	const start = performance.now()

	let painted = Number.NaN

	const observer = new MutationObserver(() => {
		if (!Number.isNaN(painted)) return

		const image = pageImage(box)

		if (!image) return

		painted = -1

		shown(image).then(() => {
			painted = performance.now() - start
		})
	})

	observer.observe(box, { childList: true, subtree: true })

	await new Promise<void>((resolve, reject) => {
		flushSync(() =>
			root.render(
				<PdfViewer
					src={src}
					fit="page"
					aria-label="Invoice"
					onLoad={() => resolve()}
					onError={reject}
				/>,
			),
		)
	})

	// `onLoad` reports the open. The sample ends when the queue has nothing more to render.
	await rendered(src)

	const rasters = documentCacheState().find((entry) => entry.src === src)?.rasters ?? 0

	// The decode of the first page can land after the load report.
	while (painted < 0 || Number.isNaN(painted)) {
		await new Promise(requestAnimationFrame)
	}

	observer.disconnect()

	root.unmount()

	box.remove()

	URL.revokeObjectURL(src)

	return { painted, rasters }
}

/** The page image of the viewport: an `<img>`, or the `<canvas>` of a bitmap. */
function pageImage(box: HTMLElement) {
	return box.querySelector<HTMLImageElement | HTMLCanvasElement>(
		'[data-slot="pdf-viewer-page-frame"] [data-slot="pdf-viewer-page-image"]',
	)
}

/**
 * Resolves when `image` can paint: an `<img>` once it decodes, and a `<canvas>` at once,
 * because the viewer draws its bitmap in the commit that mounts it.
 */
function shown(image: HTMLImageElement | HTMLCanvasElement) {
	if (image instanceof HTMLCanvasElement) return Promise.resolve()

	return image.decode().catch(() => {})
}

/** Resolves when `src` is open and its queue has nothing more to render. */
function rendered(src: string) {
	return new Promise<void>((resolve) => {
		const done = () =>
			!getDocumentSnapshot(src).loading &&
			documentCacheState().find((entry) => entry.src === src)?.rendering === false

		if (done()) return resolve()

		const unsubscribe = subscribeDocument(src, () => {
			if (!done()) return

			unsubscribe()

			resolve()
		})
	})
}

/**
 * Runs `body` with a `requestAnimationFrame` that calls back in a microtask.
 *
 * @remarks pdf.js paints a display render in slices of 15 ms, and it waits for an animation
 * frame before each slice. A frame costs about 17 ms in this container (README), so a timed
 * render reads the frames and not the work. The render here still runs every slice, and the
 * difference from the frame-paced row is the wait.
 */
async function withoutFrames(body: () => Promise<void>) {
	const request = window.requestAnimationFrame

	let id = 0

	window.requestAnimationFrame = (callback) => {
		id += 1

		queueMicrotask(() => callback(performance.now()))

		return id
	}

	try {
		await body()
	} finally {
		window.requestAnimationFrame = request
	}
}

/** Runs `body` and counts the animation frames that it asks for. */
async function countFrames(body: () => Promise<void>): Promise<number> {
	const request = window.requestAnimationFrame

	let frames = 0

	window.requestAnimationFrame = (callback) => {
		frames += 1

		return request(callback)
	}

	try {
		await body()
	} finally {
		window.requestAnimationFrame = request
	}

	return frames
}

describe('pdf viewer · cold open', () => {
	for (const count of PAGE_COUNTS) {
		const bytes = makeInvoicePdf(count)

		firstPage.set(count, [])

		fullRasters.set(count, [])

		bench(
			`cold open · ${count} pages · settled`,
			async () => {
				const samples = firstPage.get(count) ?? []

				const { painted, rasters } = await openCold(bytes)

				samples.push(painted)

				fullRasters.get(count)?.push(rasters)

				// The bench prints only its own timing, so the last sample prints this one. The
				// warm-up sample is left out of the mean.
				if (samples.length === OPEN_OPTIONS.warmupIterations + OPEN_OPTIONS.iterations) {
					const timed = samples.slice(OPEN_OPTIONS.warmupIterations)

					const mean = timed.reduce((sum, value) => sum + value, 0) / timed.length

					console.log(
						`cold open · ${count} pages · first page painted · mean ${mean.toFixed(1)} ms · full rasters ${fullRasters.get(count)?.at(-1) ?? 0}`,
					)
				}
			},
			OPEN_OPTIONS,
		)
	}
})

describe('pdf viewer · stage · one invoice page at 2x', async () => {
	const doc = await pdfjs.getDocument({ data: makeInvoicePdf(1) }).promise

	const page = await doc.getPage(1)

	const viewport = page.getViewport({ scale: 2 })

	const canvas = document.createElement('canvas')

	canvas.width = viewport.width
	canvas.height = viewport.height

	const context = canvas.getContext('2d')

	if (!context) throw new Error('No 2D context')

	const render = () => page.render({ canvas, canvasContext: context, viewport }).promise

	const thumbnailViewport = page.getViewport({ scale: 0.2 })

	const thumbnailCanvas = document.createElement('canvas')

	thumbnailCanvas.width = thumbnailViewport.width
	thumbnailCanvas.height = thumbnailViewport.height

	const thumbnailContext = thumbnailCanvas.getContext('2d')

	if (!thumbnailContext) throw new Error('No 2D context')

	const renderThumbnail = () =>
		page.render({
			canvas: thumbnailCanvas,
			canvasContext: thumbnailContext,
			viewport: thumbnailViewport,
		}).promise

	console.log(
		`render at 2x waits for ${(await countFrames(render)).toString()} frames, at 0.2x for ${(await countFrames(renderThumbnail)).toString()}`,
	)

	await render()

	const encode = (type: string, quality?: number) =>
		new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

	const sizes: string[] = []

	for (const [type, quality] of [
		['image/png', undefined],
		['image/webp', 0.92],
		['image/jpeg', 0.92],
	] as const) {
		const blob = await encode(type, quality)

		sizes.push(`${type} ${((blob?.size ?? 0) / 1024).toFixed(0)} KiB`)
	}

	console.log(
		`encoded page (${canvas.width}x${canvas.height}, raw ${((canvas.width * canvas.height * 4) / 1024 / 1024).toFixed(1)} MiB): ${sizes.join(', ')}`,
	)

	bench('stage · render to canvas', render, { time: 2_000 })

	bench('stage · render to canvas · work only', () => withoutFrames(render), { time: 2_000 })

	bench('stage · render at 0.2x · work only', () => withoutFrames(renderThumbnail), {
		time: 2_000,
	})

	bench('stage · encode · png', () => encode('image/png').then(() => {}), { time: 2_000 })

	bench(
		'stage · bitmap · createImageBitmap',
		() => createImageBitmap(canvas).then((bitmap) => bitmap.close()),
		{ time: 2_000 },
	)

	bench('stage · encode · webp 0.92', () => encode('image/webp', 0.92).then(() => {}), {
		time: 2_000,
	})

	bench('stage · encode · jpeg 0.92', () => encode('image/jpeg', 0.92).then(() => {}), {
		time: 2_000,
	})
})

/**
 * Mounts a viewer on a document of `count` pages, and resolves when its queue is idle.
 *
 * @remarks Called from the first sample of a flip bench, not from the body of its describe.
 * A describe body runs when the file loads, before the cold open resets the cache for each of
 * its samples. The document would therefore be gone by the time the flips run.
 */
async function mountResident(count: number) {
	resetDocumentCache()

	const src = servePdf(makeInvoicePdf(count))

	const box = host({ width: 800, height: 1000 })

	const root = createRoot(box)

	const view = (page: number, onLoad?: () => void) => (
		<PdfViewer src={src} page={page} fit="page" aria-label="Invoice" onLoad={onLoad} />
	)

	await new Promise<void>((resolve) => {
		flushSync(() => root.render(view(1, resolve)))
	})

	await rendered(src)

	/** Shows `page`, and resolves when its image has decoded. */
	const show = async (page: number) => {
		flushSync(() => root.render(view(page)))

		await rasterOf(src, page - 1)

		const image = pageImage(box)

		if (image) await shown(image)
	}

	return { src, show }
}

describe('pdf viewer · page flip', () => {
	let resident: ReturnType<typeof mountResident> | undefined

	let current = 1

	// One flip, from the commit to the decoded image of the next page. The pages alternate, so
	// no sample reads an image that it already shows. Both are resident: the queue renders the
	// shown page and its neighbors.
	bench(
		'flip · resident page',
		async () => {
			if (!resident) {
				resident = mountResident(14)

				await printResident((await resident).src)
			}

			const { show } = await resident

			current = current === 1 ? 2 : 1

			await show(current)
		},
		{ time: 2_000 },
	)

	let packet: ReturnType<typeof mountResident> | undefined

	let step = 0

	/*
	 * A flip to a page that holds no raster: one render, from the commit to the decoded image.
	 * The cycle moves 5 pages at a time over 50 pages, so each page comes back after 10 moves.
	 * Each move leaves at least one raster, so the bound of 8 has dropped the page by then.
	 */
	bench(
		'flip · far page',
		async () => {
			packet ??= mountResident(50)

			const { show } = await packet

			step = (step + 1) % 10

			await show(step * 5 + 1)
		},
		{ time: 2_000 },
	)
})

/** Prints the rasters that a resident document holds. */
async function printResident(src: string) {
	const { pages } = getDocumentSnapshot(src)

	const full = pages.filter(hasRaster)

	let bytes = 0

	for (const page of pages) {
		if (page.thumbnail) bytes += (await (await fetch(page.thumbnail)).blob()).size
	}

	const entry = documentCacheState().find((held) => held.src === src)

	console.log(
		`resident · ${pages.length} pages · ${full.length} full rasters as ${((entry?.bitmapBytes ?? 0) / 1024 / 1024).toFixed(1)} MiB of bitmap · ${(bytes / 1024 / 1024).toFixed(2)} MiB of thumbnail PNG`,
	)
}

/** Resolves when the page at the 0-based `index` of `src` has its full raster. */
function rasterOf(src: string, index: number) {
	return new Promise<void>((resolve) => {
		const done = () => hasRaster(getDocumentSnapshot(src).pages[index])

		if (done()) return resolve()

		const unsubscribe = subscribeDocument(src, () => {
			if (!done()) return

			unsubscribe()

			resolve()
		})
	})
}
