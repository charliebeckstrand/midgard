import { act, renderHook } from '@testing-library/react'
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
	subscribeDocument,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { usePdfViewer } from '../../components/pdf-viewer/use-pdf-viewer'
import { tick } from '../helpers/frames'
import { seedDocument } from '../helpers/pdf-document'

beforeEach(() => {
	getDocumentMock.mockReset()

	globalWorkerOptions.workerSrc = 'mock-worker'

	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
	resetDocumentCache()
})

describe('usePdfViewer · load reporting', () => {
	it('reports the page count once the document settles', async () => {
		const onLoad = vi.fn()

		const onError = vi.fn()

		await seedDocument('/invoice.pdf', 3)

		renderHook(() => usePdfViewer({ src: '/invoice.pdf', onLoad, onError }))

		expect(onLoad).toHaveBeenCalledExactlyOnceWith(3)

		expect(onError).not.toHaveBeenCalled()
	})

	// Driven through the real loader rather than from a seeded error state. A
	// resident document that failed and holds no pages is retried by the next
	// mount, by design, so seeding one and mounting asserts against a load already
	// on its way out.
	it('reports the reason when the document fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))

		const onLoad = vi.fn()

		const onError = vi.fn()

		await act(async () => {
			renderHook(() => usePdfViewer({ src: '/missing.pdf', onLoad, onError }))

			await tick()
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

		await seedDocument('/invoice.pdf')

		const { rerender } = renderHook(() => usePdfViewer({ src: '/invoice.pdf', onLoad }))

		rerender()

		rerender()

		expect(onLoad).toHaveBeenCalledOnce()
	})

	it('reports again when src moves to another document', async () => {
		const onLoad = vi.fn()

		await seedDocument('/first.pdf', 2)

		await seedDocument('/second.pdf', 5)

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

		await seedDocument('/invoice.pdf')

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

			await tick()
		})

		renderHook(() => usePdfViewer({ src: '/blank.pdf', onLoad, onError }))

		await act(async () => {
			await tick()
		})

		expect(onLoad).not.toHaveBeenCalled()

		expect(onError).toHaveBeenCalledOnce()
	})

	// The mount that saw the failure leaves, and nothing else holds the document. A
	// failure is not remembered, so the next mount starts clean: no stale error on its
	// first frame, and no report until its own retry settles.
	it('does not report a failure again to a remount', async () => {
		// The first load fails. The retry stays in flight, so the only report it could
		// make is a stale one.
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(new Response(null, { status: 404 }))
				.mockReturnValue(new Promise<Response>(() => {})),
		)

		const first = { onLoad: vi.fn(), onError: vi.fn() }

		let view: ReturnType<typeof renderHook> | undefined

		await act(async () => {
			view = renderHook(() => usePdfViewer({ src: '/flaky.pdf', ...first }))

			await tick()
		})

		expect(first.onError).toHaveBeenCalledOnce()

		view?.unmount()

		const second = { onLoad: vi.fn(), onError: vi.fn() }

		const renders: { pending: boolean; error: Error | null }[] = []

		await act(async () => {
			renderHook(() => {
				const result = usePdfViewer({ src: '/flaky.pdf', ...second })

				renders.push({ pending: result.pending, error: result.error })

				return result
			})

			await tick()
		})

		expect(renders[0]).toEqual({ pending: true, error: null })

		expect(second.onError).not.toHaveBeenCalled()

		expect(second.onLoad).not.toHaveBeenCalled()
	})

	// The document opened, and a page failed after the open. Another viewer holds it,
	// so a new mount joins it rather than retrying. The open is the load.
	it('reports a load to a mount beside a document that opened and then failed', async () => {
		let report: PdfLoadReport | undefined

		await act(async () => {
			ensureDocumentLoad('/opened.pdf', (next) => {
				report = next

				return Promise.reject(new Error('bad page'))
			})

			report?.open(
				[1, 2].map((id) => ({
					id,
					src: '',
					label: `Page ${id}`,
					width: 800,
					height: 1000,
					pointWidth: 612,
					pointHeight: 792,
				})),
			)

			await tick()
		})

		const unsubscribe = subscribeDocument('/opened.pdf', () => {})

		const onLoad = vi.fn()

		const onError = vi.fn()

		renderHook(() => usePdfViewer({ src: '/opened.pdf', onLoad, onError }))

		expect(onLoad).toHaveBeenCalledExactlyOnceWith(2)

		expect(onError).not.toHaveBeenCalled()

		unsubscribe()
	})
})

describe('usePdfViewer · download name', () => {
	/** The download goes through the blob URL, so the name must come from `src`. */
	it('names the download after the last segment of src when no filename is given', async () => {
		await seedDocument('/files/invoice-42.pdf?v=3')

		const { result } = renderHook(() => usePdfViewer({ src: '/files/invoice-42.pdf?v=3' }))

		expect(result.current.documentSrc).toBe('blob:doc')

		expect(result.current.filename).toBe('invoice-42.pdf')
	})

	it('keeps the filename of the consumer', async () => {
		await seedDocument('/files/invoice-42.pdf')

		const { result } = renderHook(() =>
			usePdfViewer({ src: '/files/invoice-42.pdf', filename: 'March invoice.pdf' }),
		)

		expect(result.current.filename).toBe('March invoice.pdf')
	})
})
