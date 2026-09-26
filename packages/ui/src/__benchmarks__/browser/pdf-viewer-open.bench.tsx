/**
 * What a reader waits for when a PDF opens cold, and where that time goes.
 *
 * - `cold open · N pages` mounts `PdfViewer` on a document that nothing holds, and each
 *   sample ends when the last page renders. The first page and the whole document
 *   are both on the reader's path: the first page is when they can read, and the settle is
 *   when the rail and the page count are whole. The sample times the settle. The last sample
 *   of each count prints the mean time to the first painted page over the same samples.
 * - `stage · …` splits one page into the steps that the rasterizer takes: the pdf.js render
 *   onto a canvas, then the encode that turns the canvas into the image the viewer shows.
 *   The encoders beside PNG are the alternatives, so each one's cost is on record. The
 *   describe also prints the size of the page in each format.
 *   The `work only` rows answer each animation frame that pdf.js waits for in a microtask, so
 *   they give the work of a render without its frame pacing.
 * - `flip · resident page` shows the next page of a document that the cache holds, from the
 *   commit to the decoded image. The describe also prints the PNG that the document holds.
 *
 * The documents come from `pdf-fixtures.ts`: US-Letter invoice pages with 40 rows of text,
 * built in memory. pdf.js 6 calls `Map.prototype.getOrInsertComputed`, which the pinned
 * Chromium (141) lacks, so this file fills it in the page and in the worker. The filled worker
 * goes in as the global `workerPort`, so it lives for the whole run, as the viewer's shared
 * worker does in an app. The samples run one after another, so the overlap that the shared
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

import * as pdfjs from 'pdfjs-dist'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { bench, describe } from 'vitest'
import { PdfViewer } from '../../components/pdf-viewer'
import {
	getDocumentSnapshot,
	resetDocumentCache,
	subscribeDocument,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { host } from './harness'
import { makeInvoicePdf, polyfilledWorker, polyfillUpsert, servePdf } from './pdf-fixtures'

polyfillUpsert()

pdfjs.GlobalWorkerOptions.workerPort = polyfilledWorker(
	new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href,
)

/** The page counts: one scan, a carrier invoice, the demo's paper, and a long packet. */
const PAGE_COUNTS = [1, 3, 14, 50] as const

/** Few samples, because one sample of the long packet takes seconds. */
const OPEN_OPTIONS = { time: 0, iterations: 5, warmupIterations: 1 } as const

/** The ms from mount to the first painted page of each sample, per page count. */
const firstPage = new Map<number, number[]>()

/**
 * Mounts a viewer on a fresh copy of the document and resolves when it settles.
 *
 * @returns The ms from mount to the first page image that decoded in the viewport.
 */
async function openCold(bytes: Uint8Array): Promise<number> {
	resetDocumentCache()

	const src = servePdf(bytes)

	// A sized box, as a panel gives it, so the viewport measures and shows the page.
	const box = host({ width: 800, height: 1000 })

	const root = createRoot(box)

	const start = performance.now()

	let painted = Number.NaN

	const observer = new MutationObserver(() => {
		if (!Number.isNaN(painted)) return

		const image = box.querySelector<HTMLImageElement>('[data-slot="pdf-viewer-page-frame"] img')

		if (!image) return

		painted = -1

		image.decode().then(
			() => {
				painted = performance.now() - start
			},
			() => {
				painted = performance.now() - start
			},
		)
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

	// `onLoad` reports the open. The sample ends when the last page has rendered.
	await rendered(src)

	// The decode of the first page can land after the load report.
	while (painted < 0 || Number.isNaN(painted)) {
		await new Promise(requestAnimationFrame)
	}

	observer.disconnect()

	root.unmount()

	box.remove()

	URL.revokeObjectURL(src)

	return painted
}

/** Resolves when the load of `src` has rendered its last page. */
function rendered(src: string) {
	return new Promise<void>((resolve) => {
		const done = () => !getDocumentSnapshot(src).loading

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

		bench(
			`cold open · ${count} pages · settled`,
			async () => {
				const samples = firstPage.get(count) ?? []

				samples.push(await openCold(bytes))

				// The bench prints only its own timing, so the last sample prints this one. The
				// warm-up sample is left out of the mean.
				if (samples.length === OPEN_OPTIONS.warmupIterations + OPEN_OPTIONS.iterations) {
					const timed = samples.slice(OPEN_OPTIONS.warmupIterations)

					const mean = timed.reduce((sum, value) => sum + value, 0) / timed.length

					console.log(
						`cold open · ${count} pages · first page painted · mean ${mean.toFixed(1)} ms`,
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

	bench('stage · encode · webp 0.92', () => encode('image/webp', 0.92).then(() => {}), {
		time: 2_000,
	})

	bench('stage · encode · jpeg 0.92', () => encode('image/jpeg', 0.92).then(() => {}), {
		time: 2_000,
	})
})

describe('pdf viewer · page flip · 14 pages resident', async () => {
	resetDocumentCache()

	const src = servePdf(makeInvoicePdf(14))

	const box = host({ width: 800, height: 1000 })

	const root = createRoot(box)

	const view = (page: number, onLoad?: () => void) => (
		<PdfViewer src={src} page={page} fit="page" aria-label="Invoice" onLoad={onLoad} />
	)

	await new Promise<void>((resolve) => {
		flushSync(() => root.render(view(1, resolve)))
	})

	await rendered(src)

	// What the resident rasters hold. The encoded blobs stay for the life of the entry. The
	// decoded bitmaps are the browser's, and it can drop one that no element shows.
	const pages = getDocumentSnapshot(src).pages

	let bytes = 0

	for (const page of pages) bytes += (await (await fetch(page.src)).blob()).size

	console.log(
		`resident · 14 pages · ${(bytes / 1024 / 1024).toFixed(2)} MiB of PNG, ${((pages.length * (pages[0]?.width ?? 0) * (pages[0]?.height ?? 0) * 4) / 1024 / 1024).toFixed(0)} MiB if every page decodes`,
	)

	let current = 1

	// One flip, from the commit to the decoded image of the next page. The pages alternate, so
	// no sample reads an image that it already shows.
	bench(
		'flip · resident page',
		async () => {
			current = current === 1 ? 2 : 1

			flushSync(() => root.render(view(current)))

			const image = box.querySelector<HTMLImageElement>('[data-slot="pdf-viewer-page-frame"] img')

			await image?.decode()
		},
		{ time: 2_000 },
	)
})
