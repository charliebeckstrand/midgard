'use client'

import { Search } from 'lucide-react'
import type { ReactElement } from 'react'
import { cn } from '../../core/cn'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
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
 * The mark of a thumbnail tile with a search match: a search glyph after the page number, in
 * the color of the page number. The tooltip of the tile gives the number of matches.
 *
 * @remarks A leaf of its own. With {@link PdfViewerThumbnailTooltip}, it is the only part of
 * the rail that reads the search. A key that the reader types renders the leaves again, and
 * not the tiles, their images, or the rail.
 *
 * The glyph is hidden from assistive tech. The description gives the number as a phrase, such
 * as "2 matches", and the button of the tile names it. The description is always in the tree,
 * so the reference of the button never points at nothing. It is empty, and describes nothing,
 * on a page with no match.
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
					data-slot="pdf-viewer-thumbnail-matches"
					className={cn(k().thumbnail.label, k().thumbnail.matches)}
				>
					<Icon icon={<Search />} size={12} />
				</span>
			)}
		</>
	)
}

/** Props for {@link PdfViewerThumbnailTooltip}. @internal */
type PdfViewerThumbnailTooltipProps = {
	/** The 1-based page of the tile. */
	pageNumber: number
	/** The button of the tile. */
	children: ReactElement
}

/**
 * The tooltip of a thumbnail tile with a search match: the number of matches, such as
 * "2 matches". A hover on the tile or a keyboard focus opens it.
 *
 * @remarks The tooltip is on the button of the tile, not on the glyph. The glyph is inside the
 * button and cannot take focus, so a tooltip on it would open on a hover only.
 *
 * Each tile has the tooltip, and a tile with no match disables it. A tooltip that came and went
 * with the matches would change the shape of the tree, and React would mount the button again
 * under the focus of the reader.
 * @internal
 */
export function PdfViewerThumbnailTooltip({
	pageNumber,
	children,
}: PdfViewerThumbnailTooltipProps) {
	const { pageMatches } = usePdfViewerSearchContext()

	const intl = useIntl()

	const count = pageMatches.get(pageNumber) ?? 0

	return (
		<Tooltip disabled={count === 0}>
			<TooltipTrigger>{children}</TooltipTrigger>
			<TooltipContent>
				{count > 0 ? intl.formatMessage(pdfViewerMessages.pageMatches, { count }) : null}
			</TooltipContent>
		</Tooltip>
	)
}
