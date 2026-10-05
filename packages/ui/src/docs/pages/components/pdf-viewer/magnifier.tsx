import { PdfViewer } from 'ui/pdf-viewer'
import { pages } from './statement.ts'

export default function Magnifier() {
	return <PdfViewer pages={pages} magnifier aria-label="Statement with a magnifier" />
}
