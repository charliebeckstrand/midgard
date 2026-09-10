import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getDocumentMock = vi.fn()

// Shape only; `beforeEach` sets workerSrc, which is what resolveWorker() reads first.
const globalWorkerOptions = { workerSrc: '' }

vi.mock('pdfjs-dist', () => ({
	GlobalWorkerOptions: globalWorkerOptions,
	getDocument: (...args: unknown[]) => getDocumentMock(...args),
}))

import {
	ensureDocumentLoad,
	type PdfLoadReport,
	resetDocumentCache,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { usePdfViewerDocument } from '../../components/pdf-viewer/use-pdf-viewer-document'

const originalFetch = globalThis.fetch

const originalCreateObjectURL = globalThis.URL.createObjectURL

const originalRevokeObjectURL = globalThis.URL.revokeObjectURL

beforeEach(() => {
	getDocumentMock.mockReset()

	// Pre-sets workerSrc, so resolveWorker() defers to it and constructs nothing — jsdom has
	// no Worker, and pdf.js pre-sets workerSrc itself under Node, which is what these
	// tests run on.
	globalWorkerOptions.workerSrc = 'mock-worker'

	globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')

	globalThis.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
	// Module state outlives a `renderHook`, so without this one case's resident document is
	// the next one's surprise cache hit.
	resetDocumentCache()

	vi.restoreAllMocks()

	globalThis.fetch = originalFetch

	globalThis.URL.createObjectURL = originalCreateObjectURL

	globalThis.URL.revokeObjectURL = originalRevokeObjectURL
})

// The async paths (fetch-error, fetch-throw, successful pdfjs render) are omitted
// pending a rewrite that doesn't depend on the real async lifecycle.
// Synchronous paths below remain covered.

describe('usePdfViewerDocument', () => {
	it('returns the empty initial state when no src is provided', () => {
		const { result } = renderHook(() => usePdfViewerDocument(undefined))

		expect(result.current.pages).toEqual([])

		expect(result.current.documentUrl).toBeNull()

		expect(result.current.loading).toBe(false)

		expect(result.current.error).toBeNull()
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
 * What parking the AP review drawer does to the viewer, and what it must now cost.
 *
 * `DetailsDrawer` parks by *closing* the drawer, `Overlay` gates its portal on `open`, and so
 * the panel's children unmount — the viewer with them. These cases stand in for that: a mount,
 * an unmount, and a mount again on the same `src`.
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

		await new Promise((resolve) => setTimeout(resolve, 0))
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

		expect(fetchMock).not.toHaveBeenCalled()
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
