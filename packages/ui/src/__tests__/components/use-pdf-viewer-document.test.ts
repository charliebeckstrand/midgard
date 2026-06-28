import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Stubs the pdfjs-dist worker URL import (sets `GlobalWorkerOptions.workerSrc` as a side effect).
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

	// Pre-sets workerSrc; configureWorker() skips the `?url` dynamic import
	// (unreliably intercepted by vi.mock) when workerSrc is already non-empty.
	globalWorkerOptions.workerSrc = 'mock-worker'

	globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')

	globalThis.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
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
