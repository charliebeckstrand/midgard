/// <reference path="./subset-font.d.ts" />

/**
 * Writes the font files of ui and `src/fonts/fonts.css` from the source font.
 *
 * Run `pnpm fonts` after a change to the source font or to a setting in this
 * file. The script formats the stylesheet with Biome. The test
 * `fonts-boundary.test.ts` compares the font files and the stylesheet with the
 * output of this script. A font file or a stylesheet that does not agree with
 * the source font thus fails.
 *
 * The source font is outside `src`, so no app ships it. The script divides it
 * into subsets by script, as Google Fonts does. Each subset is a face of the
 * same family with a `unicode-range`. The browser thus downloads only the
 * subsets that the text of a page uses. Each subset keeps the weights from 300
 * to 900, the optical sizes from 10 to 18, and only the layout features that
 * ui uses.
 *
 * The script also writes `src/fonts/google-sans-flex-latin.js`, which adds the
 * face of the `latin` subset from its bytes. `FontScript` loads it before the
 * first paint (see {@link fontScript}).
 *
 * Capsize reads the metrics of the font: the ascent, the descent, the line
 * gap, and the average width of the letters by their frequency in text. It
 * then gives a fallback face for each system font, with overrides that give
 * the system font the same metrics. Text in a fallback face thus takes the
 * same space as text in the font, and the swap to the font moves no layout.
 * Arial is on Apple and Windows devices, and Roboto is on Android devices.
 *
 * The font faces use `font-display: block`. Text does not paint until the
 * font loads, for a maximum of 3 seconds. The `latin` subset is ready before
 * the first paint, so latin text does not wait. Safari does not apply the ascent,
 * descent, and line gap overrides, and it applies only `size-adjust`. With
 * `swap`, an iPhone thus paints text in Arial for a short time before the font
 * loads.
 */

import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createFontStack } from '@capsizecss/core'
import arial from '@capsizecss/metrics/arial'
import roboto from '@capsizecss/metrics/roboto'
import { fromFile } from '@capsizecss/unpack/fs'
import { create } from 'fontkitten'
import subsetFont from 'subset-font'

/** The name of the source font file, and the start of the name of each subset file. */
const FONT_NAME = 'google-sans-flex'

/** The source font. It is outside `src`, so no app ships it. */
export const SOURCE_FONT = fileURLToPath(new URL(`../fonts/${FONT_NAME}.woff2`, import.meta.url))

const FONT_DIR = new URL('../src/fonts/', import.meta.url)

/** The path of the stylesheet that {@link fontsCss} gives. */
export const FONTS_CSS = fileURLToPath(new URL('fonts.css', FONT_DIR))

/** The subset that {@link fontScript} adds before the first paint. */
const FIRST_SUBSET = 'latin'

/** The path of the script that {@link fontScript} gives. */
export const FONT_SCRIPT = fileURLToPath(new URL(`${FONT_NAME}-${FIRST_SUBSET}.js`, FONT_DIR))

/** The weights that ui and the apps use, from `font-light` to `font-black`. */
const WEIGHT = { min: 300, max: 900 }

/**
 * The optical sizes that the subsets keep. The browser sets the optical size
 * from the font size, in pixels, and holds it inside this range. The smallest
 * text of ui is 10 px, so text from 10 to 18 px renders as in the source font.
 * Larger text uses the design for 18 px. A line at 24 px is 0.4% wider, and
 * the largest text of ui, at 48 px, is about 2% wider. The cap removes the
 * large designs, so the subsets are about a third smaller.
 */
const OPTICAL_SIZE = { min: 10, max: 18 }

/**
 * The layout features that the subsets keep. A browser applies the first
 * seven to Latin text by default. The `tabular-nums` utility applies `tnum`.
 */
const FEATURES = ['ccmp', 'locl', 'mark', 'mkmk', 'calt', 'kern', 'liga', 'tnum']

/**
 * The script ranges of Google Fonts that the source font has code points in.
 * For a code point in two ranges, the browser tries the last face first, so
 * `latin` is last. The `symbols` subset holds each other code point.
 */
const SCRIPTS = {
	vietnamese:
		'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB',
	'latin-ext':
		'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
	latin:
		'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
}

/**
 * The combining marks, and the dotted circle that HarfBuzz shows under a mark
 * with no letter. Each script subset also holds the marks of the source font.
 * The browser renders a letter and its marks in one face, so text in the
 * decomposed form (NFD) keeps the font.
 */
const MARKS = 'U+0300-036F, U+25CC'

/** One font file of ui: a subset of the source font. */
export type FontSubset = {
	/** The name of the subset: `symbols` or a key of {@link SCRIPTS}. */
	name: string
	/** The name of the file, which the stylesheet uses. */
	file: string
	/** The path of the file. */
	path: string
	/** The code points of the source font that the subset holds, in ascending order. */
	codePoints: number[]
}

/** Returns the code points of the source font, in ascending order. */
export async function sourceCodePoints(): Promise<number[]> {
	const font = create(await readFile(SOURCE_FONT))

	if (font.isCollection) throw new Error(`${SOURCE_FONT} is a font collection, not one font.`)

	return font.characterSet.toSorted((a, b) => a - b)
}

