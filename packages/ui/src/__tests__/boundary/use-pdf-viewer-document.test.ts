import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getDocumentMock = vi.fn()

// Shape only; `beforeEach` sets workerSrc, which is what resolveWorker() reads first.
const globalWorkerOptions = { workerSrc: '' }

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
	GlobalWorkerOptions: globalWorkerOptions,
	getDocument: (...args: unknown[]) => getDocumentMock(...args),
}))

import {
	ensureDocumentLoad,
	type PdfLoadReport,
	resetDocumentCache,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { usePdfViewerDocument } from '../../components/pdf-viewer/use-pdf-viewer-document'
import { tick } from '../helpers/frames'

const originalFetch = globalThis.fetch

beforeEach(() => {
	getDocumentMock.mockReset()

	// Pre-sets workerSrc, so resolveWorker() defers to it and constructs nothing — jsdom has
	// no Worker, and pdf.js pre-sets workerSrc itself under Node, which is what these
	// tests run on.
	globalWorkerOptions.workerSrc = 'mock-worker'

	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
	// Module state outlives a `renderHook`, so without this one case's resident document is
	// the next one's surprise cache hit.
	resetDocumentCache()

	vi.restoreAllMocks()

	globalThis.fetch = originalFetch

	for (const link of document.head.querySelectorAll('link[rel="preload"]')) link.remove()
})

// The fetch-error, fetch-throw and render paths are omitted pending a rewrite that doesn't
// depend on the real async lifecycle. The open is covered below, against a pdf.js stand-in.

describe('usePdfViewerDocument', () => {
	it('returns the empty initial state, with no pending load, when no src is provided', () => {
		const { result } = renderHook(() => usePdfViewerDocument(undefined))

		expect(result.current.pages).toEqual([])

		expect(result.current.documentUrl).toBeNull()

		expect(result.current.loading).toBe(false)

		expect(result.current.error).toBeNull()

		expect(result.current.pending).toBe(false)
	})

	/*
	 * The load starts in an effect, so the first render of a cold `src` reads the empty snapshot.
	 * That render must not read as a settled document with no pages.
	 */
	it('reports a cold src as pending on its first render', () => {
		// Never settles, so the effect's load stays in flight and drives no pdf.js work.
		globalThis.fetch = vi.fn(() => new Promise<Response>(() => {}))

		const renders: ReturnType<typeof usePdfViewerDocument>[] = []

		renderHook(() => {
			const state = usePdfViewerDocument('/cold.pdf')

			renders.push(state)

			return state
		})

		expect(renders[0]?.pending).toBe(true)

		expect(renders[0]?.loading).toBe(false)
	})

	it('resets to the empty state when src is removed after a value', () => {
		globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))

		const { result, rerender } = renderHook(
			({ src }: { src: string | undefined }) => usePdfViewerDocument(src),
			{ initialProps: { src: '/a.pdf' as string | undefined } },
		)

		rerender({ src: undefined })

		expect(result.current.pages).toEqual([])

		expect(result.current.documentUrl).toBeNull()

		expect(result.current.loading).toBe(false)
	})
})

/**
 * What parking a panel does to the viewer, and what it must now cost.
 *
 * A panel that parks by *closing* — `Overlay` gates its portal on `open` — unmounts its
 * children, the viewer with them. These cases stand in for that: a mount, an unmount, and a
 * mount again on the same `src`.
 *
 * The document is seeded through the cache's own loader seam rather than by letting the hook
 * rasterize one, because CONVENTIONS §11.3 rules out driving pdf.js in a test — and because it
 * is unnecessary here. A cache hit never enters the pdf.js path at all, so the path under test
 * is reachable without it, which is the whole property being asserted.
 */
describe('usePdfViewerDocument · parked and restored', () => {
	/**
	 * Leaves `src` resident with one finished page, the way a completed load does.
	 *
	 * Awaited to completion before anything mounts: the cache clears its loading flag in a
	 * `then`, so a seed that did not settle would leave the document mid-load and every case
	 * below would be asserting against the wrong state.
	 */
	async function seed(src: string) {
		let report: PdfLoadReport | undefined

		ensureDocumentLoad(src, (next) => {
			report = next

			return Promise.resolve()
		})

		report?.documentUrl('blob:doc')

		report?.page({
			id: 1,
			src: 'blob:page-1',
			label: 'Page 1',
			width: 800,
			height: 1000,
			pointWidth: 612,
			pointHeight: 792,
		})

		await tick()
	}

	it('paints a resident document on its first render, fetching nothing', async () => {
		const fetchMock = vi.fn()

		globalThis.fetch = fetchMock

		await seed('/invoice.pdf')

		const { result } = renderHook(() => usePdfViewerDocument('/invoice.pdf'))

		// On the *first* render, not after an effect: an effect-based read would paint one
		// frame of the loading skeleton, which is the rebuild a reviewer was watching.
		expect(result.current.pages.map((page) => page.src)).toEqual(['blob:page-1'])

		expect(result.current.documentUrl).toBe('blob:doc')

		expect(result.current.loading).toBe(false)

		expect(result.current.pending).toBe(false)

		expect(fetchMock).not.toHaveBeenCalled()
	})

	/*
	 * A load that rasterized no page settles with the same shape as the empty snapshot. Only the
	 * identity tells them apart. A `pending` test on the shape shows the skeleton for ever here.
	 */
	it('reports a settled load with no pages as not pending', async ({ signal }) => {
		ensureDocumentLoad('/blank.pdf', () => Promise.resolve())

		await tick()

		signal.throwIfAborted()

		// The mount retries a zero-page document. A fetch that never settles holds that retry.
		globalThis.fetch = vi.fn(() => new Promise<Response>(() => {}))

		const renders: ReturnType<typeof usePdfViewerDocument>[] = []

		renderHook(() => {
			const state = usePdfViewerDocument('/blank.pdf')

			renders.push(state)

			return state
		})

		expect(renders[0]?.pages).toEqual([])

		expect(renders[0]?.pending).toBe(false)
	})

	it('survives an unmount and remount without re-fetching or re-rasterizing', async () => {
		const fetchMock = vi.fn()

		globalThis.fetch = fetchMock

		await seed('/invoice.pdf')

		const first = renderHook(() => usePdfViewerDocument('/invoice.pdf'))

		expect(first.result.current.pages).toHaveLength(1)

		// The park.
		first.unmount()

		// The maximize.
		const second = renderHook(() => usePdfViewerDocument('/invoice.pdf'))

		expect(second.result.current.pages.map((page) => page.src)).toEqual(['blob:page-1'])

		expect(second.result.current.loading).toBe(false)

		expect(fetchMock).not.toHaveBeenCalled()

		// The pages a park did not throw away are the same objects, so per-page rotation and
		// the context memo both hold across the round trip.
		expect(second.result.current.pages).toBe(first.result.current.pages)
	})

	it('does not revoke the page images an unmount leaves behind', async () => {
		globalThis.fetch = vi.fn()

		await seed('/invoice.pdf')

		const { unmount } = renderHook(() => usePdfViewerDocument('/invoice.pdf'))

		unmount()

		// The cleanup used to revoke every blob URL it had created, which is what made the
		// maximize rebuild the scan. Eviction is the only thing that frees them now.
		expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:page-1')
	})
})

