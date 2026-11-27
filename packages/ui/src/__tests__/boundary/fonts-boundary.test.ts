// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fromFile } from '@capsizecss/unpack/fs'
import { assert, describe, expect, it } from 'vitest'
import {
	FAMILIES,
	FONT_SCRIPT,
	FONTS_CSS,
	fontScript,
	fontSubsets,
	fontsCss,
	SANS,
	sourceCodePoints,
	subsetBytes,
} from '../../../scripts/fonts/build'

// `pnpm fonts` writes the font files of ui, `src/fonts/fonts.css`, and the
// script of the latin face of the sans family from the source fonts. The font
// files are subsets of the source fonts. The stylesheet gives a face for each
// subset except the latin subset of the sans family, the fallback faces, and
// the font stacks. The script gives that latin face. A change to a source font
// or to the script that does not run the script leaves files that do not agree
// with the source fonts. Then the
// fallback metrics can be wrong, the swap to the font moves the layout, or
// the latin face does not have the bytes of the latin subset.

/** Returns the text with all white space removed. */
function compact(text: string) {
	return text.replace(/\s+/g, '')
}

describe('fonts.css', () => {
	// White space does not count, because Biome formats the file.
	it('agrees with the source font', async () => {
		expect(compact(readFileSync(FONTS_CSS, 'utf8'))).toBe(compact(await fontsCss()))
	})
})

describe('the script of the latin face', () => {
	it('agrees with the latin subset', async () => {
		expect(readFileSync(FONT_SCRIPT, 'utf8')).toBe(await fontScript())
	})
})

describe('font files', () => {
	it('are the subsets that `pnpm fonts` writes', async () => {
		const subsets = await fontSubsets()

		const files = readdirSync(dirname(FONTS_CSS)).filter((file) => file.endsWith('.woff2'))

		expect(files.toSorted()).toEqual(subsets.map((subset) => subset.file).toSorted())

		for (const subset of subsets) {
			const bytes = await subsetBytes(subset)

			expect(readFileSync(subset.path).equals(bytes), `${subset.file} is not current`).toBe(true)
		}
	})

	it.each(FAMILIES.map((family) => [family.name, family] as const))(
		'hold each code point of the source font of %s',
		async (_, family) => {
			const held = new Set(
				(await fontSubsets())
					.filter((subset) => subset.family === family)
					.flatMap((subset) => subset.codePoints),
			)

			expect((await sourceCodePoints(family)).filter((point) => !held.has(point))).toEqual([])
		},
	)

	// The fallback faces take their metrics from the source font. The pages
	// add the latin subset of the sans family before the first paint, so its
	// metrics must be the same.
	it('give the latin subset of the sans family the metrics of the source font', async () => {
		const latin = (await fontSubsets()).find(
			(subset) => subset.family === SANS && subset.name === 'latin',
		)

		assert(latin, 'The source font of the sans family has no latin subset.')

		expect(await fromFile(latin.path)).toEqual(await fromFile(SANS.source))
	})
})
