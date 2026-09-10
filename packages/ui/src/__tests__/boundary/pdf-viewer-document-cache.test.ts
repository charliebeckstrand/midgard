import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	documentCacheState,
	EMPTY_DOCUMENT_SNAPSHOT,
	ensureDocumentLoad,
	getDocumentSnapshot,
	type PdfLoadReport,
	resetDocumentCache,
	subscribeDocument,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import type { PdfViewerPage } from '../../components/pdf-viewer/types'

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

	let settle: (() => void) | undefined

	const run = vi.fn((next: PdfLoadReport) => {
		report = next

		return new Promise<void>((resolve) => {
			settle = resolve
		})
	})

	return {
		run,
		page: (id: number) => report?.page(page(id)),
		documentUrl: (url: string) => report?.documentUrl(url),
		finish: () => settle?.(),
	}
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

const originalCreateObjectURL = globalThis.URL.createObjectURL

const originalRevokeObjectURL = globalThis.URL.revokeObjectURL

beforeEach(() => {
	globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')

	globalThis.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
	resetDocumentCache()

	vi.restoreAllMocks()

	globalThis.URL.createObjectURL = originalCreateObjectURL

	globalThis.URL.revokeObjectURL = originalRevokeObjectURL
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
	 * a park and a maximize does to the AP review drawer — the viewer unmounts and comes back on
	 * the same `src`.
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

		// The review drawer's scan and the row-level PDF dialog can be open on one invoice at
		// once; the first to unmount must not free the other's page images.
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
