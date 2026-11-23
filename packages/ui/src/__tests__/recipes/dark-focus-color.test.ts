// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative } from '../helpers/walk-source'

/**
 * The focus color is blue-600 on light and blue-500 on dark (`sen/focus.ts`).
 * Blue-600 on dark is below 3:1 against a dark popover, a dark field, and a
 * dark soft fill (WCAG 1.4.11). A recipe that paints its own focus mark must
 * thus give each focus class of blue-600 a `dark:` class of blue-500 with the
 * same variants. This scan reads each recipe file, because a recipe can paint
 * the focus with any variant, and a list of the recipes would miss a new one.
 */

const recipesDir = join(srcDir, 'recipes')

/** Each `.ts` file under `dir`, at any depth. */
function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)

		if (entry.isDirectory()) return walk(path)

		return entry.name.endsWith('.ts') ? [path] : []
	})
}

/** A class of light blue-600 with a focus variant, such as `focus-visible:outline-blue-600`. */
const LIGHT_FOCUS = /(?<![\w:-])(?!dark:)[^\s'"`]*focus[^\s'"`]*-blue-600(?![\w-])/g

describe('Dark focus color', () => {
	it('gives each blue-600 focus class of a recipe a dark blue-500 class', () => {
		const missing: string[] = []

		for (const file of walk(recipesDir)) {
			const source = readFileSync(file, 'utf8')

			for (const [light] of source.matchAll(LIGHT_FOCUS)) {
				const dark = `dark:${light.replace(/-blue-600$/, '-blue-500')}`

				if (!source.includes(dark)) missing.push(`${srcRelative(file)}: ${light}`)
			}
		}

		expect(missing).toEqual([])
	})
})
