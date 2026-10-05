import { PdfViewer } from 'ui/pdf-viewer'
import { pages } from './statement.ts'

export default function FitToWidth() {
	return (
		<PdfViewer pages={pages} fit="width" className="h-96" aria-label="Statement at full width" />
	)
}
