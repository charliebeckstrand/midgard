// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STANDARD_FONT_FILES, WASM_FILES } from '../../components/pdf-viewer/pdf-viewer-binary-data'
import { CMAP_FILES } from '../../components/pdf-viewer/pdf-viewer-cmap-files'

// The viewer gives pdf.js a URL for each file that pdf.js loads at run time. A new version of
// `pdfjs-dist` can add, remove or rename a file. Then pdf.js asks for a file that has no URL,
// and the image or the text that needs it does not render. These cases hold the map equal to
// the package.

/** The root directory of the installed `pdfjs-dist`. */
const PDFJS = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))

/** The files of `directory` in `pdfjs-dist` whose names match `pattern`, sorted. */
function filesOf(directory: string, pattern: RegExp): string[] {
	return readdirSync(join(PDFJS, directory))
		.filter((name) => pattern.test(name))
		.sort()
}

describe('the bundled pdf.js files', () => {
	it('has each wasm decoder that the worker loads', () => {
		const worker = readFileSync(join(PDFJS, 'legacy/build/pdf.worker.mjs'), 'utf8')

		const decoders = [...worker.matchAll(/\b_filename = "([^"]+\.wasm)"/g)].map(([, name]) => name)

		expect(Object.keys(WASM_FILES).sort()).toEqual(decoders.sort())
	})

	it('has each standard font that the worker loads beside the system fonts', () => {
		const worker = readFileSync(join(PDFJS, 'legacy/build/pdf.worker.mjs'), 'utf8')

		// The worker skips each other standard font when `useSystemFonts` is on, its default.
		expect(worker).toContain(
			'if (this.options.useSystemFonts && name !== "Symbol" && name !== "ZapfDingbats")',
		)

		const files = [...worker.matchAll(/\bt\.(?:Symbol|ZapfDingbats) = "([^"]+\.pfb)"/g)].map(
			([, name]) => name,
		)

		expect(Object.keys(STANDARD_FONT_FILES).sort()).toEqual(files.sort())
	})

	it('has each packed CMap', () => {
		expect(Object.keys(CMAP_FILES).sort()).toEqual(filesOf('cmaps', /\.bcmap$/))
	})

	it('points each file name at the same file in its directory', () => {
		const lists = { wasm: WASM_FILES, standard_fonts: STANDARD_FONT_FILES, cmaps: CMAP_FILES }

		for (const [directory, files] of Object.entries(lists)) {
			for (const [name, url] of Object.entries(files)) {
				expect(url.href).toMatch(new RegExp(`/pdfjs-dist/${directory}/${name}$`))
			}
		}
	})
})
