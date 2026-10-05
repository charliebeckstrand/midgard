import { globSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** A `@font-face` rule of a minified stylesheet. The rule holds no nested block. */
export const FONT_FACE = /@font-face\{[^}]*\}/g

/** The text of the built copy of `stylesheet` in `clientDir`. */
export function builtStylesheet(clientDir: string, stylesheet: string): string {
	const [built, ...others] = globSync(`assets/${path.basename(stylesheet, '.css')}-*.css`, {
		cwd: clientDir,
	})

	if (!built || others.length > 0) throw new Error(`docs: no single built copy of ${stylesheet}`)

	return readFileSync(path.join(clientDir, built), 'utf8')
}
