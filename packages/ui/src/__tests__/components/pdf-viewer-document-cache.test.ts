import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	documentCacheState,
	EMPTY_DOCUMENT_SNAPSHOT,
	ensureDocumentLoad,
	focusPage,
	getDocumentSnapshot,
	type PdfLoadReport,
	type PdfPageRaster,
	resetDocumentCache,
	subscribeDocument,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import type { PdfViewerPage } from '../../components/pdf-viewer/types'
import { deferred } from '../helpers'

/**
 * The cache's loader seam, driven by hand.
 *
 * No pdf.js and no `fetch` anywhere in this file: the cache takes its rasterizer as an
 * argument, so every case here drives a promise it owns. That is what CONVENTIONS §11.3 asks
 * for — the synchronous seam rather than a third-party async lifecycle — and it is also the
 * whole reason the loader is injected rather than imported.
 */
function loader() {
	let report: PdfLoadReport | undefined

	const settled = deferred()

	const run = vi.fn((next: PdfLoadReport) => {
		report = next

		return settled.promise
	})

	return {
		run,
		page: (id: number) => report?.page(page(id)),
		documentUrl: (url: string) => report?.documentUrl(url),
		open: (count: number) =>
			report?.open(Array.from({ length: count }, (_, index) => ({ ...page(index + 1), src: '' }))),
		place: (id: number) => report?.page(page(id), id - 1),
		retain: (release: () => void) => report?.retain(release),
		serve: (next: ReturnType<typeof renderer>) => report?.serve(next.render),
		finish: () => settled.resolve(),
	}
}

/**
 * A page renderer whose renders end by hand.
 *
 * @remarks Each render is a deferred. A cancel rejects it, as a canceled pdf.js render does.
 */
function renderer() {
	const jobs: {
		index: number
		raster: PdfPageRaster
		finish: (url: string | null) => void
		fail: (reason: unknown) => void
		cancel: ReturnType<typeof vi.fn>
	}[] = []

	const render = vi.fn((index: number, raster: PdfPageRaster) => {
		const job = deferred<string | null>()

		const cancel = vi.fn(() => job.reject(new Error('canceled')))

		jobs.push({ index, raster, finish: job.resolve, fail: job.reject, cancel })

		return { promise: job.promise, cancel }
	})

	/** The renders asked for so far, as `index:raster`. */
	const asked = () => jobs.map((job) => `${job.index}:${job.raster}`)

	/** Ends the latest render with a URL named after its page and raster. */
	const land = async () => {
		const job = jobs.at(-1)

		job?.finish(`blob:${job.raster}-${job.index}`)

		await flush()
	}

	return { render, jobs, asked, land }
}

/** Opens `src` with `count` slots and serves a hand-driven renderer. */
async function served(src: string, count: number) {
	const load = loader()

	const pages = renderer()

	ensureDocumentLoad(src, load.run)

	load.open(count)

	load.serve(pages)

	load.finish()

	await flush()

	return pages
}

/** One rasterized page, with a blob URL distinct enough to assert revocation against. */
function page(id: number): PdfViewerPage {
	return {
		id,
		src: `blob:page-${id}`,
		label: `Page ${id}`,
		width: 800,
		height: 1000,
		pointWidth: 612,
		pointHeight: 792,
	}
}

