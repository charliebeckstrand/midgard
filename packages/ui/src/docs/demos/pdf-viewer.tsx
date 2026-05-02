'use client'

import { PdfViewer } from '../../components/pdf-viewer'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

function Default() {
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

function Empty() {
	return (
		<Example
			title="Empty"
			code={code`
				import { PdfViewer } from 'ui/pdf-viewer'

				<PdfViewer pages={[]} />
			`}
		>
			<PdfViewer pages={[]} />
		</Example>
	)
}

export default function PdfViewerDemo() {
	return (
		<Stack gap="xl">
			<Default />
			<Empty />
		</Stack>
	)
}
