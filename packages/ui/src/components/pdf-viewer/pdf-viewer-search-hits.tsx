'use client'

import { useLayoutEffect, useRef } from 'react'
import { dataAttr } from '../../core/data-attr'
import { k } from '../../recipes/kata/pdf-viewer'
import { usePdfViewerContext, usePdfViewerSearchContext } from './context'
import type { PdfViewerHighlightRect } from './types'

/** Percentages of the layer, which is the twin of the page image, as a highlight region is. @internal */
function hitStyle({ x, y, width, height }: PdfViewerHighlightRect) {
	return {
		left: `${x * 100}%`,
		top: `${y * 100}%`,
		width: `${width * 100}%`,
		height: `${height * 100}%`,
	}
}

/**
 * Gates the layer of search matches: it renders only when the page is measured and a match
 * is on it.
 *
 * @remarks The layer is a component of its own, so its reveal runs against a mounted layer.
 * The gate is the same as the gate of the highlight overlay.
 * @internal
 */
export function PdfViewerSearchHits() {
	const { visible } = usePdfViewerContext()

	const { hits } = usePdfViewerSearchContext()

	if (!visible || hits.length === 0) return null

	return <PdfViewerSearchHitLayer />
}

/**
 * Draws the matches of the search on the page on screen, inside the frame of the page and
 * under its transform.
 *
 * @remarks Decoration: the layer is `aria-hidden` and takes no pointer events. The panel of
 * the toolbar speaks the position of the current match, and a press goes through to the page
 * and to the highlighted regions under the layer.
 *
 * The current match scrolls into view once for each match, through
 * {@link PdfViewerSearchResult.reveal}. The latch waits while the current match is on another
 * page, because the match can arrive with the next page.
 * @internal
 */
function PdfViewerSearchHitLayer() {
	const { scale } = usePdfViewerContext()

	const { hits, color, reveal } = usePdfViewerSearchContext()

	const layerRef = useRef<HTMLDivElement>(null)

	// After each render of the layer, with no list of dependencies: a step, a new query, and a
	// page turn each render the layer. The latch is in the search, so it outlives the layer.
	useLayoutEffect(() => reveal(layerRef.current))

	return (
		<div
			ref={layerRef}
			data-slot="pdf-viewer-search-hits"
			aria-hidden
			className={k().viewport.page.search.base}
			style={scale.page}
		>
			{hits.map((hit) => (
				<span
					key={hit.key}
					data-current={dataAttr(hit.current)}
					className={k({ color, current: hit.current }).viewport.page.search.hit}
					style={hitStyle(hit.rect)}
				/>
			))}
		</div>
	)
}