/** Lets the cache's `.then` handlers run. A macrotask, so no chain length has to be guessed at. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
	resetDocumentCache()

	vi.restoreAllMocks()
})

describe('pdf viewer document cache', () => {
	it('returns one shared snapshot identity for every miss', () => {
		// `useSyncExternalStore` compares with `Object.is` and loops forever if a miss
		// allocates, so this identity is a correctness property rather than a saving.
		expect(getDocumentSnapshot('/absent.pdf')).toBe(EMPTY_DOCUMENT_SNAPSHOT)

		expect(getDocumentSnapshot(undefined)).toBe(EMPTY_DOCUMENT_SNAPSHOT)
	})

	it('publishes each page as it rasterizes, with a fresh snapshot identity', async () => {
		const load = loader()

		const listener = vi.fn()

		subscribeDocument('/a.pdf', listener)

		ensureDocumentLoad('/a.pdf', load.run)

		expect(getDocumentSnapshot('/a.pdf').loading).toBe(true)

		const before = getDocumentSnapshot('/a.pdf')

		load.documentUrl('blob:doc-a')

		load.page(1)

		const after = getDocumentSnapshot('/a.pdf')

		expect(after.pages.map((entry) => entry.id)).toEqual([1])

		expect(after.documentUrl).toBe('blob:doc-a')

		// A mutated array would be `Object.is`-equal to the one React already rendered.
		expect(after).not.toBe(before)

		expect(after.pages).not.toBe(before.pages)

		expect(listener).toHaveBeenCalled()

		load.page(2)

		load.finish()

		await flush()

		expect(getDocumentSnapshot('/a.pdf').loading).toBe(false)

		expect(getDocumentSnapshot('/a.pdf').pages.map((entry) => entry.id)).toEqual([1, 2])
	})

	/**
	 * The fix, stated as a property: a finished document is never rasterized twice. This is what
	 * parking and reopening a panel does — the viewer unmounts and comes back on the same `src`.
	 */
	it('runs nothing for a document already rasterized', async () => {
		const first = loader()

		ensureDocumentLoad('/a.pdf', first.run)

		first.page(1)

		first.finish()

		await flush()

		const second = loader()

		ensureDocumentLoad('/a.pdf', second.run)

		expect(second.run).not.toHaveBeenCalled()

		expect(getDocumentSnapshot('/a.pdf').pages.map((entry) => entry.id)).toEqual([1])

		expect(getDocumentSnapshot('/a.pdf').loading).toBe(false)
	})

	it('joins an in-flight load rather than starting a second one', () => {
		const first = loader()

		const second = loader()

		ensureDocumentLoad('/a.pdf', first.run)

		ensureDocumentLoad('/a.pdf', second.run)

		expect(first.run).toHaveBeenCalledTimes(1)

		// A park mid-rasterization, then a maximize: the second mount finds the load already
		// running and waits on it instead of fetching the file again.
		expect(second.run).not.toHaveBeenCalled()
	})

	it('keeps the pages identity stable across reads, so a remount is not a document swap', async () => {
		const load = loader()

		ensureDocumentLoad('/a.pdf', load.run)

		load.page(1)

		load.finish()

		await flush()

		// `usePdfViewerPageRotation` keys per-page rotations on this identity and `usePdfViewer`
		// memoizes the context value against it, so a fresh copy per read would reset state that
		// the cache exists to preserve.
		expect(getDocumentSnapshot('/a.pdf').pages).toBe(getDocumentSnapshot('/a.pdf').pages)
	})

	it('reports a failure but does not remember it, so the next mount retries', async () => {
		const failing = loader()

		ensureDocumentLoad('/a.pdf', () => Promise.reject(new Error('network down')))

		await flush()

		expect(getDocumentSnapshot('/a.pdf').error?.message).toBe('network down')

		expect(getDocumentSnapshot('/a.pdf').loading).toBe(false)

		// Parking and maximizing recovers a transient failure rather than showing a cached one.
		ensureDocumentLoad('/a.pdf', failing.run)

		expect(failing.run).toHaveBeenCalledTimes(1)

		expect(getDocumentSnapshot('/a.pdf').error).toBeNull()
	})

	it("discards a failed attempt's pages instead of appending the retry to them", async () => {
		const retry = loader()

		let captured: PdfLoadReport | undefined

		ensureDocumentLoad('/a.pdf', (report) => {
			captured = report

			return Promise.reject(new Error('died mid-render'))
		})

		captured?.page(page(1))

		await flush()

		expect(getDocumentSnapshot('/a.pdf').pages).toHaveLength(1)

		ensureDocumentLoad('/a.pdf', retry.run)

		// The partial attempt's blob URL is freed rather than left for the evictor, since
		// nothing will hold it again.
		expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:page-1')

		expect(getDocumentSnapshot('/a.pdf').pages).toHaveLength(0)

		retry.page(1)

		retry.page(2)

		expect(getDocumentSnapshot('/a.pdf').pages.map((entry) => entry.id)).toEqual([1, 2])
	})
})

