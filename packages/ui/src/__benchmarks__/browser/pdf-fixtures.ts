/**
 * Deterministic PDF documents for the PDF viewer benches, built in memory.
 *
 * Each page is a US-Letter invoice: a header block, a table of 40 line items
 * in Helvetica, and the rules between them. That is the text density and the
 * vector content of the carrier invoice that the viewer serves, so pdf.js does
 * real font and path work on each page. The file needs no fixture on disk and
 * no network.
 */

/** Makes one line of the content stream that writes `text` at (`x`, `y`) in points. */
function text(x: number, y: number, size: number, value: string) {
	return `BT /F1 ${size} Tf ${x} ${y} Td (${value}) Tj ET`
}

/** Makes the content stream of one invoice page. */
function invoicePage(pageNumber: number, pageCount: number) {
	const lines: string[] = [
		'0.2 w 0.5 G',
		text(54, 740, 20, 'INVOICE'),
		text(54, 716, 10, `Carrier Freight Services  -  Page ${pageNumber} of ${pageCount}`),
		text(400, 740, 10, `Invoice No. 2026-${String(pageNumber).padStart(5, '0')}`),
		text(400, 726, 10, 'Date 2026-09-26'),
		'54 700 m 558 700 l S',
		text(54, 686, 9, 'Line'),
		text(90, 686, 9, 'Description'),
		text(360, 686, 9, 'Qty'),
		text(420, 686, 9, 'Rate'),
		text(500, 686, 9, 'Amount'),
	]

	for (let row = 0; row < 40; row++) {
		const y = 670 - row * 15

		const quantity = ((row * 7 + pageNumber) % 9) + 1

		const rate = ((row * 13 + pageNumber * 3) % 90) + 10

		lines.push(
			`54 ${y - 4} m 558 ${y - 4} l S`,
			text(54, y, 9, String(row + 1)),
			text(90, y, 9, `Linehaul segment ${row + 1}, lane ${(row * 31) % 97} to ${(row * 17) % 89}`),
			text(360, y, 9, String(quantity)),
			text(420, y, 9, `${rate}.00`),
			text(500, y, 9, `${quantity * rate}.00`),
		)
	}

	lines.push('54 60 504 20 re S', text(400, 66, 10, 'Total due on receipt'))

	return lines.join('\n')
}

/**
 * Builds a PDF of `pageCount` invoice pages.
 *
 * @returns The bytes of the file, with a correct cross-reference table.
 */
export function makeInvoicePdf(pageCount: number): Uint8Array {
	// Object 1 is the catalog, 2 the page tree, 3 the font. Each page takes two
	// objects: the page, then its content stream.
	const objects: string[] = []

	const kids: string[] = []

	objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
	objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

	for (let index = 0; index < pageCount; index++) {
		const pageId = 4 + index * 2

		const contentId = pageId + 1

		const stream = invoicePage(index + 1, pageCount)

		kids.push(`${pageId} 0 R`)

		objects[pageId] =
			`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
			`/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`

		objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
	}

	objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`

	let body = '%PDF-1.7\n'

	const offsets: number[] = []

	for (let id = 1; id < objects.length; id++) {
		offsets[id] = body.length

		body += `${id} 0 obj\n${objects[id]}\nendobj\n`
	}

	const xref = body.length

	body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`

	for (let id = 1; id < objects.length; id++) {
		body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
	}

	body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`

	// The file is ASCII only, so one character is one byte.
	return new TextEncoder().encode(body)
}

/**
 * Serves `bytes` at a blob URL, as a fetch of a remote file would get them.
 *
 * @returns The URL. The caller revokes it.
 */
export function servePdf(bytes: Uint8Array): string {
	return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
}

/**
 * Adds `getOrInsertComputed` to `Map` and `WeakMap` where the browser lacks it.
 *
 * pdf.js 6 calls it, and the Playwright Chromium (141) predates it. The worker
 * needs the same fill, so {@link polyfilledWorker} puts this source first
 * in the worker module.
 */
export const UPSERT_POLYFILL = `
for (const C of [Map, WeakMap]) {
	if (!C.prototype.getOrInsertComputed) {
		Object.defineProperty(C.prototype, 'getOrInsertComputed', {
			configurable: true,
			writable: true,
			value(key, compute) {
				if (this.has(key)) return this.get(key)
				const value = compute(key)
				this.set(key, value)
				return value
			},
		})
	}
	if (!C.prototype.getOrInsert) {
		Object.defineProperty(C.prototype, 'getOrInsert', {
			configurable: true,
			writable: true,
			value(key, value) {
				if (!this.has(key)) this.set(key, value)
				return this.get(key)
			},
		})
	}
}
`

/** Runs {@link UPSERT_POLYFILL} in this realm. */
export function polyfillUpsert() {
	new Function(UPSERT_POLYFILL)()
}

/**
 * Makes a module worker that runs {@link UPSERT_POLYFILL} and then the pdf.js
 * worker at `workerUrl`.
 *
 * @remarks Two static imports, not a fill followed by `await import()`. A
 * module worker takes no message until its module finishes, and pdf.js sends
 * its first request at once. A top-level `await` lets the request arrive before
 * the pdf.js handler exists, and the load then waits forever. Static imports
 * run in order, so the fill still comes first.
 */
export function polyfilledWorker(workerUrl: string): Worker {
	const fill = URL.createObjectURL(new Blob([UPSERT_POLYFILL], { type: 'text/javascript' }))

	const source = `import ${JSON.stringify(fill)}\nimport ${JSON.stringify(workerUrl)}\n`

	const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))

	return new Worker(url, { type: 'module' })
}
