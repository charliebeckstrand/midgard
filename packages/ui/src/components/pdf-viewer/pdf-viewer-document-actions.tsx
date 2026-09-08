import { Download, Printer } from 'lucide-react'
import { ToolbarGroup } from '../toolbar'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'
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
 * @remarks Print rasterizes through a hidden iframe and falls back to a new
 * tab when the source is cross-origin; see {@link printPdf}.
 * @internal
 */
export function PdfViewerDocumentActions({
	src,
	filename,
	disabled,
}: PdfViewerDocumentActionsProps) {
	const download = () => downloadPdf(src, filename)

	const print = () => printPdf(src)

	return (
		<ToolbarGroup aria-label="Document">
			<PdfViewerToolbarButton
				label="Download"
				icon={<Download />}
				disabled={disabled}
				onClick={download}
			/>
			<PdfViewerToolbarButton
				label="Print"
				icon={<Printer />}
				disabled={disabled}
				onClick={print}
			/>
		</ToolbarGroup>
	)
}