describe('pdf viewer document cache · a failed load with holders', () => {
	/** Leaves `/a.pdf` resident with one partial page and an error, the way a mid-render throw does. */
	async function failedPartial() {
		let captured: PdfLoadReport | undefined

		ensureDocumentLoad('/a.pdf', (report) => {
			captured = report

			return Promise.reject(new Error('died mid-render'))
		})

		captured?.page(page(1))

		await flush()
	}

	it('does not retry, or revoke the partial pages, while another viewer holds them', async () => {
		await failedPartial()

		const listener = vi.fn()

		subscribeDocument('/a.pdf', listener)

		const retry = loader()

		ensureDocumentLoad('/a.pdf', retry.run)

		// The holder renders `blob:page-1` as a live `<img>`. A revoke blanks its page.
		expect(retry.run).not.toHaveBeenCalled()

		expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:page-1')

		expect(getDocumentSnapshot('/a.pdf').pages.map((entry) => entry.id)).toEqual([1])

		expect(getDocumentSnapshot('/a.pdf').error?.message).toBe('died mid-render')

		expect(listener).not.toHaveBeenCalled()
	})

	it('retries once the last holder leaves', async () => {
		await failedPartial()

		const unsubscribe = subscribeDocument('/a.pdf', vi.fn())

		unsubscribe()

		const retry = loader()

		ensureDocumentLoad('/a.pdf', retry.run)

		expect(retry.run).toHaveBeenCalledTimes(1)

		expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:page-1')
	})
})

describe('pdf viewer document cache · bound', () => {
	/** Rasterizes `src` to one page and settles, leaving it resident and unheld. */
	async function resident(src: string) {
		const load = loader()

		ensureDocumentLoad(src, load.run)

		load.documentUrl(`blob:doc-${src}`)

		load.page(1)

		load.finish()

		await flush()
	}

	it('evicts the least recently used document past the cap, revoking its blob URLs', async () => {
		for (const src of ['/1.pdf', '/2.pdf', '/3.pdf', '/4.pdf']) await resident(src)

		expect(documentCacheState()).toHaveLength(4)

		await resident('/5.pdf')

		// The cap holds, and the oldest is the one that went.
		expect(documentCacheState().map((entry) => entry.src)).toEqual([
			'/2.pdf',
			'/3.pdf',
			'/4.pdf',
			'/5.pdf',
		])

		expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:doc-/1.pdf')
	})

	it('never evicts a document a viewer is still showing', async () => {
		await resident('/held.pdf')

		const unsubscribe = subscribeDocument('/held.pdf', vi.fn())

		for (const src of ['/1.pdf', '/2.pdf', '/3.pdf', '/4.pdf', '/5.pdf']) await resident(src)

		const held = documentCacheState().find((entry) => entry.src === '/held.pdf')

		// Revoking a held entry's URLs would blank the page a reader is looking at, so the
		// holder outranks the cap.
		expect(held).toBeDefined()

		expect(held?.holders).toBe(1)

		expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:doc-/held.pdf')

		// Losing its last viewer makes it collectable rather than collected — it is still a
		// cache, and at the cap there is nothing to reclaim. The next document over the cap is
		// what actually takes it, since by then it is the oldest unheld entry.
		unsubscribe()

		expect(documentCacheState().some((entry) => entry.src === '/held.pdf')).toBe(true)

		await resident('/6.pdf')

		expect(documentCacheState().some((entry) => entry.src === '/held.pdf')).toBe(false)

		expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:doc-/held.pdf')
	})

	it('counts holders, so one of two viewers unmounting frees nothing', async () => {
		await resident('/shared.pdf')

		const first = subscribeDocument('/shared.pdf', vi.fn())

		subscribeDocument('/shared.pdf', vi.fn())

		expect(documentCacheState().find((entry) => entry.src === '/shared.pdf')?.holders).toBe(2)

		first()

		// A drawer's scan and a row-level PDF dialog can be open on one document at once; the
		// first to unmount must not free the other's page images.
		expect(documentCacheState().some((entry) => entry.src === '/shared.pdf')).toBe(true)

		expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:doc-/shared.pdf')
	})

	it('does not evict a document mid-load', async () => {
		const pending = loader()

		ensureDocumentLoad('/pending.pdf', pending.run)

		for (const src of ['/1.pdf', '/2.pdf', '/3.pdf', '/4.pdf', '/5.pdf']) await resident(src)

		expect(documentCacheState().some((entry) => entry.src === '/pending.pdf')).toBe(true)
	})
})

