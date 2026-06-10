import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Two invariants keep components composing through their public surface
// rather than reaching into each other's files:
//
//   1. A component's index.ts re-exports only from within its own folder, or
//      from its owning kata — `recipes/kata/<same-name>` and any sub-kata
//      `recipes/kata/<same-name>-<anything>`. Kata variants are part of the
//      component's public API; re-exporting from a sibling component's
//      internals is not.
//   2. No file imports a sibling component's main `<name>.tsx` via a deep
//      relative path (`'../<other>/<other>'`). The barrel — `'../<other>'` —
//      is the public entry point; deep main-file imports bypass it.

const componentsDir = join(__dirname, '../../../components')

const srcDir = join(__dirname, '../../..')

const REEXPORT_FROM = /export\s+(?:\*|\{[^}]*\}|type\s+\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g

const SIBLING_MAIN_IMPORT = /from\s+['"]\.\.\/([a-z][a-z0-9-]*)\/\1(?:\.tsx?)?['"]/g

describe('component internals boundary', () => {
	it("a component's index.ts re-exports only from within its own folder", () => {
		const violations: string[] = []

		for (const entry of readdirSync(componentsDir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue

			const indexPath = join(componentsDir, entry.name, 'index.ts')

			try {
				statSync(indexPath)
			} catch {
				continue
			}

			const source = readFileSync(indexPath, 'utf8')

			for (const match of source.matchAll(REEXPORT_FROM)) {
				const target = match[1]

				if (!target || target.startsWith('./')) continue

				if (isOwnKataReexport(target, entry.name)) continue

				violations.push(`components/${entry.name}/index.ts → ${target}`)
			}
		}

		expect(
			violations,
			`component barrel re-exports a sibling's files:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it("no file imports a sibling component's main file via a deep relative path", () => {
		const violations: string[] = []

		walk(componentsDir, (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			const rel = relative(srcDir, file)

			for (const match of content.matchAll(SIBLING_MAIN_IMPORT)) {
				violations.push(`${rel} → ../${match[1]}/${match[1]}`)
			}
		})

		expect(
			violations,
			`sibling main file imported deeply (use the barrel '../<name>' instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	// Rendering `<XxxContext value={…}>` makes the module a client module: the
	// package's subpath exports resolve to raw source, so a missing directive
	// surfaces as an RSC crash only at runtime in a consuming Next app
	// (the DescriptionList bug — BUG-AUDIT High).
	it("a module that renders a Context provider carries 'use client'", () => {
		const violations: string[] = []

		const PROVIDER_JSX = /<[A-Z][A-Za-z]*Context[\s>]/

		walk(componentsDir, (file, content) => {
			if (!file.endsWith('.tsx')) return

			if (!PROVIDER_JSX.test(content)) return

			if (content.startsWith("'use client'")) return

			violations.push(relative(srcDir, file))
		})

		expect(
			violations,
			`Context provider rendered without 'use client' (crashes in RSC):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})

function isOwnKataReexport(target: string, component: string): boolean {
	const kataName = target.match(/recipes\/kata\/([a-z][a-z0-9-]*)$/)?.[1]

	if (!kataName) return false

	return kataName === component || kataName.startsWith(`${component}-`)
}

function walk(dir: string, visit: (file: string, content: string) => void) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (
			entry.name === '__tests__' ||
			entry.name === '__benchmarks__' ||
			entry.name === 'node_modules' ||
			entry.name === 'dist' ||
			entry.name.startsWith('.')
		) {
			continue
		}

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			walk(path, visit)
		} else if (entry.isFile()) {
			visit(path, readFileSync(path, 'utf8'))
		}
	}
}
