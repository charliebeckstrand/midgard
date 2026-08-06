import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// Every consuming layer reaches the recipe layer through its owning kata. Value
// imports from `recipes` (the types-only barrel), `recipes/katakana/*`, or
// `recipes/kiso/*` would bypass the kata curation and pull applicator or
// substrate fragments into the consuming layer directly. Type-only imports
// from the barrel are fine; the barrel surfaces `Step` / `Ma` / `Color` /
// `Ji` / `GroupOrientation` / `GroupPosition` for prop-union derivation.
//
// One scan over every consuming layer: components, modules, and primitives hold
// the same contract, so a single sanction list keeps them from drifting apart.

/** The layers that consume recipes, keyed by the noun a failure reports. */
const LAYERS = { components: 'components', modules: 'modules', primitives: 'primitives' } as const

const IMPORT_RE = /^(import(?:\s+type)?\s+(?:[^'"]+from\s+)?)['"]([^'"]+)['"]/gm

describe('recipe-import boundary', () => {
	it('consuming layers import recipe values only via recipes/kata/<name>', () => {
		const violations: string[] = []

		for (const [layer, dirName] of Object.entries(LAYERS))
			walkSource(join(srcDir, dirName), (file, content) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

				const rel = relative(srcDir, file)

				for (const match of content.matchAll(IMPORT_RE)) {
					const head = match[1] ?? ''

					const path = match[2] ?? ''

					if (!path.includes('/recipes')) continue

					// `recipes/kata/...` is the sanctioned funnel for every layer.
					if (/\/recipes\/kata\/[^'"]+$/.test(path)) continue

					const isTypeOnly = /\bimport\s+type\b/.test(head) || isAllTypeNamed(match[0])

					const isBarrel = /\/recipes['"]?$/.test(path) || path.endsWith('/recipes')

					const isInternalLayer = /\/recipes\/(?:katakana|kiso)\//.test(path)

					if (isBarrel && isTypeOnly) continue

					if (isBarrel) {
						violations.push(`${layer} — ${rel}: value import from recipes barrel — ${match[0]}`)

						continue
					}

					if (isInternalLayer) {
						violations.push(`${layer} — ${rel}: forbidden import from ${path} — ${match[0]}`)
					}
				}
			})

		expect(
			violations,
			`a consuming layer reaches the recipe layer outside the kata funnel:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})

function isAllTypeNamed(importStmt: string): boolean {
	const inner = importStmt.match(/\{([^}]*)\}/)?.[1]

	if (!inner) return false

	const names = inner
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)

	if (names.length === 0) return false

	return names.every((name) => name.startsWith('type '))
}
