/**
 * Writes the font files of ui and `src/fonts/fonts.css` from the source fonts.
 *
 * Run `pnpm fonts` after a change to a source font or to a setting in this
 * file. The script formats the stylesheet with Biome. The test
 * `fonts-boundary.test.ts` compares the font files and the stylesheet with the
 * output of this script. A font file or a stylesheet that does not agree with
 * the source fonts thus fails.
 *
 * ui has two families: Google Sans Flex for `font-sans` ({@link SANS}) and
 * Google Sans Code for `font-mono` ({@link MONO}). The source fonts are
 * outside `src`, so no app ships them. The script divides each source font
 * into subsets by script, as Google Fonts does. Each subset is a face of the
 * family with a `unicode-range`. The browser thus downloads only the subsets
 * that the text of a page uses, and it downloads no subset of a family that
 * the page does not use. Each subset keeps the weights and the optical sizes
 * of its family, and only the layout features that ui uses.
 *
 * Both families are under the SIL Open Font License 1.1. The license must go
 * with each copy of the font files. Each subset keeps the copyright notice,
 * the license description, and the license URL of its font as metadata
 * ({@link LICENSE_NAME_IDS}), so each copy that an app serves carries them.
 * `src/fonts/OFL.txt` holds the copyright notices and the full license next
 * to the font files. A new family adds its notice to that file.
 *
 * The script also writes `src/fonts/google-sans-flex-latin.js`, which adds the
 * face of the `latin` subset from its bytes. `AppearanceProvider` loads it
 * before the first paint (see {@link fontScript}). The stylesheet has no face
 * for the `latin` subset, so the script is the one source of that face.
 *
 * Capsize reads the metrics of a font: the ascent, the descent, the line
 * gap, and the average width of the letters by their frequency in text. It
 * then gives a fallback face for each system font, with overrides that give
 * the system font the same metrics. Text in a fallback face thus takes the
 * same space as text in the font, and the swap to the font moves no layout.
 * For the sans family, Arial is on Apple and Windows devices, and Roboto is on
 * Android devices. For the mono family, Courier New is on Apple and Windows
 * devices.
 *
 * The faces of the sans family use `font-display: block`. Text does not paint
 * until the font loads, for a maximum of 3 seconds. The `latin` subset is
 * ready before the first paint, so latin text does not wait. Safari does not
 * apply the ascent, descent, and line gap overrides, and it applies only
 * `size-adjust`. With `swap`, an iPhone thus paints text in Arial for a short
 * time before the font loads.
 *
 * The faces of the mono family use `font-display: swap`. No script adds a
 * mono face before the first paint, because most pages have no mono text.
 * Code thus paints at once in the fallback face, and the swap to the font
 * moves little, because the fallback face has the metrics of the font.
 */

import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createFontStack, type FontMetrics } from '@capsizecss/core'
import arial from '@capsizecss/metrics/arial'
import courierNew from '@capsizecss/metrics/courierNew'
import roboto from '@capsizecss/metrics/roboto'
import { fromFile } from '@capsizecss/unpack/fs'
import { create } from 'fontkitten'
import subsetFont from 'subset-font'

/** A range of an axis of a variable font. */
type Range = { min: number; max: number }

/** One family of ui, with the settings of its subsets. */
export type FontFamily = {
	/** The start of the name of the source font file and of each subset file. */
	name: string
	/** The path of the source font. It is outside `src`, so no app ships it. */
	source: string
	/** The theme variable of Tailwind that the font stack sets. */
	variable: '--font-sans' | '--font-mono'
	/** The generic family at the end of the font stack. */
	generic: 'sans-serif' | 'monospace'
	/** The weights that the subsets keep. */
	weight: Range
	/** The optical sizes that the subsets keep, for a font with an `opsz` axis. */
	opticalSize?: Range
	/** The `font-display` of the faces in the stylesheet. */
	display: 'block' | 'swap'
	/** The metrics of the system fonts that the fallback faces use. */
	fallbacks: FontMetrics[]
}

