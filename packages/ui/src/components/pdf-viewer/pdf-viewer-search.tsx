'use client'

import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'
import { useA11yAutoFocus } from '../../hooks/a11y/use-a11y-auto-focus'
import { useA11yLiveRegion } from '../../hooks/a11y/use-a11y-live-region'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { isComposing } from '../../utilities/is-composing'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { SearchInput } from '../search-input'
import { usePdfViewerSearchContext } from './context'
import { pdfViewerMessages } from './pdf-viewer-messages'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'

/** Props for {@link PdfViewerSearch}. @internal */
type PdfViewerSearchProps = {
	/** Disables the control while the document has no page, as the other controls of the toolbar are. */
	disabled: boolean
}

/**
 * The search control of the toolbar: a button that opens a panel, and the panel. The panel
 * holds the field, the position of the current match, and the two steps.
 *
 * @remarks It renders nothing where the search is not offered, so the toolbar renders it
 * without a test of its own. The toolbar then reads nothing of the search, and a key that the
 * reader types does not render the rest of the bar again.
 *
 * The panel is a non-modal `Popover`. A press on the page closes it, and the matches stay on
 * the page while the query is there. The button keeps the wash of a held control while the
 * query is there, so the reader can see why the page has marks. `Escape` in the field clears
 * the query, and the next `Escape` closes the panel. `Enter` steps to the next match, and
 * `Shift+Enter` to the previous match.
 * @internal
 */
export function PdfViewerSearch({ disabled }: PdfViewerSearchProps) {
	const { offered, query, setQuery, total, current, next, previous } = usePdfViewerSearchContext()

	const intl = useIntl()

	const [open, setOpen] = useState(false)

	// State, not a ref: the field mounts inside the portal a commit after the panel opens.
	const [field, setField] = useState<HTMLInputElement | null>(null)

	useA11yAutoFocus(field, open)

	const status = useA11yLiveRegion({ className: k().search.count })

	if (!offered) return null

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key !== 'Enter' || isComposing(event)) return

		event.preventDefault()

		if (event.shiftKey) previous()
		else next()
	}

	const noMatch = total === 0

	return (
		<Popover
			// Centered under the control. The panel shifts to stay in the viewport at an edge.
			placement="bottom"
			open={open && !disabled}
			onOpenChange={(next) => setOpen(next && !disabled)}
		>
			<PopoverTrigger>
				<PdfViewerToolbarButton
					label={intl.formatMessage(pdfViewerMessages.search)}
					icon={<Search />}
					active={query !== ''}
					data-slot="pdf-viewer-search-trigger"
					disabled={disabled}
				/>
			</PopoverTrigger>
			<PopoverContent
				aria-label={intl.formatMessage(pdfViewerMessages.search)}
				data-slot="pdf-viewer-search"
			>
				<div className={k().search.bar}>
					<SearchInput
						ref={setField}
						aria-label={intl.formatMessage(pdfViewerMessages.searchQuery)}
						value={query}
						onValueChange={setQuery}
						onKeyDown={handleKeyDown}
						className={k().search.field}
					/>
					{/* The live region is always in the tree, so the first change of its text is spoken. */}
					<span data-slot="pdf-viewer-search-status" {...status}>
						{query === ''
							? null
							: current === null
								? intl.formatMessage(pdfViewerMessages.noMatches)
								: intl.formatMessage(pdfViewerMessages.matchOfTotal, {
										current: current + 1,
										total,
									})}
					</span>
					<PdfViewerToolbarButton
						label={intl.formatMessage(pdfViewerMessages.previousMatch)}
						icon={<ChevronUp />}
						disabled={noMatch}
						onClick={previous}
					/>
					<PdfViewerToolbarButton
						label={intl.formatMessage(pdfViewerMessages.nextMatch)}
						icon={<ChevronDown />}
						disabled={noMatch}
						onClick={next}
					/>
				</div>
			</PopoverContent>
		</Popover>
	)
}
