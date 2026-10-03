// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FONTS_CSS, fontsCss } from '../../../scripts/fonts'

// `src/fonts/fonts.css` gives the font, its fallback faces, and the font
// stack. `pnpm fonts` writes it from the font file. A change to the font file
// that does not run the script leaves fallback metrics that no longer agree
// with the font, and the swap to the font then moves the layout. White space
// does not count, because Biome formats the file.

/** Returns the text with all white space removed. */
function compact(text: string) {
	return text.replace(/\s+/g, '')
}

describe('fonts.css', () => {
	it('agrees with the font file', async () => {
		expect(compact(readFileSync(FONTS_CSS, 'utf8'))).toBe(compact(await fontsCss()))
	})
})
