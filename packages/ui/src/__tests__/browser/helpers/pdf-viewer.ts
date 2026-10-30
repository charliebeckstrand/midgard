import { expect, onTestFinished, vi } from 'vitest'
import { servePdf } from '../../../__benchmarks__/browser/pdf-fixtures'
import { resetDocumentCache } from '../../../components/pdf-viewer/pdf-viewer-document-cache'
import { bySlot, waitFor } from '../../helpers'
import { budget } from './wall-clock'

/**
 * Serves `bytes` as a PDF for the current test.
 *
 * @remarks
 * The blob URL and the document cache are shared state. When the test finishes, the helper
 * revokes the URL and empties the cache. The cleanup runs in `onTestFinished`, so it also runs
 * after a case that fails or times out.
 *
 * @param bytes - The bytes of the PDF.
 * @returns The blob URL, for the `src` of a viewer.
 */
export function servePdfFor(bytes: Uint8Array): string {
	const src = servePdf(bytes)

	onTestFinished(() => {
		URL.revokeObjectURL(src)

		resetDocumentCache()
	})

	return src
}

/**
 * Waits for the raster of the first page in the viewport of a viewer.
 *
 * @remarks
 * The viewport must show no error. The wait has a budget of 10 seconds, because pdf.js loads
 * its worker and its fonts on the first render.
 *
 * @param container - The element that holds the viewer.
 * @param ready - More checks on the raster. The wait runs them again until they pass.
 * @returns The raster of the page.
 */
export const pageImage = vi.defineHelper(
	(container: HTMLElement, ready?: (image: HTMLElement) => void): Promise<HTMLElement> =>
		waitFor(
			() => {
				const viewport = bySlot(container, 'pdf-viewer-viewport')

				expect(viewport?.querySelector('[role="alert"]')).toBeNull()

				const image = viewport?.querySelector<HTMLElement>('[data-slot="pdf-viewer-page-image"]')

				expect(image).not.toBeNull()

				ready?.(image as HTMLElement)

				return image as HTMLElement
			},
			{ timeout: budget(10_000) },
		),
)
