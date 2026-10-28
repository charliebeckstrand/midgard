import { describe, expect, it } from 'vitest'
import { PdfViewerThumbnailList } from '../../components/pdf-viewer/pdf-viewer-thumbnail-list'
import { getAllSlots, present, renderUI, waitFor } from '../helpers'

// A white 1x1 PNG.
const PNG =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+hc2rNAAAAABJRU5ErkJggg=='

// US Letter, the ratio of the pages of the docs.
const LETTER = 816 / 1056

const items = [1, 2].map((pageNumber) => ({
	key: pageNumber,
	pageNumber,
	label: `Page ${pageNumber}`,
	thumbnail: PNG,
	ratio: LETTER,
}))

function rail() {
	return renderUI(
		<div style={{ width: 300 }}>
			<PdfViewerThumbnailList
				items={items}
				loading={false}
				safePage={1}
				goToPage={() => {}}
				scrollCurrentIntoView={null}
				layout="grid"
			/>
		</div>,
	)
}

/**
 * A tile paints in the layer of the surface that holds it, as its label does. The edge of the
 * page is a box shadow on the frame, and no part of a tile has a CSS filter, because WebKit gives
 * an element with a filter a compositing layer of its own. The tiles in the view of the rail load
 * at once, because a lazy load reads the place of the image in the viewport, and the slide of
 * the Sheet moves it. CI has no browser with the compositor of iOS, so these tests hold the
 * structure.
 */
describe('pdf viewer thumbnail paint (real browser)', () => {
	it('draws the edge of each page with a box shadow on its frame, and no filter', () => {
		for (const tile of getAllSlots(rail().container, 'pdf-viewer-thumbnail')) {
			const image = present(tile.querySelector('img'), 'the image of the tile')

			const frame = present(image.parentElement, 'the frame of the tile')

			expect(getComputedStyle(frame).boxShadow).not.toBe('none')

			for (const part of [tile, frame, image]) expect(getComputedStyle(part).filter).toBe('none')
		}
	})

	it('gives the frame the ratio of the page', () => {
		for (const tile of getAllSlots(rail().container, 'pdf-viewer-thumbnail')) {
			const frame = present(tile.querySelector('img')?.parentElement, 'the frame of the tile')

			const { width, height } = frame.getBoundingClientRect()

			expect(width / height).toBeCloseTo(LETTER, 2)
		}
	})

	it('loads the tiles in the view of the rail at once', async () => {
		const tiles = getAllSlots(rail().container, 'pdf-viewer-thumbnail')

		await waitFor(() => {
			for (const tile of tiles) expect(tile.querySelector('img')?.loading).toBe('eager')
		})
	})
})