/** The folder of the source fonts. */
const SOURCE_DIR = new URL('../../fonts/', import.meta.url)

/**
 * The family of `font-sans`. The weights are those that ui and the apps use,
 * from `font-light` to `font-black`.
 *
 * The optical sizes: the browser sets the optical size from the font size, in
 * pixels, and holds it inside this range. The smallest text of ui is 10 px, so
 * text from 10 to 18 px renders as in the source font. Larger text uses the
 * design for 18 px. A line at 24 px is 0.4% wider, and the largest text of ui,
 * at 48 px, is about 2% wider. The cap removes the large designs, so the
 * subsets are about a third smaller.
 */
export const SANS: FontFamily = {
	name: 'google-sans-flex',
	source: fileURLToPath(new URL('google-sans-flex.woff2', SOURCE_DIR)),
	variable: '--font-sans',
	generic: 'sans-serif',
	weight: { min: 300, max: 900 },
	opticalSize: { min: 10, max: 18 },
	display: 'block',
	fallbacks: [arial, roboto],
}

/**
 * The family of `font-mono`. Code in ui uses the weights from `font-normal`
 * to `font-bold`, so the subsets keep only those. The `latin` subset is about
 * half the size of a subset with each weight of the source font.
 */
export const MONO: FontFamily = {
	name: 'google-sans-code',
	source: fileURLToPath(new URL('google-sans-code.ttf', SOURCE_DIR)),
	variable: '--font-mono',
	generic: 'monospace',
	weight: { min: 400, max: 700 },
	display: 'swap',
	fallbacks: [courierNew],
}

/** The families of ui, in the order of the stylesheet. */
export const FAMILIES = [SANS, MONO]

/** The folder of the files that the script writes. */
const OUTPUT_DIR = new URL('../../src/fonts/', import.meta.url)

/** The path of the stylesheet that {@link fontsCss} gives. */
export const FONTS_CSS = fileURLToPath(new URL('fonts.css', OUTPUT_DIR))

/** The subset of the sans family that {@link fontScript} adds before the first paint. */
const FIRST_SUBSET = 'latin'

/** The path of the script that {@link fontScript} gives. */
export const FONT_SCRIPT = fileURLToPath(new URL(`${SANS.name}-${FIRST_SUBSET}.js`, OUTPUT_DIR))

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

/**
 * The name IDs of the license description (13) and the license URL (14).
 * HarfBuzz keeps only the IDs from 0 to 6, so a subset keeps these only on
 * request. Each font file, and the bytes of the latin script, thus carry the
 * license that the OFL requires on each copy.
 */
const LICENSE_NAME_IDS = [13, 14]

/** One font file of ui: a subset of the source font of a family. */
export type FontSubset = {
	/** The family of the subset. */
	family: FontFamily
	/** The name of the subset: `symbols` or a key of {@link SCRIPTS}. */
	name: string
	/** The name of the file, which the stylesheet uses. */
	file: string
	/** The path of the file. */
	path: string
	/** The code points of the source font that the subset holds, in ascending order. */
	codePoints: number[]
}

/** Returns the code points of the source font of `family`, in ascending order. */
export async function sourceCodePoints(family: FontFamily): Promise<number[]> {
	const font = create(await readFile(family.source))

	if (font.isCollection) throw new Error(`${family.source} is a font collection, not one font.`)

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
 * Returns the subsets of the source font of each family. The faces in the
 * stylesheet keep this order. Each code point of a source font is in one
 * subset of its family or more.
 */
export async function fontSubsets(): Promise<FontSubset[]> {
	return (await Promise.all(FAMILIES.map(familySubsets))).flat()
}

/** Returns the subsets of the source font of `family`. */
async function familySubsets(family: FontFamily): Promise<FontSubset[]> {
	const codePoints = await sourceCodePoints(family)

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
			const file = `${family.name}-${subset.name}.woff2`

			return { ...subset, family, file, path: fileURLToPath(new URL(file, OUTPUT_DIR)) }
		})
}