describe('pdf viewer document cache · open document', () => {
	it('publishes a slot for each page at the open, and fills each slot as its page renders', () => {
		const load = loader()

		ensureDocumentLoad('/a.pdf', load.run)

		load.open(3)

		expect(getDocumentSnapshot('/a.pdf').pages.map((entry) => entry.src)).toEqual(['', '', ''])

		load.place(3)

		load.place(1)

		expect(getDocumentSnapshot('/a.pdf').pages.map((entry) => entry.src)).toEqual([
			'blob:page-1',
			'',
			'blob:page-3',
		])
	})

	it('revokes no URL for a slot that never rendered', async () => {
		const load = loader()

		ensureDocumentLoad('/a.pdf', load.run)

		load.open(2)

		load.place(1)

		load.finish()

		await flush()

		resetDocumentCache()

		expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:page-1')

		expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalledWith('')
	})

	it('frees the kept document when its entry leaves the cache, and not before', async () => {
		const release = vi.fn()

		const load = loader()

		ensureDocumentLoad('/kept.pdf', load.run)

		load.open(1)

		load.place(1)

		load.retain(release)

		load.finish()

		await flush()

		for (const src of ['/1.pdf', '/2.pdf', '/3.pdf']) {
			const next = loader()

			ensureDocumentLoad(src, next.run)

			next.page(1)

			next.finish()

			await flush()
		}

		expect(release).not.toHaveBeenCalled()

		const last = loader()

		ensureDocumentLoad('/4.pdf', last.run)

		last.page(1)

		last.finish()

		await flush()

		expect(release).toHaveBeenCalledOnce()
	})

	it('frees the kept document when the cache resets', async () => {
		const release = vi.fn()

		const load = loader()

		ensureDocumentLoad('/a.pdf', load.run)

		load.retain(release)

		load.finish()

		await flush()

		resetDocumentCache()

		resetDocumentCache()

		expect(release).toHaveBeenCalledOnce()
	})

	// A reset while the load runs takes the entry away. Nothing would free a document
	// that the load then keeps, so the retain frees it at once.
	it('frees a document at once when its entry left the cache during the load', () => {
		const release = vi.fn()

		const load = loader()

		ensureDocumentLoad('/a.pdf', load.run)

		resetDocumentCache()

		load.retain(release)

		expect(release).toHaveBeenCalledOnce()
	})
})

