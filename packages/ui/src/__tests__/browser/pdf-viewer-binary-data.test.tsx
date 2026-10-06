import { afterEach, describe, expect, it } from 'vitest'
import { servePdf } from '../../__benchmarks__/browser/pdf-fixtures'
import { PdfViewer } from '../../components/pdf-viewer'
import { resetDocumentCache } from '../../components/pdf-viewer/pdf-viewer-document-cache'
import { bySlot, renderUI, waitFor } from '../helpers'
import { budget } from './helpers/wall-clock'

/** A black 16 × 16 image in JPEG 2000, which pdf.js decodes with `openjpeg.wasm`. */
const JPX =
	'AAAADGpQICANCocKAAAAFGZ0eXBqcDIgAAAAAGpwMiAAAAAtanAyaAAAABZpaGRyAAAAEAAAABAAAQcHAAAAAAAPY29scgEAAAAAABEAAACUanAyY/9P/1EAKQAAAAAAEAAAABAAAAAAAAAAAAAAABAAAAAQAAAAAAAAAAAAAQcBAf9SAAwAAAABAAQEBAAB/1wAEEBASEhQSEhQSEhQSEhQ/2QAJQABQ3JlYXRlZCBieSBPcGVuSlBFRyB2ZXJzaW9uIDIuNS40/5AACgAAAAAAFgAB/5PfgAgHgICAgP/Z'

/** A black 16 × 16 image in CCITT group 4 fax, which pdf.js decodes with `jbig2.wasm`. */
const CCITT = 'JqC/////4AIAIA=='

/** The page draws its one resource, `/R`, over the whole 200 × 200 point page. */
const IMAGE_CONTENT = 'q 200 0 0 200 0 0 cm /R Do Q'

/** The page writes "AB" in a font that only the predefined CMap `UniJIS-UCS2-H` decodes. */
const CMAP_CONTENT = 'BT /R 120 Tf 10 50 Td <00410042> Tj ET'

/**
 * Builds a one-page PDF of 200 × 200 points that draws `content` with the resource `/R`.
 *
 * @param resource - The resource dictionary that holds `/R`, with its references to the objects
 * from 5 on.
 * @param objects - Object 5 and the objects after it, each with a stream as its `stream`.
 */
function makePdf(
	resource: string,
	content: string,
	objects: { dictionary: string; stream?: Uint8Array }[],
): Uint8Array {
	const encoder = new TextEncoder()

	const bodies: { dictionary: string; stream?: Uint8Array }[] = [
		{ dictionary: '<< /Type /Catalog /Pages 2 0 R >>' },
		{ dictionary: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
		{
			dictionary: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources ${resource} /Contents 4 0 R >>`,
		},
		{ dictionary: '<< >>', stream: encoder.encode(content) },
		...objects,
	]

	const parts: Uint8Array[] = []

	const offsets: number[] = []

	let length = 0

	const write = (part: Uint8Array | string) => {
		const bytes = typeof part === 'string' ? encoder.encode(part) : part

		parts.push(bytes)

		length += bytes.length
	}

	write('%PDF-1.7\n')

	bodies.forEach(({ dictionary, stream }, index) => {
		offsets.push(length)

		if (!stream) {
			write(`${index + 1} 0 obj\n${dictionary}\nendobj\n`)

			return
		}

		write(
			`${index + 1} 0 obj\n${dictionary.replace(/>>$/, `/Length ${stream.length} >>`)}\nstream\n`,
		)
		write(stream)
		write('\nendstream\nendobj\n')
	})

	const xref = length

	write(`xref\n0 ${bodies.length + 1}\n0000000000 65535 f \n`)

	for (const offset of offsets) write(`${String(offset).padStart(10, '0')} 00000 n \n`)

	write(`trailer\n<< /Size ${bodies.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

	const bytes = new Uint8Array(length)

	let at = 0

	for (const part of parts) {
		bytes.set(part, at)

		at += part.length
	}

	return bytes
}

/** A PDF whose page is one 16 × 16 image, encoded with `filter`. */
function makeImagePdf(filter: string, base64: string): Uint8Array {
	return makePdf('<< /XObject << /R 5 0 R >> >>', IMAGE_CONTENT, [
		{
			dictionary: `<< /Type /XObject /Subtype /Image /Width 16 /Height 16 ${filter} >>`,
			stream: Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)),
		},
	])
}

/** A PDF whose page shows text in a non-embedded CID font with a predefined CMap. */
function makeCMapPdf(): Uint8Array {
	return makePdf('<< /Font << /R 5 0 R >> >>', CMAP_CONTENT, [
		{
			dictionary:
				'<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UCS2-H /DescendantFonts [6 0 R] >>',
		},
		{
			dictionary:
				'<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 2 >> /FontDescriptor 7 0 R >>',
		},
		{
			dictionary:
				'<< /Type /FontDescriptor /FontName /HeiseiKakuGo-W5 /Flags 4 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>',
		},
	])
}

/**
 * Renders `bytes` in the viewer and counts the dark pixels of its first page.
 *
 * @returns The share of the pixels of the page that are dark, from 0 to 1.
 */
async function inkOf(bytes: Uint8Array): Promise<number> {
	const src = servePdf(bytes)

	const { container } = renderUI(
		<div style={{ width: 400, height: 400 }}>
			<PdfViewer src={src} fit="page" aria-label="Scan" />
		</div>,
	)

	const canvas = await waitFor(
		() => {
			const found = bySlot(container, 'pdf-viewer-viewport')?.querySelector<HTMLCanvasElement>(
				'canvas[data-slot="pdf-viewer-page-image"]',
			)

			expect(found?.width).toBeGreaterThan(0)

			return found as HTMLCanvasElement
		},
		{ timeout: budget(10_000) },
	)

	const { data } = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height) ?? {
		data: new Uint8ClampedArray(),
	}

	let dark = 0

	for (let index = 0; index < data.length; index += 4) {
		if ((data[index] ?? 255) < 128) dark++
	}

	URL.revokeObjectURL(src)

	return dark / (data.length / 4)
}

/**
 * The viewer gives pdf.js the files that it loads at run time.
 *
 * pdf.js decodes JPEG 2000 with `openjpeg.wasm`, and JBIG2 and CCITT fax with `jbig2.wasm`. It
 * reads a predefined CMap from a `.bcmap` file. Without these files, the image of a scan renders
 * blank, and the text in such a font does not render. Each page here is dark only when its file
 * loads.
 */
describe('pdf viewer binary data (real browser)', () => {
	afterEach(() => resetDocumentCache())

	it('renders a JPEG 2000 image', { timeout: budget(15_000) }, async () => {
		expect(await inkOf(makeImagePdf('/Filter /JPXDecode', JPX))).toBeGreaterThan(0.9)
	})

	it('renders a CCITT fax image', { timeout: budget(15_000) }, async () => {
		const ink = await inkOf(
			makeImagePdf(
				'/BitsPerComponent 1 /ColorSpace /DeviceGray /Filter /CCITTFaxDecode /DecodeParms << /K -1 /Columns 16 /Rows 16 >>',
				CCITT,
			),
		)

		expect(ink).toBeGreaterThan(0.9)
	})

	it('renders text in a font with a predefined CMap', { timeout: budget(15_000) }, async () => {
		expect(await inkOf(makeCMapPdf())).toBeGreaterThan(0.01)
	})
})
