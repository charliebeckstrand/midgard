import { useState } from 'react'
import { Button } from '../../../components/button'
import {
	PdfViewer,
	type PdfViewerHighlight,
	type PdfViewerHighlightRect,
	type PdfViewerPage,
} from '../../../components/pdf-viewer'
import { code, Example } from '../../engine'

const SAMPLE = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'

/** The stand-in page's own pixel space: US Letter at 96 dpi. */
const PAGE = { width: 816, height: 1056 }

/** One box of ink on the stand-in page, in {@link PAGE}'s pixel space. */
type Ink = { x: number; y: number; width: number; height: number }

/** A ruled line, placed by how far down the page it sits. */
function rule(offset: number): Ink {
	return { x: 80, y: offset * PAGE.height, width: 656, height: 14 }
}

const TITLE: Ink = { x: 80, y: 72, width: 420, height: 26 }

const DATE: Ink = { x: 80, y: 120, width: 240, height: 16 }

/*
 * The two rules that a region marks. Named, not indexed out of `RULES`.
 *
 * The page and the regions read the same constant, because the demo has to show that a
 * region lands on the ink it names. Hand-written fractions did not do that. The demo boxed
 * these two rules at 0.417 and 0.176, but their ink sits at 0.42 and 0.18. Each highlight
 * sat a quarter of its own height above its line. That looks like an imprecise viewer, and
 * the cause was the data.
 */
const TOTAL = rule(0.42)

const REMIT = rule(0.18)

const RULES = [REMIT, rule(0.3), TOTAL, rule(0.54), rule(0.66)]

/** The same box as fractions of the page, which is the unit `highlights` takes. */
function fraction({ x, y, width, height }: Ink): PdfViewerHighlightRect {
	return {
		x: x / PAGE.width,
		y: y / PAGE.height,
		width: width / PAGE.width,
		height: height / PAGE.height,
	}
}

/** The same box as one `<rect>` of the page's SVG. */
function paint({ x, y, width, height }: Ink, fill: string) {
	return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" />`
}

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
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.width}" height="${PAGE.height}">
		<rect width="${PAGE.width}" height="${PAGE.height}" fill="#ffffff" />
		${paint(TITLE, '#d4d4d8')}
		${paint(DATE, '#e4e4e7')}
		${RULES.map((r) => paint(r, '#e4e4e7')).join('')}
		<text x="80" y="1010" font-family="sans-serif" font-size="16" fill="#a1a1aa">${label}</text>
	</svg>`

	return {
		id: label,
		src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
		label,
		width: PAGE.width,
		height: PAGE.height,
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
		rect: fraction(TITLE),
		label: 'Invoice number',
	},
	{
		id: 'date',
		page: 1,
		rect: fraction(DATE),
		label: 'Invoice date',
	},
	{
		id: 'total',
		page: 1,
		rect: fraction(TOTAL),
		label: 'Total charges',
		color: 'red',
	},
	{
		id: 'remit',
		page: 2,
		rect: fraction(REMIT),
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
					{ id: 'total', page: 1, rect: { x: 0.098, y: 0.42, width: 0.804, height: 0.013 }, label: 'Total charges', color: 'red' },
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
