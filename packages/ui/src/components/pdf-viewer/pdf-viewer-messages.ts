import { defineMessages } from '../../primitives/intl/intl-messages'
import type { IntlShape, MessageSet } from '../../primitives/intl/types'
import type { PdfViewerSlot } from './types'

// The values of each message of the PDF viewer, by key.
type PdfViewerValues = {
	viewer: Record<never, never>
	controls: Record<never, never>
	showThumbnails: Record<never, never>
	hideThumbnails: Record<never, never>
	closeThumbnails: Record<never, never>
	pages: Record<never, never>
	showHighlights: Record<never, never>
	hideHighlights: Record<never, never>
	magnifierOn: Record<never, never>
	magnifierOff: Record<never, never>
	pageNavigation: Record<never, never>
	currentPage: Record<never, never>
	page: { page: string }
	ofTotal: { total: number }
	pageOfTotal: { page: number; total: number }
	pageRegion: Record<never, never>
	goTo: { page: string }
	view: Record<never, never>
	rotate: Record<never, never>
	zoom: Record<never, never>
	zoomOut: Record<never, never>
	zoomIn: Record<never, never>
	zoomOutTo: { percent: string }
	zoomInTo: { percent: string }
	resetZoom: Record<never, never>
	document: Record<never, never>
	download: Record<never, never>
	print: Record<never, never>
	loading: Record<never, never>
	loadFailed: { message: string }
	noPages: Record<never, never>
	highlightedRegion: { label: string }
	highlightedRegions: Record<never, never>
	magnifierSettings: Record<never, never>
	magnifier: Record<never, never>
	showMagnifier: Record<never, never>
	magnification: Record<never, never>
	times: { zoom: number }
	size: Record<never, never>
	small: Record<never, never>
	medium: Record<never, never>
	large: Record<never, never>
	delay: Record<never, never>
	noDelay: Record<never, never>
	defaultDelay: Record<never, never>
}

/**
 * The messages of the PDF viewer: its toolbar, its thumbnails, its page, its
 * highlights, and its magnifier.
 *
 * @internal
 */
