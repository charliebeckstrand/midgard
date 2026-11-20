'use client'

import { Search } from 'lucide-react'
import { cn } from '../../core/cn'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { Icon } from '../icon'
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
 * The mark of a thumbnail tile: the number of search matches on its page and a search glyph,
 * in parentheses after the page number, in the type of the page number.
 *
 * @remarks The glyph is what tells the count from the page number. A bare number beside a page
 * number reads as a second page number.
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
	const { pageMatches } = usePdfViewerSearchContext()

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
					className={cn(k().thumbnail.label, k().thumbnail.matches.base)}
				>
					({intl.formatNumber(count)}
					<Icon icon={<Search />} size={12} className={k().thumbnail.matches.glyph} />)
				</span>
			)}
		</>
	)
}
