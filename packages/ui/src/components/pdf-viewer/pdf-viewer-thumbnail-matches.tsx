'use client'

import { useIntl } from '../../primitives/intl/use-intl'
import { Badge } from '../badge'
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
 * The mark of a thumbnail tile with a search match: a small amber Badge after the page number
 * that gives the number of matches, such as "2 matches".
 *
 * @remarks A leaf of its own. It is the only part of the rail that reads the search. A key that
 * the reader types renders the leaves again, and not the tiles, their images, or the rail.
 *
 * The badge is the description that the button of the tile names. The `aria-label` of the
 * button replaces the content of the button in its name, so the description gives the number to
 * assistive tech. The element with the id is always in the tree, so the reference of the button
 * never points at nothing. On a page with no match, it is an empty hidden span that describes
 * nothing.
 * @internal
 */
export function PdfViewerThumbnailMatches({ pageNumber, id }: PdfViewerThumbnailMatchesProps) {
	const { pageMatches } = usePdfViewerSearchContext()

	const intl = useIntl()

	const count = pageMatches.get(pageNumber) ?? 0

	if (count === 0) return <span id={id} hidden />

	return (
		<Badge id={id} size="sm" color="amber">
			{intl.formatMessage(pdfViewerMessages.pageMatches, { count })}
		</Badge>
	)
}
