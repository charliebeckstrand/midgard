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
			<div dir={dir} style={{ width: 400, height: 500 }}>
				<PdfViewer pages={pages} thumbnails="rail" fit="width" className="h-full" />
			</div>,
		)

		const list = getSlot(container, 'pdf-viewer-thumbnails').getBoundingClientRect()

		const handle = getSlot(container, 'pdf-viewer-rail-handle').getBoundingClientRect()

		expect(handle.width).toBeGreaterThan(0)

		if (dir === 'ltr') expect(handle.left).toBeGreaterThanOrEqual(list.right)
		else expect(handle.right).toBeLessThanOrEqual(list.left)
	})

	// A press 24px wide, over the full height of the rail: the gutter and 16px past the border.
	it('takes a press on the full height of the line, 16px past the border', () => {
		const { container } = renderUI(
			<div dir={dir} style={{ width: 400, height: 500 }}>
				<PdfViewer pages={pages} thumbnails="rail" fit="width" className="h-full" />
			</div>,
		)

		const handle = getSlot(container, 'pdf-viewer-rail-handle')

		const box = handle.getBoundingClientRect()

		// The border of the rail is 1px past the end of the handle.
		const outward = dir === 'ltr' ? box.right + 15 : box.left - 15

		const inward = dir === 'ltr' ? box.left + 1 : box.right - 1

		for (const y of [box.top + 2, box.top + box.height / 2, box.bottom - 2]) {
			expect(document.elementFromPoint(outward, y)).toBe(handle)

			expect(document.elementFromPoint(inward, y)).toBe(handle)
		}

		const past = dir === 'ltr' ? box.right + 18 : box.left - 18

		expect(document.elementFromPoint(past, box.top + box.height / 2)).not.toBe(handle)
	})
})
