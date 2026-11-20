import { PdfViewer } from 'ui/pdf-viewer'
import quarterlyReport from './quarterly-report.pdf?url'
import text from './quarterly-report-text.json'

export default function Search() {
	return (
		<PdfViewer
			src={quarterlyReport}
			filename="quarterly-report.pdf"
			data={text}
			aria-label="Sales report for the first quarter"
		/>
	)
}
