import { useState } from 'react'
import { Button } from '../../../components/button'
import {
	PdfViewer,
	type PdfViewerHighlight,
	type PdfViewerPage,
} from '../../../components/pdf-viewer'
import { code, Example } from '../../engine'

const SAMPLE = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'

/**
 * A stand-in page: US Letter at 96 dpi, with a few ruled lines so the regions have
 * something to sit over.
 *
 * Static images rather than more `src` examples: every `src` viewer refetches and rasterizes
 * every page to a PNG, and the overlay is indifferent to where the image came from. One
 * rasterizing example on the page is enough. (The pdf.js worker itself is shared, so it is
 * the rasterization that costs, not the thread.)
 */
function page(label: string): PdfViewerPage {
	const rules = [0.18, 0.3, 0.42, 0.54, 0.66]
		.map((y) => `<rect x="80" y="${y * 1056}" width="656" height="14" fill="#e4e4e7" />`)
		.join('')

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="816" height="1056">
		<rect width="816" height="1056" fill="#ffffff" />
		<rect x="80" y="72" width="420" height="26" fill="#d4d4d8" />
		<rect x="80" y="120" width="240" height="16" fill="#e4e4e7" />
		${rules}
		<text x="80" y="1010" font-family="sans-serif" font-size="16" fill="#a1a1aa">${label}</text>
	</svg>`

	return {
		id: label,
		src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
		label,
		width: 816,
		height: 1056,
		// US Letter: 8.5 × 11in at 72pt to the inch. Lets `highlightUnit="inch"` work here too.
		pointWidth: 612,
		pointHeight: 792,
	}
}

const pages = [page('Page 1'), page('Page 2')]

// Fractions of the page, which is what the viewer wants and what a producer of physical
// coordinates converts to via `highlightUnit`.
const regions: PdfViewerHighlight[] = [
	{
		id: 'title',
		page: 1,
		rect: { x: 0.098, y: 0.068, width: 0.515, height: 0.025 },
		label: 'Invoice number',
	},
	{
		id: 'date',
		page: 1,
		rect: { x: 0.098, y: 0.114, width: 0.294, height: 0.015 },
		label: 'Invoice date',
	},
	{
		id: 'total',
		page: 1,
		rect: { x: 0.098, y: 0.417, width: 0.804, height: 0.013 },
		label: 'Total charges',
		color: 'red',
	},
	{
		id: 'remit',
		page: 2,
		rect: { x: 0.098, y: 0.176, width: 0.804, height: 0.013 },
		label: 'Remit to',
		color: 'blue',
	},
]

function DefaultExample() {
	return (
		<Example
			title="Default"
			code={code`
				import { PdfViewer } from 'ui/pdf-viewer'

				<PdfViewer src="/sample.pdf" filename="sample.pdf" />
			`}
		>
			<PdfViewer src={SAMPLE} filename="tracemonkey.pdf" />
		</Example>
	)
}

function HighlightsExample() {
	const [active, setActive] = useState<string | null>(null)

	const label = regions.find((region) => region.id === active)?.label

	return (
		<Example
			title="Highlights"
			footer={label ? `Selected: ${label}` : undefined}
			code={code`
				const regions = [
					{ id: 'total', page: 1, rect: { x: 0.098, y: 0.417, width: 0.804, height: 0.013 }, label: 'Total charges', color: 'red' },
				]

				<PdfViewer pages={pages} highlights={regions} onActiveHighlightChange={setActive} />
			`}
		>
			<PdfViewer pages={pages} highlights={regions} onActiveHighlightChange={setActive} />
		</Example>
	)
}

function DrivenExample() {
	const [active, setActive] = useState<string | null>('remit')

	return (
		<Example
			title="Driven from a list"
			code={code`
				const [active, setActive] = useState<string | null>('remit')

				<PdfViewer
					pages={pages}
					highlights={regions}
					activeHighlightId={active}
					onActiveHighlightChange={setActive}
				/>
			`}
		>
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap gap-2">
					{regions.map((region) => (
						<Button
							key={region.id}
							variant={active === region.id ? 'solid' : 'outline'}
							onClick={() => setActive(region.id)}
						>
							{region.label}
						</Button>
					))}
				</div>
				<PdfViewer
					pages={pages}
					highlights={regions}
					activeHighlightId={active}
					onActiveHighlightChange={setActive}
				/>
			</div>
		</Example>
	)
}

function FitWidthExample() {
	return (
		<Example
			title="Fit to width"
			code={code`
				<PdfViewer pages={pages} fit="width" className="h-96" />
			`}
		>
			<PdfViewer pages={pages} fit="width" className="h-96" />
		</Example>
	)
}

function MagnifierExample() {
	return (
		<Example
			title="Magnifier"
			code={code`
				<PdfViewer pages={pages} magnifier />

				{/* or, with the power, the lens size and the dwell set */}
				<PdfViewer pages={pages} magnifier={{ zoom: 4, size: 240, delay: 150 }} />
			`}
		>
			<PdfViewer pages={pages} magnifier />
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
			<HighlightsExample />
			<DrivenExample />
			<FitWidthExample />
			<MagnifierExample />
			<EmptyExample />
		</>
	)
}
