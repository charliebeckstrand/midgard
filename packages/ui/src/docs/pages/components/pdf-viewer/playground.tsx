import { PdfViewer, type PdfViewerProps } from 'ui/pdf-viewer'

export default function PdfViewerPlayground(props: PdfViewerProps) {
	return (
		<PdfViewer
			{...props}
			src="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"
			filename="tracemonkey.pdf"
			aria-label="TraceMonkey paper"
		/>
	)
}
