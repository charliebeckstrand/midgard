import { describe, expect, it, vi } from 'vitest'
import { PdfViewerThumbnailList } from '../../components/pdf-viewer/pdf-viewer-thumbnail-list'
import { getSlot, renderUI, waitFor } from '../helpers'

const items = Array.from({ length: 30 }, (_, index) => ({
	key: index,
	pageNumber: index + 1,
	label: `Page ${index + 1}`,
	thumbnail: '',
}))

/**
 * The rail reports the tiles in view, or within 200px of it.
 *
 * The rail scrolls, and it clips each tile that it holds. The margin must therefore grow the
 * rail, not the viewport. Without the rail as the root of the observer, a tile 100px below the
 * fold of the rail counts as out of view, and its thumbnail does not render before the reader
 * scrolls to it.
 */
describe('pdf viewer thumbnail rail (real browser)', () => {
	it('reports a tile within 200px below the fold of the rail', async () => {
		const onVisibleChange = vi.fn()

		const { container } = renderUI(
			<div style={{ display: 'flex', flexDirection: 'column', height: 300 }}>
				<PdfViewerThumbnailList
					items={items}
					loading={false}
					safePage={1}
					goToPage={() => {}}
					scrollCurrentIntoView={null}
					onVisibleChange={onVisibleChange}
				/>
			</div>,
		)

		const rail = getSlot(container, 'pdf-viewer-thumbnails')

		const fold = rail.getBoundingClientRect().bottom

		const tiles = [...rail.querySelectorAll<HTMLElement>('[data-index]')]

		const near = tiles.find((tile) => tile.getBoundingClientRect().top > fold)

		const far = tiles.find((tile) => tile.getBoundingClientRect().top > fold + 200)

		expect(near).toBeDefined()

		expect(far).toBeDefined()

		await waitFor(() => {
			expect(onVisibleChange).toHaveBeenCalled()

			const visible: number[] = onVisibleChange.mock.lastCall?.[0] ?? []

			expect(visible).toContain(Number(near?.dataset.index))

			expect(visible).not.toContain(Number(far?.dataset.index))
		})
	})
})
