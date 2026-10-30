import {
	ensureDocumentLoad,
	type PdfLoadReport,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { tick } from './frames'

/**
 * Leaves `src` resident with `pageCount` finished pages, the way a completed load does.
 *
 * The seed goes through the loader seam of the cache, not through pdf.js, which
 * CONVENTIONS §10.3 rules out. A hook reads the committed snapshot either way.
 *
 * Await the seed before a mount. The cache clears its loading flag in a `then`,
 * so a seed that did not settle leaves the document in the middle of a load.
 * The `afterEach(resetDocumentCache)` of the calling file removes the seed.
 *
 * @param src - The document source to seed.
 * @param pageCount - The number of finished pages, each of 612 by 792 points.
 */
export async function seedDocument(src: string, pageCount = 1): Promise<void> {
	let report: PdfLoadReport | undefined

	ensureDocumentLoad(src, (next) => {
		report = next

		return Promise.resolve()
	})

	report?.documentUrl('blob:doc')

	for (let id = 1; id <= pageCount; id++) {
		report?.page({
			id,
			src: `blob:page-${id}`,
			label: `Page ${id}`,
			width: 800,
			height: 1000,
			pointWidth: 612,
			pointHeight: 792,
		})
	}

	await tick()
}
