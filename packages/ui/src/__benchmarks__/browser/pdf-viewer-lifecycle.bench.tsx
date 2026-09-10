/**
 * What parking a panel costs the PDF viewer, now that the rasterized pages survive it.
 *
 * A panel that parks by *closing* — `Overlay` gates its portal on `open` — unmounts its
 * children, `PdfViewer` among them. Every park/unpark round trip therefore rebuilds the viewer
 * subtree, and before `pdf-viewer-document-cache.ts` it also re-fetched the PDF and
 * re-rasterized every page, with the reader watching the scan restart from its skeleton. These
 * bars measure what is left of that:
 *
 * - `react root baseline` is the harness overhead to subtract from the mount bars.
 * - `mount + unmount · resident document` is what an unpark pays now: the viewer subtree —
 *   toolbar, page Listbox, thumbnail rail, viewport — built and torn down over a document the
 *   cache already holds.
 * - `mount + unmount · pre-rendered pages` is the same subtree with `pages` supplied, which
 *   bypasses the cache read entirely. It carries the same `src` so the toolbar renders the same
 *   download/print group (it is gated on `documentSrc`), leaving the cache read as the only
 *   difference between the two — so the gap between them is what consulting the cache costs.
 *
 * **Two things a park used to redo are deliberately not benchmarked here, for different
 * reasons.** The `fetch(src)` half would be measuring someone's network: the only document this
 * repo points at is remote (the demo's `compressed.tracemonkey-pldi-09.pdf`). The rasterization
 * half *was* written against a PDF this file assembles — 551 bytes, correct xref, one US-Letter
 * page, so no fixture and no network — and pdf.js parses it here, but `page.render` throws
 * `getOrInsertComputed is not a function`: pdf.js 6's renderer calls
 * `Map.prototype.getOrInsertComputed`, which the pinned Playwright Chromium (141) does not
 * implement. That bar is worth adding the moment the browser catches up, and it is the one that
 * would put a number on the saving rather than on the residue.
 *
 * Finding (Chromium 141, three runs): baseline ~0.1–0.17ms, `resident document` ~9.0–10.2ms at
 * 14 pages, `pre-rendered pages` ~8.1–8.7ms. Two things to read off that. The subtree rebuild
 * dominates at ~8–10ms, so the expensive half of an unpark is now the React tree rather than the
 * document — which is the whole point of the cache. And the cache-backed path costs a consistent
 * ~1ms more per mount than pre-supplied pages: the store subscription plus the load-guard effect,
 * paid once per mount, against the document fetch and fourteen rasterizations it replaces.
 *
 * So this bench is the regression guard on the mount path, and the floor any future
 * `keepMounted`-style change to the parking panel would be trying to reclaim.
 */

import { bench, describe } from 'vitest'
import { PdfViewer } from '../../components/pdf-viewer'
import {
	ensureDocumentLoad,
	resetDocumentCache,
} from '../../components/pdf-viewer/pdf-viewer-document-cache'
import type { PdfViewerPage } from '../../components/pdf-viewer/types'
import { reactHost, WINDOW } from './harness'

/** How many pages the document carries — the scale the highlights plan measured against. */
const PAGE_COUNT = 14

/** A 1×1 transparent PNG. These bars measure the viewer's subtree, not image decode. */
const PIXEL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const RESIDENT_SRC = '/bench-invoice.pdf'

/** One page record shaped the way the rasterizer emits them, extents included. */
function pageAt(index: number): PdfViewerPage {
	return {
		id: index + 1,
		src: PIXEL,
		label: `Page ${index + 1}`,
		width: 1224,
		height: 1584,
		pointWidth: 612,
		pointHeight: 792,
	}
}

const PAGES: PdfViewerPage[] = Array.from({ length: PAGE_COUNT }, (_, index) => pageAt(index))

/**
 * Leaves {@link RESIDENT_SRC} in the cache as a finished document, so the resident bar takes the
 * path an unpark takes: `usePdfViewerDocument` reads its pages during render and rasterizes
 * nothing.
 *
 * Driven through the cache's own loader seam rather than by letting the hook fetch, which is
 * what keeps pdf.js and the network out of this file entirely.
 */
resetDocumentCache()

ensureDocumentLoad(RESIDENT_SRC, (report) => {
	report.documentUrl(PIXEL)

	for (const page of PAGES) report.page(page)

	return Promise.resolve()
})

describe('pdf viewer · park and unpark', () => {
	// React root create + render + unmount with a trivial child: the overhead to subtract from
	// the mount bars so their numbers are the viewer subtree alone.
	bench(
		'react root baseline (no viewer)',
		() => {
			const bare = reactHost()

			bare.render(<div />)

			bare.destroy()
		},
		WINDOW.settled,
	)

	// The unpark, as it costs now.
	bench(
		'mount + unmount · resident document',
		() => {
			const viewer = reactHost()

			viewer.render(<PdfViewer src={RESIDENT_SRC} fit="page" aria-label="Invoice scan" />)

			viewer.destroy()
		},
		WINDOW.settled,
	)

	// The same subtree and the same chrome, with `pages` supplied so the cache is never
	// consulted. `src` rides along unused for the document actions — `shouldLoadFromSrc` is
	// false whenever `pages` is set, so nothing here loads.
	bench(
		'mount + unmount · pre-rendered pages',
		() => {
			const viewer = reactHost()

			viewer.render(
				<PdfViewer pages={PAGES} src={RESIDENT_SRC} fit="page" aria-label="Invoice scan" />,
			)

			viewer.destroy()
		},
		WINDOW.settled,
	)
})
