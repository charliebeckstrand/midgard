import { PdfViewer, type PdfViewerProps } from 'ui/pdf-viewer'
import quarterlyReport from './quarterly-report.pdf?url'

export default function PdfViewerPlayground(props: PdfViewerProps) {
	return (
		<PdfViewer
			{...props}
			src={quarterlyReport}
			filename="quarterly-report.pdf"
			aria-label="Quarterly sales report"
		/>
	)
}
