import { Download, Printer } from 'lucide-react'
import { Glyph } from '../../primitives/glyph'
import { useIntl } from '../../primitives/intl/use-intl'
import { IconButton } from '../icon-button'
import { ToolbarGroup } from '../toolbar'
import { pdfViewerMessages } from './pdf-viewer-messages'
import { downloadPdf, printPdf } from './pdf-viewer-utilities'

/** Props for {@link PdfViewerDocumentActions}. @internal */
type PdfViewerDocumentActionsProps = {
	/** Document source for download / print; the same-origin blob URL when available. */
	src: string
	filename?: string
	disabled: boolean
}

/**
 * Download and print buttons for the source document.
 *
 * @remarks Print loads the source into a hidden iframe and prints it. When the
 * source is cross-origin, print opens the source in a new tab. See {@link printPdf}.
 * @internal
 */
export function PdfViewerDocumentActions({
	src,
	filename,
	disabled,
}: PdfViewerDocumentActionsProps) {
	const download = () => downloadPdf(src, filename)

	const print = () => printPdf(src)

	const intl = useIntl()

	return (
		<ToolbarGroup aria-label={intl.formatMessage(pdfViewerMessages.document)}>
			<IconButton
				variant="plain"
				lockable={false}
				tooltip
				aria-label={intl.formatMessage(pdfViewerMessages.download)}
				icon={<Glyph icon={Download} />}
				disabled={disabled}
				onClick={download}
			/>
			<IconButton
				variant="plain"
				lockable={false}
				tooltip
				aria-label={intl.formatMessage(pdfViewerMessages.print)}
				icon={<Glyph icon={Printer} />}
				disabled={disabled}
				onClick={print}
			/>
		</ToolbarGroup>
	)
}
