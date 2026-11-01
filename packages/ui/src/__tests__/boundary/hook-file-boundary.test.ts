import { readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportedHooks, hookStem } from '../helpers/hook-files'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Each unit keeps its hooks in leaf files (CONVENTIONS.md §3.3 to §3.5). A
// unit is a component, a module, a structure unit, a provider, a layout, or a
// primitive. Its main file and its part files hold components. A hook that it
// exports is in a `use-*` file. A context and the hooks that read it are in
// `context.ts`. Thus a sibling can import a hook without the components next
// to it. The flat `hooks/` tree holds one `use-*` file for each stem. The
// docs app keeps the same rules, so the gate reads `docs/` too. There, the
// folder of a file is its unit.
//
//   1. A file that exports a hook is a `use-*` file or a `context` file.
//   2. Each hook that a `use-*` file exports has the stem of the file in its
//      name. The stem leaves out the unit that the folder names, so
//      `use-grid-active-cell.ts` in `modules/grid` can export `useActiveCell`.
//      Words can come before or after the stem: `use-query-value.ts` can export
//      `useQueryValue` and `useDeferredQueryValue`.
//   3. No file of a unit imports the main `<name>` file of another unit that
//      has a barrel. It imports the barrel or a leaf file. A unit with no
//      barrel has no other entry, so its main file is open.

const TREES = [
	'components',
	'docs',
	'hooks',
	'layouts',
	'modules',
	'primitives',
	'providers',
	'structure',
]

const HOOK_FILE = /^(?:use-[a-z0-9-]+|context)\.tsx?$/

// A relative import of `<tree>/<name>/<name>`, at any depth.
const MAIN_IMPORT =
	/from\s+['"](?:\.\.\/)+(components|layouts|modules|primitives|providers|structure)\/([a-z][a-z0-9-]*)\/\2(?:\.tsx?)?['"]/g

/**
 * The unit that the folder of a file names, or `null` in a folder that names
 * no unit: the flat `hooks/` tree and a module engine concept folder, whose
 * files take short names. A file directly under a module `engine/` takes the
 * name of the module.
 */
function findUnit(file: string): string | null {
	const parts = relative(srcDir, dirname(file)).split(sep)

	const [tree, name, sub] = parts

	if (tree === 'hooks' && parts.length === 1) return null

	if (tree === 'modules' && sub === 'engine') return parts.length === 3 ? (name ?? null) : null

	return parts.at(-1) ?? null
}

function unitsWithBarrel(tree: string): Set<string> {
	const names = new Set<string>()

	for (const entry of readdirSync(join(srcDir, tree), { withFileTypes: true })) {
		if (!entry.isDirectory()) continue

		try {
			statSync(join(srcDir, tree, entry.name, 'index.ts'))

			names.add(entry.name)
		} catch {}
	}

	return names
}

function eachSource(visit: (file: string, content: string) => void): void {
	for (const tree of TREES) {
		walkSource(join(srcDir, tree), (file, content) => {
			if (isSourceFile(file)) visit(file, content)
		})
	}
}

describe('hook file boundary', () => {
	it('a unit exports each hook from a use-* file or a context file', () => {
		const violations: string[] = []

		eachSource((file, content) => {
			const name = basename(file)

			if (name === 'index.ts' || HOOK_FILE.test(name)) return

			if (exportedHooks(stripSourceComments(content)).length > 0) violations.push(srcRelative(file))
		})

		expect(
			violations,
			`hook exported from a file that is not use-* or context (CONVENTIONS.md §3.5):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('a use-* file names each hook that it exports after the file', () => {
		const violations: string[] = []

		eachSource((file, content) => {
			if (!basename(file).startsWith('use-')) return

			const stem = hookStem(file, findUnit(file))

			for (const hook of exportedHooks(stripSourceComments(content))) {
				if (!hook.slice(3).toLowerCase().includes(stem))
					violations.push(`${srcRelative(file)}: ${hook}`)
			}
		})

		expect(
			violations,
			`hook without the stem of its file in its name (rename the hook or the file):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('no unit imports the main file of another unit that has a barrel', () => {
		const barrels = new Map(TREES.map((tree) => [tree, unitsWithBarrel(tree)]))

		const violations: string[] = []

		eachSource((file, content) => {
			for (const match of content.matchAll(MAIN_IMPORT)) {
				const [, tree = '', name = ''] = match

				// A file inside the unit imports its own main file freely.
				if (file.startsWith(join(srcDir, tree, name) + sep)) continue

				if (barrels.get(tree)?.has(name))
					violations.push(`${srcRelative(file)} → ${tree}/${name}/${name}`)
			}
		})

		expect(
			violations,
			`main file of a unit imported deeply (import the barrel or a leaf file):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