describe('pdf viewer document cache · render queue', () => {
	it('renders nothing while no viewer shows the document', async () => {
		const pages = await served('/a.pdf', 5)

		expect(pages.render).not.toHaveBeenCalled()
	})

	it('renders the shown page first, then its neighbors, then the thumbnails in order', async () => {
		const pages = await served('/a.pdf', 5)

		focusPage('/a.pdf', {}, 2)

		for (let step = 0; step < 8; step++) await pages.land()

		expect(pages.asked()).toEqual([
			'2:full',
			'3:full',
			'1:full',
			'0:thumbnail',
			'1:thumbnail',
			'2:thumbnail',
			'3:thumbnail',
			'4:thumbnail',
		])

		expect(getDocumentSnapshot('/a.pdf').pages.map((page) => page.src)).toEqual([
			'',
			'blob:full-1',
			'blob:full-2',
			'blob:full-3',
			'',
		])

		expect(documentCacheState()[0]).toMatchObject({ rasters: 3, thumbnails: 5, rendering: false })
	})

	it('cancels a render that nobody wants after a move, and renders the new page next', async () => {
		const pages = await served('/a.pdf', 20)

		const viewer = {}

		focusPage('/a.pdf', viewer, 0)

		expect(pages.asked()).toEqual(['0:full'])

		focusPage('/a.pdf', viewer, 10)

		expect(pages.jobs[0]?.cancel).toHaveBeenCalledOnce()

		await flush()

		expect(pages.asked()).toEqual(['0:full', '10:full'])

		expect(getDocumentSnapshot('/a.pdf').error).toBeNull()
	})

	it('keeps a render that a move leaves wanted', async () => {
		const pages = await served('/a.pdf', 5)

		const viewer = {}

		focusPage('/a.pdf', viewer, 0)

		focusPage('/a.pdf', viewer, 1)

		expect(pages.jobs[0]?.cancel).not.toHaveBeenCalled()
	})

	it('serves the pages of each viewer on one document', async () => {
		const pages = await served('/a.pdf', 20)

		focusPage('/a.pdf', {}, 0)

		focusPage('/a.pdf', {}, 10)

		await pages.land()

		// The viewer that moved last comes first. The first render still holds, because the
		// other viewer wants it.
		expect(pages.jobs[0]?.cancel).not.toHaveBeenCalled()

		expect(pages.asked().slice(0, 2)).toEqual(['0:full', '10:full'])
	})

	it('bounds the full rasters, and keeps the pages that a viewer wants', async () => {
		const pages = await served('/a.pdf', 30)

		const viewer = {}

		// Each move renders the page and its two neighbors: 9 pages over three moves. The
		// fourth render of each move is the thumbnail that the queue starts when it idles.
		for (const index of [1, 11, 21]) {
			focusPage('/a.pdf', viewer, index)

			for (let step = 0; step < 4; step++) await pages.land()
		}

		const resident = getDocumentSnapshot('/a.pdf')
			.pages.map((page, index) => (page.src ? index : -1))
			.filter((index) => index >= 0)

		expect(resident).toHaveLength(8)

		expect(resident).toEqual(expect.arrayContaining([20, 21, 22]))

		// The first rendered page left the set, and its URL was freed.
		expect(resident).not.toContain(1)

		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:full-1')
	})

	it('renders a dropped page again when a viewer comes back to it', async () => {
		const pages = await served('/a.pdf', 30)

		const viewer = {}

		for (const index of [1, 11, 21]) {
			focusPage('/a.pdf', viewer, index)

			for (let step = 0; step < 4; step++) await pages.land()
		}

		focusPage('/a.pdf', viewer, 1)

		// The thumbnail in flight ends first. A move cancels only a full render.
		await pages.land()

		expect(pages.asked().at(-1)).toBe('1:full')
	})

	it('does not ask again for a page that could not render', async () => {
		const pages = await served('/a.pdf', 1)

		focusPage('/a.pdf', {}, 0)

		pages.jobs[0]?.finish(null)

		await flush()

		await pages.land()

		expect(pages.asked()).toEqual(['0:full', '0:thumbnail'])

		expect(documentCacheState()[0]?.rendering).toBe(false)
	})

	it('reports a render that fails as a failure of the document, and stops', async () => {
		const pages = await served('/a.pdf', 5)

		focusPage('/a.pdf', {}, 0)

		pages.jobs[0]?.fail(new Error('bad page'))

		await flush()

		expect(getDocumentSnapshot('/a.pdf').error?.message).toBe('bad page')

		expect(pages.asked()).toEqual(['0:full'])
	})

	it('stops starting renders when the last viewer leaves', async () => {
		const pages = await served('/a.pdf', 5)

		const leave = focusPage('/a.pdf', {}, 0)

		leave()

		await pages.land()

		expect(pages.asked()).toEqual(['0:full'])
	})

	it('cancels the render in flight when the entry leaves', async () => {
		const pages = await served('/a.pdf', 5)

		focusPage('/a.pdf', {}, 0)

		resetDocumentCache()

		expect(pages.jobs[0]?.cancel).toHaveBeenCalledOnce()
	})

	// A render in its encode ignores the cancel and still gives a URL, which has no owner now.
	it('frees a URL that lands after its entry left', async () => {
		const pages = await served('/a.pdf', 5)

		focusPage('/a.pdf', {}, 0)

		pages.jobs[0]?.cancel.mockImplementation(() => {})

		resetDocumentCache()

		await pages.land()

		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:full-0')
	})
})
