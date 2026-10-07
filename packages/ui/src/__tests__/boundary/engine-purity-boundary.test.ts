import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importsOf } from '../helpers/source-imports'
import { isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// The pure-core invariant the grid, query, map, chat, and dashboard ROADMAPs each
// assert in prose, enforced once here instead of five times in five documents whose
// greps only run when somebody reads them.
//
// A pure engine is a d3-style functional core: framework-free, callable and
// benchable outside React, and importable without dragging the module's React
// shell in behind it. Four rules carry that:
//
//   - no `'use client'` — the engine is not a client boundary
//   - no runtime `react` / `react-dom` / `motion` / `@dnd-kit` / `@floating-ui`
//     import (a type-only import is fine: `CSSProperties`, `ReactNode`, and
//     dnd-kit's `ClientRect` describe data the shell renders or hands back)
//   - no runtime import from the module root — the arrow runs shell → engine,
//     never back, so the engine stands alone
//   - no `index` barrel — the engine is imported file-by-file, so a consumer
//     pays for the leaf it names and nothing else
//
// `modules/chart/engine` is deliberately absent. It is a shared substrate
// rather than a pure core — it holds `.tsx` components and hooks by design — so
// the list is explicit rather than a `modules/*/engine` glob, and a new pure
// engine opts in by joining it.
const PURE_ENGINES = ['chat', 'dashboard', 'grid', 'map', 'query'] as const

const enginePath = (module: string) => join(srcDir, 'modules', module, 'engine')

/** Whether a runtime import of `specifier` costs an engine its independence. */
function isFrameworkSpecifier(specifier: string): boolean {
	return (
		/^(react|react-dom)$/.test(specifier) ||
		/^(motion|framer-motion)\b/.test(specifier) ||
		/^@(dnd-kit|floating-ui)\//.test(specifier)
	)
}

/**
 * Every framework reach in one file: a client-boundary directive, and each
 * runtime import of a framework package. Empty for a pure file. The rule and
 * its self-check both read this, so neither can drift from the other.
 */
function frameworkReaches(content: string): string[] {
	const found: string[] = []

	if (/^\s*['"]use client['"]/m.test(content)) found.push("'use client'")

	for (const { specifier, runtime } of importsOf(content)) {
		if (runtime && isFrameworkSpecifier(specifier)) found.push(`runtime import of '${specifier}'`)
	}

	return found
}

/** Every source file under an engine, with its path relative to `srcDir`. */
function engineFiles(dir: string): { rel: string; depth: number; content: string }[] {
	const out: { rel: string; depth: number; content: string }[] = []

	walkSource(dir, (file, content) => {
		if (!isSourceFile(file)) return

		// Depth 1 is a file directly under `engine/`, 2 one in a concept directory.
		// Split on both separators: `relative` yields backslashes on Windows, and a
		// '/'-only split reads every file as depth 1 there.
		out.push({
			rel: srcRelative(file),
			depth: relative(dir, file).split(/[\\/]/).length,
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
			const violations = files.flatMap(({ rel, content }) =>
				frameworkReaches(content).map((reach) => `${rel} → ${reach}`),
			)

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
		{ label: 'runtime @dnd-kit', content: "import { arrayMove } from '@dnd-kit/sortable'\n" },
		{
			label: 'runtime @floating-ui',
			content: "import { useFloating } from '@floating-ui/react'\n",
		},
	]

	for (const { label, content } of cases) {
		it(`detects ${label}`, () => {
			expect(frameworkReaches(content)).not.toEqual([])
		})
	}

	it('allows a type-only framework import', () => {
		const refs = importsOf("import type { CSSProperties } from 'react'\n")

		expect(refs).toEqual([{ specifier: 'react', runtime: false }])
	})

	it('spares a type-only import of a banned package', () => {
		// `grid-reorder-compute.ts` describes its modifiers with dnd-kit's own
		// `ClientRect` / `Transform` / `Modifier`. The specifier is banned and the
		// clause erases, so only the rule's runtime half can spare it.
		const content = "import type { ClientRect, Modifier } from '@dnd-kit/core'\n"

		expect(isFrameworkSpecifier('@dnd-kit/core')).toBe(true)

		expect(frameworkReaches(content)).toEqual([])
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
