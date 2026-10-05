import { globSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Writes the script of the latin face (`src/fonts/google-sans-flex-latin.js`)
 * into the head of each prerendered page.
 *
 * `pnpm fonts` writes the script, and the script is the one source of the
 * latin face: the stylesheet has no latin face. The faces use
 * `font-display: block`, so text does not paint until its face loads. A
 * `FontFace` that a script makes from bytes loads before the script ends, so
 * the face is ready before the first layout. In the page, the script needs no
 * download of its own.
 */
export function inlineFont(clientDir: string, script: string): void {
	const code = readFileSync(script, 'utf8')

	if (code.includes('</')) throw new Error(`docs: ${path.basename(script)} can close its <script>`)

	for (const page of globSync('**/*.html', { cwd: clientDir })) {
		const file = path.join(clientDir, page)

		writeFileSync(
			file,
			readFileSync(file, 'utf8').replace('</head>', () => `<script>${code}</script></head>`),
		)
	}
}