/**
 * A pdf.js document stand-in with `numPages` pages of 612 by 792 points and the given labels.
 *
 * Only the members that the open reads: the pages, their sizes, and the labels.
 */
function fakeDocument(numPages: number, labels: string[] | null) {
	const page = {
		getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 792 * scale }),
	}

	const doc = {
		numPages,
		getPage: () => Promise.resolve(page),
		getPageLabels: () => Promise.resolve(labels),
		loadingTask: { destroy: () => Promise.resolve() },
	}

	return { promise: Promise.resolve(doc) }
}

/**
 * Mounts the hook on `src`, and gives the page labels once the document opens with `count` pages.
 *
 * Waits for the open itself, not for a fixed number of ticks: the load passes a dynamic import,
 * a fetch and the pdf.js promises before it publishes the slots.
 */
async function openLabels(src: string, count: number) {
	globalThis.fetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([37, 80, 68, 70])))

	const { result } = renderHook(() => usePdfViewerDocument(src))

	await waitFor(() => expect(result.current.pages).toHaveLength(count))

	return result.current.pages.map((page) => page.label)
}

describe('usePdfViewerDocument · page labels', () => {
	it("labels each page with the document's own page label", async () => {
		getDocumentMock.mockReturnValue(fakeDocument(3, ['iv', 'v', 'A-1']))

		expect(await openLabels('/labelled.pdf', 3)).toEqual(['Page iv', 'Page v', 'Page A-1'])
	})

	it('labels each page with its number when the document has no page labels', async () => {
		getDocumentMock.mockReturnValue(fakeDocument(2, null))

		expect(await openLabels('/plain.pdf', 2)).toEqual(['Page 1', 'Page 2'])
	})

	// A label range with no style and no prefix gives an empty label (ISO 32000-1, 12.4.2).
	it('labels a page with its number when its page label is empty', async () => {
		getDocumentMock.mockReturnValue(fakeDocument(2, ['', 'ii']))

		expect(await openLabels('/partly-labelled.pdf', 2)).toEqual(['Page 1', 'Page ii'])
	})
})

/*
 * The hook fetches the document with `fetch(src)`: CORS mode, with credentials only on the same
 * origin. A preload matches that request only with `crossorigin="anonymous"`. Without it, the
 * browser fetches the document twice.
 */
describe('usePdfViewerDocument · preload', () => {
	it('preloads a cold src in the server render', () => {
		function Viewer() {
			usePdfViewerDocument('/cold.pdf')

			return null
		}

		const html = renderToString(createElement(Viewer))

		expect(html).toContain('rel="preload"')

		expect(html).toContain('href="/cold.pdf"')

		expect(html).toContain('as="fetch"')

		// React writes `anonymous` as the empty value, which the HTML standard reads as `anonymous`.
		expect(html).toContain('crossorigin=""')
	})

	// React preloads an href once for each document, so this src is used by no other case.
	it('preloads a cold src on its first client render', () => {
		globalThis.fetch = vi.fn(() => new Promise<Response>(() => {}))

		renderHook(() => usePdfViewerDocument('/first-render.pdf'))

		const link = document.head.querySelector('link[rel="preload"][href="/first-render.pdf"]')

		expect(link).toHaveAttribute('as', 'fetch')

		expect(link).toHaveAttribute('crossorigin', '')
	})

	it('does not preload a resident document', async ({ signal }) => {
		ensureDocumentLoad('/resident.pdf', () => Promise.resolve())

		await tick()

		signal.throwIfAborted()

		globalThis.fetch = vi.fn(() => new Promise<Response>(() => {}))

		renderHook(() => usePdfViewerDocument('/resident.pdf'))

		expect(document.head.querySelector('link[href="/resident.pdf"]')).toBeNull()
	})
})
