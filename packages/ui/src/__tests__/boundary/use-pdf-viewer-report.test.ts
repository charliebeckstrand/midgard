import { act, renderHook } from '@testing-library/react'
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
import { usePdfViewer } from '../../components/pdf-viewer/use-pdf-viewer'

beforeEach(() => {
	getDocumentMock.mockReset()

	globalWorkerOptions.workerSrc = 'mock-worker'

	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
	resetDocumentCache()

	vi.restoreAllMocks()

	globalThis.fetch = originalFetch
})

/**
 * Leaves `src` resident with `pageCount` finished pages, the way a completed load does.
 *
 * Seeded through the cache's own loader seam rather than by driving pdf.js, which
 * CONVENTIONS §11.3 rules out, and which the report does not need: the hook reads the
 * committed snapshot either way.
 */
async function seed(src: string, pageCount = 1) {
	let report: PdfLoadReport | undefined

	ensureDocumentLoad(src, (next) => {
		report = next

		return Promise.resolve()
	})

	report?.documentUrl('blob:doc')

	for (let i = 1; i <= pageCount; i++) {
		report?.page({
			id: i,
			src: `blob:page-${i}`,
			label: `Page ${i}`,
			width: 800,
			height: 1000,
			pointWidth: 612,
			pointHeight: 792,
		})
	}

	await new Promise((resolve) => setTimeout(resolve, 0))
}

const originalFetch = globalThis.fetch

describe('usePdfViewer · load reporting', () => {
	it('reports the page count once the document settles', async () => {
		const onLoad = vi.fn()

		const onError = vi.fn()

		await seed('/invoice.pdf', 3)

		renderHook(() => usePdfViewer({ src: '/invoice.pdf', onLoad, onError }))

		expect(onLoad).toHaveBeenCalledExactlyOnceWith(3)

		expect(onError).not.toHaveBeenCalled()
	})

	// Driven through the real loader rather than from a seeded error state. A
	// resident document that failed and holds no pages is retried by the next
	// mount, by design, so seeding one and mounting asserts against a load already
	// on its way out.
	it('reports the reason when the document fails', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))

		const onLoad = vi.fn()

		const onError = vi.fn()

		await act(async () => {
			renderHook(() => usePdfViewer({ src: '/missing.pdf', onLoad, onError }))

			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(onError).toHaveBeenCalledOnce()

		expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error)

		expect(String(onError.mock.calls[0]?.[0])).toContain('404')

		expect(onLoad).not.toHaveBeenCalled()
	})

	// The snapshot is stable per `src`, so a re-render must not re-report what the
	// consumer already heard.
	it('reports once across re-renders of the same document', async () => {
		const onLoad = vi.fn()

		await seed('/invoice.pdf')

		const { rerender } = renderHook(() => usePdfViewer({ src: '/invoice.pdf', onLoad }))

		rerender()

		rerender()

		expect(onLoad).toHaveBeenCalledOnce()
	})

	it('reports again when src moves to another document', async () => {
		const onLoad = vi.fn()

		await seed('/first.pdf', 2)

		await seed('/second.pdf', 5)

		const { rerender } = renderHook(({ src }: { src: string }) => usePdfViewer({ src, onLoad }), {
			initialProps: { src: '/first.pdf' },
		})

		expect(onLoad).toHaveBeenCalledExactlyOnceWith(2)

		rerender({ src: '/second.pdf' })

		expect(onLoad).toHaveBeenLastCalledWith(5)

		expect(onLoad).toHaveBeenCalledTimes(2)
	})

	// A viewer handed its pages runs no load at all, so it has no settle to report.
	it('says nothing when the caller supplies the pages', async () => {
		const onLoad = vi.fn()

		const onError = vi.fn()

		await seed('/invoice.pdf')

		renderHook(() =>
			usePdfViewer({
				src: '/invoice.pdf',
				pages: [
					{
						id: 1,
						src: 'blob:given',
						label: 'Page 1',
						width: 800,
						height: 1000,
						pointWidth: 612,
						pointHeight: 792,
					},
				],
				onLoad,
				onError,
			}),
		)

		expect(onLoad).not.toHaveBeenCalled()

		expect(onError).not.toHaveBeenCalled()
	})

	// Every page skipped for want of a 2D context or a refused toBlob resolves the
	// load with no pages and no error. The viewer paints an empty document, so it
	// has not loaded one: exactly one of the two callbacks owes an answer.
	it('reports a load that rasterized no pages as a failure', async () => {
		const onLoad = vi.fn()

		const onError = vi.fn()

		await act(async () => {
			ensureDocumentLoad('/blank.pdf', () => Promise.resolve())

			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		renderHook(() => usePdfViewer({ src: '/blank.pdf', onLoad, onError }))

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(onLoad).not.toHaveBeenCalled()

		expect(onError).toHaveBeenCalledOnce()
	})
})
