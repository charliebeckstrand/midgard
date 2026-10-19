import { describe, expect, it } from 'vitest'
import { PdfViewerThumbnailList } from '../../components/pdf-viewer/pdf-viewer-thumbnail-list'
import { getSlot, renderUI, waitFor } from '../helpers'

// A white 1x1 PNG: a thumbnail with an intrinsic size of its own.
const PNG =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+hc2rNAAAAABJRU5ErkJggg=='

const items = [PNG, ''].map((thumbnail, index) => ({
	key: index,
	pageNumber: index + 1,
	label: `Page ${index + 1}`,
	thumbnail,
}))

function box(element: Element) {
	const { width, height } = element.getBoundingClientRect()

	return { width, height }
}

/**
 * Each tile has its final box before its thumbnail renders. A tile with no thumbnail yet, and
 * a placeholder of a loading document, take the box of a tile with an image. So the rail and
 * the Sheet do not move as the thumbnails land.
 */
describe.each(['list', 'grid'] as const)(
	'pdf viewer thumbnail box, %s (real browser)',
	(layout) => {
		function rail(props: { items: typeof items; loading: boolean }) {
			return renderUI(
				<div style={{ width: 300 }}>
					<PdfViewerThumbnailList
						{...props}
						safePage={1}
						goToPage={() => {}}
						scrollCurrentIntoView={null}
						layout={layout}
					/>
				</div>,
			)
		}

		it('gives a tile with no thumbnail the box of a tile with one', async () => {
			const { container } = rail({ items, loading: false })

			const [loaded, pending] = [
				...getSlot(container, 'pdf-viewer-thumbnails').querySelectorAll(
					'[data-slot="pdf-viewer-thumbnail"]',
				),
			] as HTMLElement[]

			await waitFor(() => expect(loaded?.querySelector('img')?.complete).toBe(true))

			expect(pending?.querySelector('[data-slot="pdf-viewer-thumbnail-skeleton"]')).not.toBeNull()

			expect(box(pending as HTMLElement)).toEqual(box(loaded as HTMLElement))

			expect(box(loaded as HTMLElement).height).toBeGreaterThan(box(loaded as HTMLElement).width)
		})

		it('gives a placeholder of a loading document the box of a tile', () => {
			const tile = box(getSlot(rail({ items, loading: false }).container, 'pdf-viewer-thumbnail'))

			const placeholder = box(
				getSlot(rail({ items: [], loading: true }).container, 'pdf-viewer-thumbnail-placeholder'),
			)

			expect(placeholder).toEqual(tile)
		})
	},
)
