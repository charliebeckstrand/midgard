// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it } from 'vitest'
import { inlineFont } from '../plugin/font.ts'

const LATIN = Buffer.from([0x77, 0x4f, 0x46, 0x32, 1, 2, 3])

const OTHER = Buffer.from([0x77, 0x4f, 0x46, 0x32, 4, 5, 6])

const FACES = [
	'@font-face{font-family:Google Sans Flex;font-weight:300 900;font-display:block;src:url(/assets/other-b.woff2)format("woff2-variations");unicode-range:U+100-17F}',
	'@font-face{font-family:Google Sans Flex;font-weight:300 900;font-display:block;src:url(/assets/latin-a.woff2)format("woff2-variations");unicode-range:U+D,U+20-7E}',
].join('')

let clientDir = ''

/** A built client with the stylesheet, two font files, and two pages. */
function buildClient() {
	clientDir = mkdtempSync(path.join(tmpdir(), 'docs-font-'))

	mkdirSync(path.join(clientDir, 'assets'))

	mkdirSync(path.join(clientDir, 'button'))

	writeFileSync(path.join(clientDir, 'assets', 'app-x1.css'), `${FACES}body{margin:0}`)

	writeFileSync(path.join(clientDir, 'assets', 'latin-a.woff2'), LATIN)

	writeFileSync(path.join(clientDir, 'assets', 'other-b.woff2'), OTHER)

	writeFileSync(path.join(clientDir, 'latin.woff2'), LATIN)

	for (const page of ['index.html', 'button/index.html']) {
		writeFileSync(
			path.join(clientDir, page),
			'<html><head><title>Docs</title></head><body></body></html>',
		)
	}
}

/** Runs the script of a page, and returns each face that it adds. */
function runScript(page: string) {
	const html = readFileSync(path.join(clientDir, page), 'utf8')

	const code = /<script>(.*)<\/script><\/head>/.exec(html)?.[1] ?? ''

	const added: { family: string; bytes: number[]; descriptors: object }[] = []

	runInNewContext(code, {
		atob,
		Uint8Array,
		FontFace: class {
			constructor(family: string, source: Uint8Array, descriptors: object) {
				added.push({ family, bytes: Array.from(source), descriptors })
			}
		},
		document: { fonts: { add: () => undefined } },
	})

	return added
}

afterEach(() => {
	rmSync(clientDir, { recursive: true, force: true })
})

describe('inlineFont', () => {
	it.each(['index.html', 'button/index.html'])(
		'adds the face of the font from its bytes in %s',
		(page) => {
			buildClient()

			inlineFont(clientDir, 'app.css', path.join(clientDir, 'latin.woff2'))

			expect(runScript(page)).toEqual([
				{
					family: 'Google Sans Flex',
					bytes: Array.from(LATIN),
					descriptors: { weight: '300 900', display: 'block', unicodeRange: 'U+D,U+20-7E' },
				},
			])
		},
	)

	it('fails when no face of the stylesheet has the bytes of the font', () => {
		buildClient()

		writeFileSync(path.join(clientDir, 'missing.woff2'), Buffer.from([9, 9, 9]))

		expect(() => inlineFont(clientDir, 'app.css', path.join(clientDir, 'missing.woff2'))).toThrow(
			'no single font face',
		)
	})
})
