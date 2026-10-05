import { PdfViewer } from 'ui/pdf-viewer'

export default function Empty() {
	return <PdfViewer pages={[]} aria-label="Empty viewer" />
}
