/**
 * The wasm decoders that the worker asks for: JPEG 2000 (`openjpeg.wasm`), and JBIG2 and CCITT
 * fax (`jbig2.wasm`).
 *
 * @remarks pdf.js joins a base URL for each kind of file and the file name. A bundler emits
 * files, not directories, so no base URL is correct here. Each file is therefore a
 * `new URL(…, import.meta.url)` of its own, the form that the worker URL in
 * `use-pdf-viewer-document.ts` uses. Bundlers emit that form as an asset. A glob or a template
 * string in the URL is specific to one bundler. `pdf-viewer-binary-data-boundary.test.ts` holds
 * each list equal to `pdfjs-dist`.
 * @internal
 */
export const WASM_FILES: Record<string, URL> = {
	'jbig2.wasm': new URL('pdfjs-dist/wasm/jbig2.wasm', import.meta.url),
	'openjpeg.wasm': new URL('pdfjs-dist/wasm/openjpeg.wasm', import.meta.url),
}

/**
 * The standard fonts that pdf.js asks for: Symbol and ZapfDingbats, where a PDF names one and
 * does not embed it.
 *
 * @remarks `getDocument` keeps its default `useSystemFonts`, so a system font stands in for each
 * other standard font, and pdf.js asks for no other file of `standard_fonts`.
 * @internal
 */
export const STANDARD_FONT_FILES: Record<string, URL> = {
	'FoxitDingbats.pfb': new URL('pdfjs-dist/standard_fonts/FoxitDingbats.pfb', import.meta.url),
	'FoxitSymbol.pfb': new URL('pdfjs-dist/standard_fonts/FoxitSymbol.pfb', import.meta.url),
}

/**
 * The list of files of each kind, by the name of the kind in pdf.js.
 *
 * @remarks The CMaps are a module of their own, which loads only when a PDF asks for a CMap. Most
 * of them are smaller than 4 KB, and Vite inlines a file of that size in the module as a data
 * URL. In this module they would add about 48 KB of gzip to each document that opens.
 * @internal
 */
const FILES: Record<string, () => Promise<Record<string, URL>>> = {
	wasmUrl: async () => WASM_FILES,
	standardFontDataUrl: async () => STANDARD_FONT_FILES,
	cMapUrl: async () => (await import('./pdf-viewer-cmap-files')).CMAP_FILES,
}

/**
 * The `BinaryDataFactory` that `getDocument` gets: it fetches each file from its bundled URL.
 *
 * @remarks Without a factory and the base URLs, pdf.js fetches none of these files. A JPEG 2000,
 * JBIG2 or CCITT fax image then renders blank, a CJK font with a predefined CMap shows no text,
 * and a non-embedded Symbol or ZapfDingbats font shows other glyphs. A custom factory also turns
 * off the fetch in the worker, so each request comes to this main thread.
 * @internal
 */
export class PdfBinaryData {
	async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
		const url = (await FILES[kind]?.())?.[filename]

		if (!url) throw new Error(`No bundled pdf.js file for ${kind}: ${filename}`)

		const response = await fetch(url)

		if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`)

		return new Uint8Array(await response.arrayBuffer())
	}
}
