import type { PdfViewerHighlight, PdfViewerHighlightRect, PdfViewerPage } from 'ui/pdf-viewer'

/** The size of a stand-in page in pixels: US Letter at 96 dpi. */
const PAGE = { width: 816, height: 1056 }

/** One box of ink on a stand-in page, in pixels. */
type Ink = { x: number; y: number; width: number; height: number }

/** A ruled line at a fraction of the page height. */
function rule(offset: number): Ink {
	return { x: 80, y: offset * PAGE.height, width: 656, height: 14 }
}

// The pages and the regions use the same boxes, so each region is on its ink.
const TITLE: Ink = { x: 80, y: 72, width: 420, height: 26 }

const DATE: Ink = { x: 80, y: 120, width: 240, height: 16 }

const REMIT = rule(0.18)

const TOTAL = rule(0.42)

const RULES = [REMIT, rule(0.3), TOTAL, rule(0.54), rule(0.66)]

/** A box as fractions of the page, which is the unit of `highlights`. */
function fraction({ x, y, width, height }: Ink): PdfViewerHighlightRect {
	return {
		x: x / PAGE.width,
		y: y / PAGE.height,
		width: width / PAGE.width,
		height: height / PAGE.height,
	}
}

function paint({ x, y, width, height }: Ink, fill: string) {
	return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" />`
}

function page(label: string): PdfViewerPage {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.width}" height="${PAGE.height}">
		<rect width="${PAGE.width}" height="${PAGE.height}" fill="#ffffff" />
		${paint(TITLE, '#d4d4d8')}
		${paint(DATE, '#e4e4e7')}
		${RULES.map((ink) => paint(ink, '#e4e4e7')).join('')}
		<text x="80" y="1010" font-family="sans-serif" font-size="16" fill="#a1a1aa">${label}</text>
	</svg>`

	return {
		id: label,
		src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
		label,
		width: PAGE.width,
		height: PAGE.height,
		pointWidth: 612,
		pointHeight: 792,
	}
}

export const pages = [page('Page 1'), page('Page 2')]

export const regions: PdfViewerHighlight[] = [
	{ id: 'title', page: 1, rect: fraction(TITLE), label: 'Invoice number' },
	{ id: 'date', page: 1, rect: fraction(DATE), label: 'Invoice date' },
	{ id: 'total', page: 1, rect: fraction(TOTAL), label: 'Total charges', color: 'red' },
	{ id: 'remit', page: 2, rect: fraction(REMIT), label: 'Remit to', color: 'blue' },
]
