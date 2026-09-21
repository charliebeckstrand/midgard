import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// A shared axis has one definition (CONVENTIONS §4.4). A component that
// re-spells the union drifts from it silently: the two types stay assignable,
// so nothing fails until one of them gains a value.
//
// `Orientation` is the axis with a single unambiguous value set — two values
// that always mean the same thing. Alias it (`type ToolbarOrientation =
// Orientation`) rather than repeat it.

// Shipped-source directories. Tests, benchmarks, and the docs engine are
// excluded. `recipes/katakana` is excluded too: it declares its token contract
// structurally and imports nothing from `recipes/kiso`, pinned by the
// `recipes/katakana/**` override in `biome.json`.
const SCAN_DIRS = [
	'components',
	'core',
	'hooks',
	'layouts',
	'modules',
	'primitives',
	'providers',
	'utilities',
]

const ORIENTATION = /'horizontal'\s*\|\s*'vertical'|'vertical'\s*\|\s*'horizontal'/g

describe('variant axis boundary', () => {
	it('no module re-spells the orientation axis', () => {
		const violations: string[] = []

		for (const dir of SCAN_DIRS) {
			walkSource(join(srcDir, dir), (file, content) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

				for (const match of content.matchAll(ORIENTATION)) {
					violations.push(`${relative(srcDir, file)} → ${match[0]}`)
				}
			})
		}

		expect(
			violations,
			`alias \`Orientation\` from \`src/types\` instead of repeating its union:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
