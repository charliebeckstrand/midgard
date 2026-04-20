'use client'

import { useState } from 'react'
import { PdfViewer, type PdfViewerPage } from '../../components/pdf-viewer'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const PAGE_PALETTE = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#ede9fe', '#ffedd5']

const placeholderPage = (n: number, color: string) =>
	`data:image/svg+xml;utf8,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800">` +
			`<rect width="600" height="800" fill="${color}"/>` +
			`<text x="300" y="420" font-family="ui-sans-serif,system-ui" font-size="160" font-weight="700" text-anchor="middle" fill="#1f2937">${n}</text>` +
			`</svg>`,
	)}`

const samplePages: PdfViewerPage[] = Array.from({ length: 8 }, (_, index) => ({
	id: index,
	src: placeholderPage(index + 1, PAGE_PALETTE[index % PAGE_PALETTE.length] ?? '#f4f4f5'),
	label: `Page ${index + 1}`,
}))

function Default() {
	return (
		<Example
			title="Default"
			code={code`
				import { PdfViewer } from 'ui/pdf-viewer'

				<PdfViewer pages={pages} />
			`}
		>
			<PdfViewer pages={samplePages} />
		</Example>
	)
}

function Controlled() {
	const [page, setPage] = useState(3)

	return (
		<Example
			title="Controlled page"
			code={code`
				import { PdfViewer } from 'ui/pdf-viewer'

				const [page, setPage] = useState(3)

				<PdfViewer pages={pages} page={page} onPageChange={setPage} />
			`}
		>
			<Stack gap={2}>
				<Text>Current page: {page}</Text>
				<PdfViewer pages={samplePages} page={page} onPageChange={setPage} />
			</Stack>
		</Example>
	)
}

function WithSource() {
	return (
		<Example
			title="Download and print"
			code={code`
				import { PdfViewer } from 'ui/pdf-viewer'

				<PdfViewer pages={pages} src="/sample.pdf" filename="sample.pdf" />
			`}
		>
			<PdfViewer
				pages={samplePages}
				src="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
				filename="dummy.pdf"
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
		<Stack gap={6}>
			<Default />
			<Controlled />
			<WithSource />
			<Empty />
		</Stack>
	)
}
