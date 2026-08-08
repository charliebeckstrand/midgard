import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// `@internal` marks a helper no barrel re-exports (CONVENTIONS.md §12.1). The
// tag and a barrel entry are mutually exclusive: a symbol on a barrel is public
// to the package and documents itself as such, while an `@internal` symbol is
// reached at its module path. Both halves drifted before this test existed —
// the `usePlotFrame` family carried the tag while riding `ui/hooks` and holding
// rows in HOOKS.md.
//
// This test pins the internal-surface contract in two places:
//
//   1. No `@internal` symbol is re-exported from a barrel.
//   2. package.json `exports` never surfaces ./types, which is reached by
//      relative import within the package exactly as ./utilities is.

/** Source layers whose `index.ts` files form a public surface. */
const LAYERS = ['core', 'hooks', 'layouts', 'primitives', 'providers', 'types', 'utilities']

/**
 * Named bindings a barrel re-exports. `export * from` carries no names to
 * check, so it is ignored; a wildcard cannot re-export a tag this test reads.
 */
function barrelExports(source: string): string[] {
	const names: string[] = []

	for (const block of source.matchAll(/export\s*\{([^}]*)\}/g)) {
		for (const part of (block[1] ?? '').split(',')) {
			const [local] = part
				.trim()
				.replace(/^type\s+/, '')
				.split(/\s+as\s+/)

			const name = local?.trim()

			if (name) names.push(name)
		}
	}

	return names
}

const DECLARATION =
	/\/\*\*(?<doc>(?:(?!\*\/)[\s\S])*?)\*\/\s*export\s+(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+(?<name>[A-Za-z_$][\w$]*)/g

/**
 * Every symbol declared under `dir` whose own doccomment carries `@internal`,
 * mapped to the file declaring it. Scoped to one barrel's own directory so a
 * name that is internal in one primitive cannot flag a sibling that exports
 * its own symbol under the same name.
 */
function internalDeclarations(dir: string): Map<string, string> {
	const found = new Map<string, string>()

	walkSource(dir, (file, content) => {
		if (file.endsWith('index.ts')) return

		for (const match of content.matchAll(DECLARATION)) {
			const { doc, name } = match.groups as { doc: string; name: string }

			if (/(^|\s)@internal(\s|$)/.test(doc)) found.set(name, relative(srcDir, file))
		}
	})

	return found
}

describe('internal-surface boundary', () => {
	it('no @internal symbol is re-exported from a barrel', () => {
		const violations: string[] = []

		for (const layer of LAYERS) {
			walkSource(join(srcDir, layer), (file, content) => {
				if (!file.endsWith('index.ts')) return

				const internals = internalDeclarations(dirname(file))

				for (const name of barrelExports(content)) {
					const declaredIn = internals.get(name)

					if (declaredIn) {
						violations.push(
							`${relative(srcDir, file)} re-exports @internal ${name} (${declaredIn})`,
						)
					}
				}
			})
		}

		expect(
			violations,
			`@internal symbols on a barrel — drop the tag to make them package-public, or unbarrel them (CONVENTIONS.md §12.1):\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('package.json exports does not surface ./types', () => {
		const pkg = JSON.parse(readFileSync(join(srcDir, '..', 'package.json'), 'utf8')) as {
			exports: Record<string, unknown>
		}

		const leaks = Object.keys(pkg.exports).filter(
			(key) => key === './types' || key.startsWith('./types/'),
		)

		expect(leaks, `package.json exports leaks types: ${leaks.join(', ')}`).toEqual([])
	})
})