/** Returns the bytes of the font file of a subset. */
export async function subsetBytes(subset: FontSubset): Promise<Buffer> {
	const { source, weight, opticalSize } = subset.family

	return subsetFont(await readFile(source), String.fromCodePoint(...subset.codePoints), {
		targetFormat: 'woff2',
		keepFeatures: FEATURES,
		variationAxes: opticalSize ? { wght: weight, opsz: opticalSize } : { wght: weight },
		preserveNameIds: LICENSE_NAME_IDS,
	})
}

/** Writes the `font-weight` range of the faces of `family`. */
function fontWeight({ weight }: FontFamily) {
	return `${weight.min} ${weight.max}`
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
	const families = await Promise.all(FAMILIES.map(familyCss))

	return [
		'/* Do not edit. `pnpm fonts` (`scripts/fonts/build.ts`) writes this file from the source fonts. */\n',
		...families.flatMap(({ faces }) => faces),
		block('@theme', Object.fromEntries(families.map(({ variable, stack }) => [variable, stack]))),
	].join('\n')
}

/**
 * Returns the faces of the subsets of `family`, its fallback faces, and its
 * font stack.
 */
async function familyCss(family: FontFamily) {
	const subsets = await familySubsets(family)

	const metrics = await fromFile(family.source)

	const { fontFamily, fontFaces } = createFontStack([metrics, ...family.fallbacks], {
		fontFaceFormat: 'styleObject',
	})

	// The script of the latin face of the sans family is the one source of that face.
	const faces = subsets
		.filter(({ name }) => family !== SANS || name !== FIRST_SUBSET)
		.map((subset) =>
			block('@font-face', {
				'font-family': `'${metrics.familyName}'`,
				'font-weight': fontWeight(family),
				'font-display': family.display,
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

	return {
		faces: [...faces, ...fallbacks],
		variable: family.variable,
		stack: `${quote(fontFamily)}, ${family.generic}`,
	}
}

/**
 * Returns the text of the script that adds the face of the `latin` subset. The
 * face has the weights and the `font-display` of the faces in the stylesheet.
 *
 * The faces use `font-display: block`, so text does not paint until its
 * subset loads. A page can paint before the font file loads, and that paint
 * then shows the layout with no text. The script holds the bytes of the
 * subset. A `FontFace` made from bytes is ready when the constructor returns,
 * so the face is ready before the next layout.
 *
 * The stylesheet has no face for the `latin` subset. WebKit, the engine of
 * each browser on an iPhone, uses a face of a stylesheet before a face from a
 * script with the same descriptors. It then downloads the file of the face of
 * the stylesheet, and it does not paint the text until that file loads.
 *
 * The script decodes the bytes with `Uint8Array.fromBase64`. In Chromium with
 * the CPU slowed 4 times, the decode takes 0.9 ms, and a loop over the text of
 * `atob` takes 5.5 ms. Chrome 140, Firefox 133, and Safari 18.2 have
 * `Uint8Array.fromBase64`, and the floor in `.browserslistrc` is lower. A
 * browser without it thus decodes with the loop.
 */
export async function fontScript(): Promise<string> {
	const subset = (await familySubsets(SANS)).find(({ name }) => name === FIRST_SUBSET)

	if (!subset) throw new Error(`The source font of ${SANS.name} has no ${FIRST_SUBSET} subset.`)

	const descriptors = {
		weight: fontWeight(SANS),
		display: SANS.display,
		unicodeRange: unicodeRange(subset.codePoints),
	}

	const { familyName } = await fromFile(SANS.source)

	const base64 = (await readFile(subset.path)).toString('base64')

	return [
		'/* Do not edit. `pnpm fonts` (`scripts/fonts/build.ts`) writes this file from the source font. */',
		'(() => {',
		`\tconst base64 = '${base64}'`,
		'\tlet bytes = Uint8Array.fromBase64?.(base64)',
		'\tif (!bytes) {',
		'\t\tconst text = atob(base64)',
		'\t\tbytes = new Uint8Array(text.length)',
		'\t\tfor (let index = 0; index < text.length; index++) bytes[index] = text.charCodeAt(index)',
		'\t}',
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
