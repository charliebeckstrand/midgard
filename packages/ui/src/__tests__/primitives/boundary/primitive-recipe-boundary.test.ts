import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Primitives reach the recipe layer through their owning kata, the same
// funnel components use. Value imports from `recipes` (the types-only
// barrel), `recipes/katakana/*`, `recipes/genkei/*`, or `recipes/kiso/*`
// would bypass the kata curation and pull applicator, archetype, or
// substrate fragments into the primitive layer directly. Type-only imports
// from the barrel are fine — primitives derive prop unions from `Step` /
// `Ma` / `Color` / `Ji` / `GroupOrientation` / `GroupPosition`.

const primitivesDir = join(__dirname, '../../../primitives')
const srcDir = join(__dirname, '../../..')

const IMPORT_RE = /^(import(?:\s+type)?\s+(?:[^'"]+from\s+)?)['"]([^'"]+)['"]/gm

describe('primitive recipe-import boundary', () => {
	it('primitives import recipe values only via recipes/kata/<name>', () => {
		const violations: string[] = []

		walk(primitivesDir, (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			const rel = relative(srcDir, file)

			for (const match of content.matchAll(IMPORT_RE)) {
				const head = match[1] ?? ''
				const path = match[2] ?? ''

				if (!path.includes('/recipes')) continue

				// `recipes/kata/...` is the sanctioned funnel for primitives.
				if (/\/recipes\/kata\/[^'"]+$/.test(path)) continue

				const isTypeOnly = /\bimport\s+type\b/.test(head) || isAllTypeNamed(match[0])

				const isBarrel = /\/recipes['"]?$/.test(path) || path.endsWith('/recipes')

				const isInternalLayer = /\/recipes\/(?:katakana|genkei|kiso)\//.test(path)

				if (isBarrel && isTypeOnly) continue

				if (isBarrel) {
					violations.push(`${rel}: value import from recipes barrel — ${match[0]}`)
					continue
				}

				if (isInternalLayer) {
					violations.push(`${rel}: forbidden import from ${path} — ${match[0]}`)
				}
			}
		})

		expect(
			violations,
			`primitives reach the recipe layer outside the kata funnel:\n  ${violations.join('\n  ')}`,
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

function walk(dir: string, visit: (file: string, content: string) => void) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			walk(path, visit)
		} else if (entry.isFile()) {
			visit(path, readFileSync(path, 'utf8'))
		}
	}
}
