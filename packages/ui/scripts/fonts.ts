/**
 * Writes `src/fonts/fonts.css`, the font faces of ui, from the font file.
 *
 * Run `pnpm fonts` after a change to the font file. The script formats the
 * stylesheet with Biome. The test `fonts-boundary.test.ts` compares the
 * stylesheet with the output of {@link fontsCss}, and it ignores white space.
 * A stylesheet that does not agree with the font thus fails.
 *
 * Capsize reads the metrics of the font: the ascent, the descent, the line
 * gap, and the average width of the letters by their frequency in text. It
 * then gives a fallback face for each system font, with overrides that give
 * the system font the same metrics. Text in a fallback face thus takes the
 * same space as text in the font, and the swap to the font moves no layout.
 * Arial is on Apple and Windows devices, and Roboto is on Android devices.
 */

import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createFontStack } from '@capsizecss/core'
import arial from '@capsizecss/metrics/arial'
import roboto from '@capsizecss/metrics/roboto'
import { fromFile } from '@capsizecss/unpack/fs'

/** The font file, beside the stylesheet. */
const FONT_FILE = 'google-sans-flex.woff2'

const FONT_DIR = new URL('../src/fonts/', import.meta.url)

/** The path of the stylesheet that {@link fontsCss} gives. */
export const FONTS_CSS = fileURLToPath(new URL('fonts.css', FONT_DIR))

/** Writes one CSS declaration block. */
function block(selector: string, declarations: Record<string, string>) {
	const lines = Object.entries(declarations).map(([property, value]) => `\t${property}: ${value};`)

	return `${selector} {\n${lines.join('\n')}\n}\n`
}

/** Writes a family list with single quotes, as Biome does. */
function quote(families: string) {
	return families.replaceAll('"', "'")
}

/** Returns the text of `src/fonts/fonts.css`. */
export async function fontsCss(): Promise<string> {
	const metrics = await fromFile(fileURLToPath(new URL(FONT_FILE, FONT_DIR)))

	const { fontFamily, fontFaces } = createFontStack([metrics, arial, roboto], {
		fontFaceFormat: 'styleObject',
	})

	const fallbacks = fontFaces.map(({ '@font-face': face }) =>
		block('@font-face', {
			'font-family': quote(face.fontFamily ?? ''),
			src: quote(face.src ?? ''),
			...(face.ascentOverride && { 'ascent-override': face.ascentOverride }),
			...(face.descentOverride && { 'descent-override': face.descentOverride }),
			...(face.lineGapOverride && { 'line-gap-override': face.lineGapOverride }),
			...(face.sizeAdjust && { 'size-adjust': face.sizeAdjust }),
		}),
	)

	return [
		'/* Do not edit. `pnpm fonts` (`scripts/fonts.ts`) writes this file from the font file. */\n',
		block('@font-face', {
			'font-family': `'${metrics.familyName}'`,
			'font-weight': '100 1000',
			'font-display': 'swap',
			src: `url('./${FONT_FILE}') format('woff2-variations')`,
		}),
		...fallbacks,
		block('@theme', { '--font-sans': `${quote(fontFamily)}, sans-serif` }),
	].join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await writeFile(FONTS_CSS, await fontsCss())

	execFileSync('biome', ['format', '--write', FONTS_CSS], { stdio: 'inherit' })
}
