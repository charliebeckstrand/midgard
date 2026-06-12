import { PdfViewer } from '../../components/pdf-viewer'
import { code } from '../code'
import { Example } from '../components/example'

function DefaultExample() {
	return (
		<Example
			title="Default"
			code={code`
				import { PdfViewer } from 'ui/pdf-viewer'

				<PdfViewer src="/sample.pdf" filename="sample.pdf" />
			`}
		>
			<PdfViewer
				src="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"
				filename="tracemonkey.pdf"
			/>
		</Example>
	)
}

function EmptyExample() {
	return (
		<Example title="Empty">
			<PdfViewer pages={[]} />
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<DefaultExample />
			<EmptyExample />
		</>
	)
}
