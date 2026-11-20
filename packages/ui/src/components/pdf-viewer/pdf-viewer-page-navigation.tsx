import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Placeholder } from '../placeholder'
import { ToolbarGroup } from '../toolbar'
import { pageLabel, pdfViewerMessages } from './pdf-viewer-messages'
import type { PdfViewerSlot } from './types'

/** Props for {@link PdfViewerPageNavigation}. @internal */
type PdfViewerPageNavigationProps = {
	pages: PdfViewerSlot[]
	/** The page that the viewer shows, or asks for while the document opens. */
	page: number
	goToPage: (page: number) => void
}

/**
 * The page picker and the page count of the toolbar.
 *
 * @remarks The group is there while the document opens, with the page that the viewer asks for.
 * A narrow bar scrolls, so a group that arrived with the document pushed the controls after it
 * along the bar. Until the count arrives, the picker is disabled, and a skeleton of one digit
 * holds the place of the count.
 * @internal
 */
export function PdfViewerPageNavigation({ pages, page, goToPage }: PdfViewerPageNavigationProps) {
	const intl = useIntl()

	const total = pages.length

	return (
		<ToolbarGroup aria-label={intl.formatMessage(pdfViewerMessages.pageNavigation)}>
			<Listbox<number>
				aria-label={intl.formatMessage(pdfViewerMessages.currentPage)}
				value={page}
				onValueChange={(next) => {
					if (next !== null) goToPage(next)
				}}
				displayValue={(pageNumber) => intl.formatNumber(pageNumber)}
				disabled={total === 0}
				className="tabular-nums"
			>
				{pages.map((entry, index) => {
					const pageNumber = index + 1

					return (
						<ListboxOption key={entry.id ?? index} value={pageNumber}>
							<ListboxLabel>{pageLabel(intl, entry, pageNumber)}</ListboxLabel>
						</ListboxOption>
					)
				})}
			</Listbox>
			{/* A screen reader reads "of 12", not "slash 12". The visible count is hidden from it,
			    because the sentence below says the count in the language of the reader. */}
			<span aria-hidden="true" className="mx-1 select-none">
				/
			</span>
			{/* `-total`, not `-status`: the viewport's live region owns that anchor. */}
			<span data-slot="pdf-viewer-page-total" className={k().toolbar.total}>
				{total === 0 ? (
					<Placeholder as="span" className={k().toolbar.pending}>
						{intl.formatNumber(0)}
					</Placeholder>
				) : (
					<>
						<span aria-hidden="true">{intl.formatNumber(total)}</span>
						<span className="sr-only">
							{intl.formatMessage(pdfViewerMessages.ofTotal, { total })}
						</span>
					</>
				)}
			</span>
		</ToolbarGroup>
	)
}
