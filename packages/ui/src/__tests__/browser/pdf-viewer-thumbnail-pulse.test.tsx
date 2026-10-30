import { describe, expect, it } from 'vitest'
import { PdfViewerThumbnailList } from '../../components/pdf-viewer/pdf-viewer-thumbnail-list'
import { getAllSlots, present, renderUI, waitFor } from '../helpers'

// Forty pages with no thumbnails yet (an empty source), so each tile shows its skeleton.
const items = Array.from({ length: 40 }, (_, index) => ({
	key: index + 1,
	pageNumber: index + 1,
	label: `Page ${index + 1}`,
	thumbnail: '',
	ratio: 816 / 1056,
}))

function rail() {
	const { container } = renderUI(
		<div style={{ display: 'flex', flexDirection: 'column', width: 200, height: 400 }}>
			<PdfViewerThumbnailList
				items={items}
				loading={false}
				safePage={1}
				goToPage={() => {}}
				scrollCurrentIntoView={null}
			/>
		</div>,
	)

	return {
		scroller: present(
			container.querySelector<HTMLElement>('[data-slot="pdf-viewer-thumbnails"]'),
			'the rail',
		),
		skeletons: getAllSlots(container, 'pdf-viewer-thumbnail-skeleton'),
	}
}

/** Whether a skeleton pulses: it has the class of the pulse. */
function pulses(skeleton: HTMLElement): boolean {
	return skeleton.className.includes('animate-pulse')
}

/**
 * A long document has a tile for each page. A pulse runs, and restyles its tile in each frame,
 * also where the rail clips the tile. So only the skeletons in view of the rail pulse.
 */
describe('pdf viewer thumbnail pulse (real browser)', () => {
	it('pulses only the skeletons in view of the rail', async () => {
		const { skeletons } = rail()

		const first = present(skeletons[0], 'the first skeleton')

		const last = present(skeletons.at(-1), 'the last skeleton')

		await waitFor(() => expect(pulses(first)).toBe(true))

		expect(pulses(last)).toBe(false)
	})

	it('pulses a skeleton when the rail scrolls it into view, and stops the one it leaves', async () => {
		const { scroller, skeletons } = rail()

		const first = present(skeletons[0], 'the first skeleton')

		const last = present(skeletons.at(-1), 'the last skeleton')

		await waitFor(() => expect(pulses(first)).toBe(true))

		scroller.scrollTop = scroller.scrollHeight

		await waitFor(() => {
			expect(pulses(last)).toBe(true)

			expect(pulses(first)).toBe(false)
		})
	})
})
