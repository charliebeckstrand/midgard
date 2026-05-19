import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Stub the pdfjs-dist worker URL import — the production code calls this for
// its side effect of setting `GlobalWorkerOptions.workerSrc`.
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }))

const getDocumentMock = vi.fn()

const globalWorkerOptions = { workerSrc: '' }

vi.mock('pdfjs-dist', () => ({
	GlobalWorkerOptions: globalWorkerOptions,
	getDocument: (...args: unknown[]) => getDocumentMock(...args),
}))

import { usePdfViewerDocument } from '../../components/pdf-viewer/use-pdf-viewer-document'

const originalFetch = globalThis.fetch
const originalCreateObjectURL = globalThis.URL.createObjectURL
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL

beforeEach(() => {
	getDocumentMock.mockReset()

	globalWorkerOptions.workerSrc = ''

	globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')

	globalThis.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
	globalThis.fetch = originalFetch

	globalThis.URL.createObjectURL = originalCreateObjectURL

	globalThis.URL.revokeObjectURL = originalRevokeObjectURL
})

describe('usePdfViewerDocument', () => {
	it('returns the empty initial state when no src is provided', () => {
		const { result } = renderHook(() => usePdfViewerDocument(undefined))

		expect(result.current.pages).toEqual([])

		expect(result.current.documentUrl).toBeNull()

		expect(result.current.isLoading).toBe(false)

		expect(result.current.error).toBeNull()
	})

	it('resets to the empty state when src is removed after a value', () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
		} as unknown as Response)

		const { result, rerender } = renderHook(
			({ src }: { src: string | undefined }) => usePdfViewerDocument(src),
			{ initialProps: { src: '/a.pdf' as string | undefined } },
		)

		rerender({ src: undefined })

		expect(result.current.pages).toEqual([])

		expect(result.current.documentUrl).toBeNull()

		expect(result.current.isLoading).toBe(false)
	})

	it('sets an error when the fetch response is not ok', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
		} as unknown as Response)

		const { result } = renderHook(() => usePdfViewerDocument('/missing.pdf'))

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(Error)
		})

		expect(result.current.error?.message).toContain('404')

		expect(result.current.isLoading).toBe(false)
	})

	it('sets an error when the fetch throws', async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))

		const { result } = renderHook(() => usePdfViewerDocument('/x.pdf'))

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(Error)
		})

		expect(result.current.error?.message).toBe('network')
	})

	it('builds a documentUrl + pages from a successful pdfjs render', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
		} as unknown as Response)

		const renderPromise = Promise.resolve()

		const page = {
			getViewport: () => ({ width: 100, height: 200 }),
			render: () => ({ promise: renderPromise }),
		}

		const doc = {
			numPages: 1,
			getPage: vi.fn().mockResolvedValue(page),
			destroy: vi.fn(),
		}

		getDocumentMock.mockReturnValue({ promise: Promise.resolve(doc) })

		// Stub HTMLCanvasElement so render() can run.
		HTMLCanvasElement.prototype.getContext = vi.fn(
			() => ({ drawImage: vi.fn() }) as unknown as CanvasRenderingContext2D,
		) as unknown as HTMLCanvasElement['getContext']

		HTMLCanvasElement.prototype.toBlob = ((cb: (b: Blob | null) => void) =>
			cb(new Blob([], { type: 'image/png' }))) as unknown as HTMLCanvasElement['toBlob']

		const { result } = renderHook(() => usePdfViewerDocument('/doc.pdf'))

		await waitFor(() => {
			expect(result.current.pages.length).toBe(1)
		})

		expect(result.current.documentUrl).toBe('blob:mock')

		expect(result.current.isLoading).toBe(false)
	})
})
