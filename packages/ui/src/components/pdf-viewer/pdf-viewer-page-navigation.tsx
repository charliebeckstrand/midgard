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
 * along the bar. Until the count arrives, the group keeps the box of a count of one digit, its
 * content does not show, and one skeleton fills the box. The picker is disabled, so it is not
 * in the arrow order of the toolbar.
 * @internal
 */
export function PdfViewerPageNavigation({ pages, page, goToPage }: PdfViewerPageNavigationProps) {
	const intl = useIntl()

	const total = pages.length

	const opening = total === 0

	return (
		<ToolbarGroup
			aria-label={intl.formatMessage(pdfViewerMessages.pageNavigation)}
			className={k({ opening }).toolbar.navigation}
		>
			<Listbox<number>
				aria-label={intl.formatMessage(pdfViewerMessages.currentPage)}
				value={page}
				onValueChange={(next) => {
					if (next !== null) goToPage(next)
				}}
				displayValue={(pageNumber) => intl.formatNumber(pageNumber)}
				disabled={opening}
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
				{opening ? (
					// One digit that does not show, so the group has the box of a count of one digit.
					<span aria-hidden="true">{intl.formatNumber(0)}</span>
				) : (
					<>
						<span aria-hidden="true">{intl.formatNumber(total)}</span>
						<span className="sr-only">
							{intl.formatMessage(pdfViewerMessages.ofTotal, { total })}
						</span>
					</>
				)}
			</span>
			{opening && <Placeholder className={k().toolbar.skeleton} />}
		</ToolbarGroup>
	)
}