/** Returns the code points of a `unicode-range` value. */
function rangeCodePoints(range: string): Set<number> {
	const codePoints = new Set<number>()

	for (const [, first = '', last = first] of range.matchAll(/U\+([\dA-F]+)(?:-([\dA-F]+))?/g)) {
		for (let point = Number.parseInt(first, 16); point <= Number.parseInt(last, 16); point++) {
			codePoints.add(point)
		}
	}

	return codePoints
}

/** Writes a `unicode-range` value for code points in ascending order. */
function unicodeRange(codePoints: readonly number[]) {
	const spans: { first: number; last: number }[] = []

	for (const point of codePoints) {
		const span = spans.at(-1)

		if (span && point === span.last + 1) span.last = point
		else spans.push({ first: point, last: point })
	}

	const hex = (point: number) => `U+${point.toString(16).toUpperCase().padStart(4, '0')}`

	return spans
		.map(({ first, last }) => (first === last ? hex(first) : `${hex(first)}-${hex(last).slice(2)}`))
		.join(', ')
}

/**
 * Returns the subsets of the source font, in the order of the faces in the
 * stylesheet. Each code point of the source font is in one subset or more.
 */
export async function fontSubsets(): Promise<FontSubset[]> {
	const codePoints = await sourceCodePoints()

	const scripts = Object.entries(SCRIPTS).map(([name, range]) => {
		const inRange = rangeCodePoints(`${range}, ${MARKS}`)

		return { name, codePoints: codePoints.filter((point) => inRange.has(point)) }
	})

	const inScripts = new Set(scripts.flatMap((script) => script.codePoints))

	const symbols = {
		name: 'symbols',
		codePoints: codePoints.filter((point) => !inScripts.has(point)),
	}

	return [symbols, ...scripts]
		.filter((subset) => subset.codePoints.length > 0)
		.map((subset) => {
			const file = `${FONT_NAME}-${subset.name}.woff2`

			return { ...subset, file, path: fileURLToPath(new URL(file, FONT_DIR)) }
		})
}

/** Returns the bytes of the font file of a subset. */
export async function subsetBytes(subset: FontSubset): Promise<Buffer> {
	return subsetFont(await readFile(SOURCE_FONT), String.fromCodePoint(...subset.codePoints), {
		targetFormat: 'woff2',
		keepFeatures: FEATURES,
		variationAxes: { wght: WEIGHT, opsz: OPTICAL_SIZE },
	})
}

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
	const metrics = await fromFile(SOURCE_FONT)

	const { fontFamily, fontFaces } = createFontStack([metrics, arial, roboto], {
		fontFaceFormat: 'styleObject',
	})

	const faces = (await fontSubsets()).map((subset) =>
		block('@font-face', {
			'font-family': `'${metrics.familyName}'`,
			'font-weight': `${WEIGHT.min} ${WEIGHT.max}`,
			'font-display': 'block',
			src: `url('./${subset.file}') format('woff2-variations')`,
			'unicode-range': unicodeRange(subset.codePoints),
		}),
	)

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
		'/* Do not edit. `pnpm fonts` (`scripts/fonts.ts`) writes this file from the source font. */\n',
		...faces,
		...fallbacks,
		block('@theme', { '--font-sans': `${quote(fontFamily)}, sans-serif` }),
	].join('\n')
}

/**
 * Returns the text of the script that adds the face of the `latin` subset,
 * with the descriptors of its face in the stylesheet.
 *
 * The faces use `font-display: block`, so text does not paint until its
 * subset loads. A page can paint before the font file loads, and that paint
 * then shows the layout with no text. The script holds the bytes of the
 * subset. A `FontFace` made from bytes is ready when the constructor returns,
 * so the face is ready before the next layout. The browser uses a face from a
 * script before a face of a stylesheet with the same descriptors, so it does
 * not download the font file of the subset.
 */
export async function fontScript(): Promise<string> {
	const subset = (await fontSubsets()).find(({ name }) => name === FIRST_SUBSET)

	if (!subset) throw new Error(`The source font has no ${FIRST_SUBSET} subset.`)

	const descriptors = {
		weight: `${WEIGHT.min} ${WEIGHT.max}`,
		display: 'block',
		unicodeRange: unicodeRange(subset.codePoints),
	}

	const { familyName } = await fromFile(SOURCE_FONT)

	const base64 = (await readFile(subset.path)).toString('base64')

	return [
		'/* Do not edit. `pnpm fonts` (`scripts/fonts.ts`) writes this file from the source font. */',
		'(() => {',
		`\tconst text = atob('${base64}')`,
		'\tconst bytes = new Uint8Array(text.length)',
		'\tfor (let index = 0; index < text.length; index++) bytes[index] = text.charCodeAt(index)',
		`\tdocument.fonts.add(new FontFace('${familyName}', bytes, ${JSON.stringify(descriptors)}))`,
		'})()',
		'',
	].join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	for (const subset of await fontSubsets()) await writeFile(subset.path, await subsetBytes(subset))

	await writeFile(FONTS_CSS, await fontsCss())

	await writeFile(FONT_SCRIPT, await fontScript())

	execFileSync('biome', ['format', '--write', FONTS_CSS], { stdio: 'inherit' })
}