export const pdfViewerMessages: MessageSet<PdfViewerValues> = defineMessages<PdfViewerValues>({
	viewer: {
		id: 'ui.pdfViewer.viewer',
		defaultMessage: 'PDF viewer',
		description: 'The name of the PDF viewer.',
	},
	controls: {
		id: 'ui.pdfViewer.controls',
		defaultMessage: 'PDF controls',
		description: 'The name of the toolbar of the PDF viewer.',
	},
	showThumbnails: {
		id: 'ui.pdfViewer.showThumbnails',
		defaultMessage: 'Show thumbnails',
		description: 'The button that shows the small images of the pages of a PDF.',
	},
	hideThumbnails: {
		id: 'ui.pdfViewer.hideThumbnails',
		defaultMessage: 'Hide thumbnails',
		description: 'The button that hides the small images of the pages of a PDF.',
	},
	closeThumbnails: {
		id: 'ui.pdfViewer.closeThumbnails',
		defaultMessage: 'Close thumbnails',
		description:
			'The name of the button that closes the panel with the small images of the pages of a PDF.',
	},
	pages: {
		id: 'ui.pdfViewer.pages',
		defaultMessage: 'Pages',
		description: 'The title of the panel with the small images of the pages of a PDF.',
	},
	showHighlights: {
		id: 'ui.pdfViewer.showHighlights',
		defaultMessage: 'Show highlights',
		description: 'The button that shows the highlighted regions on the pages of a PDF.',
	},
	hideHighlights: {
		id: 'ui.pdfViewer.hideHighlights',
		defaultMessage: 'Hide highlights',
		description: 'The button that hides the highlighted regions on the pages of a PDF.',
	},
	magnifierOn: {
		id: 'ui.pdfViewer.magnifierOn',
		defaultMessage: 'Turn magnifier on',
		description: 'The button that turns on the lens that magnifies the page of a PDF.',
	},
	magnifierOff: {
		id: 'ui.pdfViewer.magnifierOff',
		defaultMessage: 'Turn magnifier off',
		description: 'The button that turns off the lens that magnifies the page of a PDF.',
	},
	pageNavigation: {
		id: 'ui.pdfViewer.pageNavigation',
		defaultMessage: 'Page navigation',
		description: 'The name of the group of controls that go to a page of a PDF.',
	},
	currentPage: {
		id: 'ui.pdfViewer.currentPage',
		defaultMessage: 'Current page',
		description: 'The name of the control that shows and picks the current page of a PDF.',
	},
	page: {
		id: 'ui.pdfViewer.page',
		defaultMessage: 'Page {page}',
		description:
			'The name of a page of a PDF. The page is its number, or the label that the PDF prints, such as "iv".',
	},
	ofTotal: {
		id: 'ui.pdfViewer.ofTotal',
		defaultMessage: 'of {total, number}',
		description:
			'Read after the current page number in the toolbar of a PDF, such as "of 12". The total is the number of pages.',
	},
	pageOfTotal: {
		id: 'ui.pdfViewer.pageOfTotal',
		defaultMessage: 'Page {page, number} of {total, number}',
		description: 'Spoken when the current page of a PDF changes, such as "Page 3 of 12".',
	},
	pageRegion: {
		id: 'ui.pdfViewer.pageRegion',
		defaultMessage: 'Page',
		description: 'The name of the scroll region that shows the current page of a PDF.',
	},
	goTo: {
		id: 'ui.pdfViewer.goTo',
		defaultMessage: 'Go to {page}',
		description:
			'The name of the button that shows a page of a PDF. The page is the name of the page, such as "Page 3".',
	},
	view: {
		id: 'ui.pdfViewer.view',
		defaultMessage: 'View',
		description:
			'The name of the group of controls that rotate the page, show the highlights, and set the magnifier.',
	},
	rotate: {
		id: 'ui.pdfViewer.rotate',
		defaultMessage: 'Rotate',
		description: 'The button that turns the page of a PDF by a quarter turn.',
	},
	zoom: {
		id: 'ui.pdfViewer.zoom',
		defaultMessage: 'Zoom',
		description: 'The name of the group of zoom controls of a PDF.',
	},
	zoomOut: {
		id: 'ui.pdfViewer.zoomOut',
		defaultMessage: 'Zoom out',
		description: 'The button that makes the page of a PDF smaller.',
	},
	zoomIn: {
		id: 'ui.pdfViewer.zoomIn',
		defaultMessage: 'Zoom in',
		description: 'The button that makes the page of a PDF larger.',
	},
	zoomOutTo: {
		id: 'ui.pdfViewer.zoomOutTo',
		defaultMessage: 'Zoom out ({percent})',
		description:
			'The tooltip of the Zoom out button. The percent is the zoom that the button sets, such as "90%".',
	},
	zoomInTo: {
		id: 'ui.pdfViewer.zoomInTo',
		defaultMessage: 'Zoom in ({percent})',
		description:
			'The tooltip of the Zoom in button. The percent is the zoom that the button sets, such as "125%".',
	},
	resetZoom: {
		id: 'ui.pdfViewer.resetZoom',
		defaultMessage: 'Reset zoom',
		description: 'The button that sets the zoom of a PDF back to 100%.',
	},
	document: {
		id: 'ui.pdfViewer.document',
		defaultMessage: 'Document',
		description: 'The name of the group of the Download and Print buttons of a PDF.',
	},
	download: {
		id: 'ui.pdfViewer.download',
		defaultMessage: 'Download',
		description: 'The button that downloads a PDF.',
	},
	print: {
		id: 'ui.pdfViewer.print',
		defaultMessage: 'Print',
		description: 'The button that prints a PDF.',
	},
	loading: {
		id: 'ui.pdfViewer.loading',
		defaultMessage: 'Loading PDF',
		description: 'The name of the placeholder of a PDF that is loading.',
	},
	loadFailed: {
		id: 'ui.pdfViewer.loadFailed',
		defaultMessage: 'Failed to load PDF: {message}',
		description:
			'The error of a PDF that did not load. The message is the error from the PDF reader, in English.',
	},
	noPages: {
		id: 'ui.pdfViewer.noPages',
		defaultMessage: 'No pages to display',
		description: 'The text of a PDF viewer that has no pages.',
	},
	highlightedRegion: {
		id: 'ui.pdfViewer.highlightedRegion',
		defaultMessage: 'Highlighted region: {label}',
		description:
			'Spoken when the reader selects a highlighted region on a page of a PDF. The label is the name of the region.',
	},
	highlightedRegions: {
		id: 'ui.pdfViewer.highlightedRegions',
		defaultMessage: 'Highlighted regions',
		description: 'The name of the group of highlighted regions on a page of a PDF.',
	},
	magnifierSettings: {
		id: 'ui.pdfViewer.magnifierSettings',
		defaultMessage: 'Magnifier settings',
		description: 'The button that opens the settings of the lens that magnifies the page of a PDF.',
	},
	magnifier: {
		id: 'ui.pdfViewer.magnifier',
		defaultMessage: 'Magnifier',
		description:
			'The title of the dialog with the settings of the lens that magnifies the page of a PDF.',
	},
	showMagnifier: {
		id: 'ui.pdfViewer.showMagnifier',
		defaultMessage: 'Show magnifier',
		description: 'The label of the switch that turns on the lens that magnifies the page of a PDF.',
	},
	magnification: {
		id: 'ui.pdfViewer.magnification',
		defaultMessage: 'Magnification',
		description: 'The caption of the choice of how much the lens magnifies the page of a PDF.',
	},
	times: {
		id: 'ui.pdfViewer.times',
		defaultMessage: '{zoom, number}×',
		description: 'A magnification of the lens, such as "2.5×". The zoom is the factor.',
	},
	size: {
		id: 'ui.pdfViewer.size',
		defaultMessage: 'Size',
		description:
			'The caption of the choice of the size of the lens that magnifies the page of a PDF.',
	},
	small: {
		id: 'ui.pdfViewer.small',
		defaultMessage: 'Small',
		description: 'The smallest size of the lens that magnifies the page of a PDF.',
	},
	medium: {
		id: 'ui.pdfViewer.medium',
		defaultMessage: 'Medium',
		description: 'The middle size of the lens that magnifies the page of a PDF.',
	},
	large: {
		id: 'ui.pdfViewer.large',
		defaultMessage: 'Large',
		description: 'The largest size of the lens that magnifies the page of a PDF.',
	},
	delay: {
		id: 'ui.pdfViewer.delay',
		defaultMessage: 'Delay',
		description:
			'The caption of the choice of how long the pointer rests before the lens opens on a PDF.',
	},
	noDelay: {
		id: 'ui.pdfViewer.noDelay',
		defaultMessage: 'None',
		description: 'The choice of no wait before the lens opens on a PDF.',
	},
	defaultDelay: {
		id: 'ui.pdfViewer.defaultDelay',
		defaultMessage: 'Default',
		description: 'The choice of the usual short wait before the lens opens on a PDF.',
	},
})

/**
 * The name of a page, such as "Page 3", in the language of `intl`. A label
 * that the app gives the page wins. A page that a `src` load opens is named by
 * the label that the document prints, such as "Page iv", else by its number.
 *
 * @internal
 */
export function pageLabel(
	intl: IntlShape,
	page: PdfViewerSlot | undefined,
	pageNumber: number,
): string {
	return (
		page?.label ??
		intl.formatMessage(pdfViewerMessages.page, {
			page: page?.printedLabel ?? intl.formatNumber(pageNumber),
		})
	)
}
