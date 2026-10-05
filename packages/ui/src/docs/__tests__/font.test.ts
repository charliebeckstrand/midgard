// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { inlineFont } from '../plugin/font.ts'

// A stand-in for the script that `pnpm fonts` writes.
const SCRIPT = '(() => { const latin = 1 })()\n'

let clientDir = ''

/** A built client with the script of the latin face and two pages. */
function buildClient(script: string) {
	clientDir = mkdtempSync(path.join(tmpdir(), 'docs-font-'))

	mkdirSync(path.join(clientDir, 'button'))

	writeFileSync(path.join(clientDir, 'latin.js'), script)

	for (const page of ['index.html', 'button/index.html']) {
		writeFileSync(
			path.join(clientDir, page),
			'<html><head><title>Docs</title></head><body></body></html>',
		)
	}
}

afterEach(() => {
	rmSync(clientDir, { recursive: true, force: true })
})

describe('inlineFont', () => {
	it.each(['index.html', 'button/index.html'])(
		'writes the script of the latin face at the end of the head of %s',
		(page) => {
			buildClient(SCRIPT)

			inlineFont(clientDir, path.join(clientDir, 'latin.js'))

			expect(readFileSync(path.join(clientDir, page), 'utf8')).toBe(
				`<html><head><title>Docs</title><script>${SCRIPT}</script></head><body></body></html>`,
			)
		},
	)

	it('fails when the script can close its <script>', () => {
		buildClient(`${SCRIPT}// </script>\n`)

		expect(() => inlineFont(clientDir, path.join(clientDir, 'latin.js'))).toThrow(
			'can close its <script>',
		)
	})
})
