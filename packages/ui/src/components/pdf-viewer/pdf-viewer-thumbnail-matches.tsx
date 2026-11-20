'use client'

import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { usePdfViewerSearchContext } from './context'
import { pdfViewerMessages } from './pdf-viewer-messages'

/** Props for {@link PdfViewerThumbnailMatches}. @internal */
type PdfViewerThumbnailMatchesProps = {
	/** The 1-based page of the tile. */
	pageNumber: number
	/** The id of the description, which the button of the tile names in `aria-describedby`. */
	id: string
}

/**
 * The mark of a thumbnail tile: the number of search matches on its page, in the color of the
 * search. The tile of the page with the current match takes the heavier wash.
 *
 * @remarks A leaf of its own, and the only part of the rail that reads the search. A key that
 * the reader types renders each mark again, and not the tiles, their images, or the rail.
 *
 * The visible number is hidden from assistive tech. The description says the same thing as a
 * phrase, such as "2 matches", and the button of the tile names it. The description is always
 * in the tree, so the reference of the button never points at nothing. It is empty, and
 * describes nothing, on a page with no match.
 * @internal
 */
export function PdfViewerThumbnailMatches({ pageNumber, id }: PdfViewerThumbnailMatchesProps) {
	const { pageMatches, currentPage, color } = usePdfViewerSearchContext()

	const intl = useIntl()

	const count = pageMatches.get(pageNumber) ?? 0

	return (
		<>
			<span id={id} hidden>
				{count > 0 ? intl.formatMessage(pdfViewerMessages.pageMatches, { count }) : null}
			</span>
			{count > 0 && (
				<span
					aria-hidden="true"
					data-slot="pdf-viewer-thumbnail-matches"
					className={k({ color, current: currentPage === pageNumber }).thumbnail.matches}
				>
					{intl.formatNumber(count)}
				</span>
			)}
		</>
	)
}
