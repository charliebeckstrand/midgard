import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// The pure-core invariant the grid, query, and map ROADMAPs each assert in
// prose, enforced once here instead of three times in three documents whose
// greps only run when somebody reads them.
//
// A pure engine is a d3-style functional core: framework-free, callable and
// benchable outside React, and importable without dragging the module's React
// shell in behind it. Four rules carry that:
//
//   - no `'use client'` — the engine is not a client boundary
//   - no runtime `react` / `react-dom` / `motion` import (a type-only import is
//     fine: `CSSProperties` and `ReactNode` describe data the shell will render)
//   - no runtime import from the module root — the arrow runs shell → engine,
//     never back, so the engine stands alone
//   - no `index` barrel — the engine is imported file-by-file, so a consumer
//     pays for the leaf it names and nothing else
//
// `modules/chart/engine` is deliberately absent. It is a shared substrate
// rather than a pure core — it holds `.tsx` components and hooks by design — so
// the list is explicit rather than a `modules/*/engine` glob, and a new pure
// engine opts in by joining it.
const PURE_ENGINES = ['grid', 'map', 'query'] as const

const enginePath = (module: string) => join(srcDir, 'modules', module, 'engine')

/**
 * One import statement's specifier, and whether it survives compilation.
 *
 * Parsed rather than pattern-matched: this codebase writes no semicolons, so a
 * `[^;]*` body runs past the end of its own statement and swallows the imports
 * below it. The clause is instead taken non-greedily up to its own `from`.
 */
type ImportRef = { specifier: string; runtime: boolean }

const IMPORT = /^import\s+([\s\S]*?)\sfrom\s*['"]([^'"]+)['"]/gm

/**
 * Whether an import clause emits a runtime dependency: `import type { … }` and
 * a clause whose every named binding carries its own `type` are both erased, so
 * neither costs the engine its independence. A bare `import 'x'` has no clause
 * and never reaches here — it carries no `from`.
 */
function isRuntimeClause(clause: string): boolean {
	const body = clause.trim()

	if (body.startsWith('type ')) return false

	const named = body.match(/\{([\s\S]*)\}/)

	// A default or namespace binding sits outside the braces and is always runtime.
	if (
		!named ||
		body
			.replace(/\{[\s\S]*\}/, '')
			.replace(/,/g, '')
			.trim() !== ''
	)
		return true

	return (named[1] ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
		.some((part) => !part.startsWith('type '))
}

function importsOf(content: string): ImportRef[] {
	return [...content.matchAll(IMPORT)].map((match) => ({
		specifier: match[2] as string,
		runtime: isRuntimeClause(match[1] as string),
	}))
}

/** Every source file under an engine, with its path relative to `srcDir`. */
function engineFiles(dir: string): { rel: string; depth: number; content: string }[] {
	const out: { rel: string; depth: number; content: string }[] = []

	walkSource(dir, (file, content) => {
		if (!/\.tsx?$/.test(file)) return

		// Depth 1 is a file directly under `engine/`, 2 one in a concept directory.
		out.push({
			rel: relative(srcDir, file),
			depth: relative(dir, file).split('/').length,
			content,
		})
	})

	return out
}

describe('engine purity boundary', () => {
	for (const module of PURE_ENGINES) {
		const dir = enginePath(module)

		const files = engineFiles(dir)

		it(`${module}/engine has files to check`, () => {
			expect(files.length).toBeGreaterThan(0)
		})

		it(`${module}/engine imports no framework at runtime and declares no client boundary`, () => {
			const violations = files.flatMap(({ rel, content }) => {
				const found: string[] = []

				if (/^\s*['"]use client['"]/m.test(content)) found.push(`${rel} → 'use client'`)

				for (const { specifier, runtime } of importsOf(content)) {
					if (!runtime) continue

					if (
						/^(react|react-dom)$/.test(specifier) ||
						/^(motion|framer-motion)\b/.test(specifier)
					) {
						found.push(`${rel} → runtime import of '${specifier}'`)
					}
				}

				return found
			})

			expect(
				violations,
				`\`modules/${module}/engine\` is a pure core — see the module ROADMAP §Engine:\n  ${violations.join('\n  ')}`,
			).toEqual([])
		})

		it(`${module}/engine never imports from its module root at runtime`, () => {
			const violations = files.flatMap(({ rel, depth, content }) => {
				// The module root is exactly `depth` levels up from the file, and a
				// reach at it names a bare segment (`'../types'`, not `'../../core'`).
				const root = new RegExp(`^${'\\.\\./'.repeat(depth)}[a-z][a-z0-9-]*$`)

				return importsOf(content)
					.filter(({ specifier, runtime }) => runtime && root.test(specifier))
					.map(({ specifier }) => `${rel} → runtime import of '${specifier}'`)
			})

			expect(
				violations,
				`\`modules/${module}/engine\` must not depend on its React shell:\n  ${violations.join('\n  ')}`,
			).toEqual([])
		})

		it(`${module}/engine carries no index barrel`, () => {
			const found = files.filter(({ rel }) => /\/index\.tsx?$/.test(rel)).map(({ rel }) => rel)

			expect(
				found,
				`\`modules/${module}/engine\` is imported file-by-file, so it carries no barrel:\n  ${found.join('\n  ')}`,
			).toEqual([])
		})
	}
})

describe('engine purity boundary · self-check', () => {
	// The rules above only earn their place if they can fail. Each of these is a
	// violation the greps in the ROADMAPs were meant to catch.
	const cases = [
		{ label: "'use client'", content: "'use client'\n\nexport const a = 1\n" },
		{ label: 'runtime react', content: "import { useMemo } from 'react'\n" },
		{ label: 'mixed type/value clause', content: "import { type A, b } from 'react'\n" },
		{ label: 'runtime motion', content: "import { motion } from 'motion/react'\n" },
	]

	for (const { label, content } of cases) {
		it(`detects ${label}`, () => {
			const offends =
				/^\s*['"]use client['"]/m.test(content) ||
				importsOf(content).some(
					({ specifier, runtime }) =>
						runtime && (/^(react|react-dom)$/.test(specifier) || /^motion\b/.test(specifier)),
				)

			expect(offends).toBe(true)
		})
	}

	it('allows a type-only framework import', () => {
		const refs = importsOf("import type { CSSProperties } from 'react'\n")

		expect(refs).toEqual([{ specifier: 'react', runtime: false }])
	})

	it('allows a clause whose every binding is type-qualified', () => {
		const refs = importsOf("import { type A, type B } from 'react'\n")

		expect(refs[0]?.runtime).toBe(false)
	})

	it('does not let one import statement swallow the next', () => {
		const refs = importsOf(
			"import {\n\tuseMemo,\n} from 'react'\nimport { cn } from '../../core'\n",
		)

		expect(refs.map((r) => r.specifier)).toEqual(['react', '../../core'])
	})
})
