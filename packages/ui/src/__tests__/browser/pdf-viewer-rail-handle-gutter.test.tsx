import { describe, expect, it } from 'vitest'
import { PdfViewer, type PdfViewerPage } from '../../components/pdf-viewer'
import { getSlot, renderUI } from '../helpers'

const pages: PdfViewerPage[] = Array.from({ length: 12 }, (_, index) => ({
	id: String(index),
	src: '',
	label: `Page ${index + 1}`,
	width: 612,
	height: 792,
}))

/**
 * The resize handle lies on the end edge of the rail, and the scrollbar of the thumbnail list
 * lies on the end edge of the list. A classic scrollbar is about 15px wide. A handle over it
 * takes the press of the scrollbar and resizes the rail, and the list does not scroll. So the
 * rail keeps a gutter for the handle, and the handle covers no part of the list.
 */
describe.each(['ltr', 'rtl'] as const)('pdf viewer rail handle, %s (real browser)', (dir) => {
	it('keeps the handle off the thumbnail list and its scrollbar', () => {
		const { container } = renderUI(
			<div dir={dir} style={{ width: 1200, height: 600 }}>
				<PdfViewer pages={pages} thumbnails="rail" fit="width" className="h-full" />
			</div>,
		)

		const list = getSlot(container, 'pdf-viewer-thumbnails').getBoundingClientRect()

		const handle = getSlot(container, 'pdf-viewer-rail-handle').getBoundingClientRect()

		expect(handle.width).toBeGreaterThan(0)

		if (dir === 'ltr') expect(handle.left).toBeGreaterThanOrEqual(list.right)
		else expect(handle.right).toBeLessThanOrEqual(list.left)
	})
})
