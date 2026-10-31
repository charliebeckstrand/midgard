import { readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A primitive keeps the layout of a component unit (CONVENTIONS.md §3.3 and
// §3.5). Its main file and its part files hold components. A hook that it
// exports is in a `use-*` file. A context and the hooks that read it are in
// `context.ts`. Thus a part outside the primitive can import a hook without
// the components next to it.
//
//   1. In `primitives/`, a file that exports a hook is a `use-*` file or a
//      `context` file.
//   2. Each hook that a `use-<stem>` file exports has the stem in its name.
//      Words can come before or after the stem: `use-query-value.ts` can
//      export `useQueryValue` and `useDeferredQueryValue`, and
//      `use-content-height.ts` can export `useContentHeightAvailable`.
//   3. Outside `primitives/`, no file imports the main `<name>` file of a
//      primitive that has a barrel. It imports the barrel or a leaf file. A
//      primitive with no barrel has no other entry, so its main file is open.

const primitivesDir = join(srcDir, 'primitives')

const testsDir = join(srcDir, '__tests__')

const HOOK_FILE = /^(?:use-[a-z0-9-]+|context)\.tsx?$/

// `export function useX`, `export const useX`, and `export const [XContext, useX]`.
const DECLARED_HOOK = /^export\s+(?:function|const)\s+(use[A-Z]\w*|\[[^\]]*\])/gm

// `export { useX }` with no `from`: a local binding that the file exports.
const LISTED_HOOK = /^export\s+\{([^}]*)\}(?!\s*from)/gm

const PRIMITIVE_MAIN_IMPORT =
	/from\s+['"](?:\.\.\/)+primitives\/([a-z][a-z0-9-]*)\/\1(?:\.tsx?)?['"]/g

function exportedHooks(source: string): string[] {
	const hooks: string[] = []

	for (const match of source.matchAll(DECLARED_HOOK)) hooks.push(...hookNames(match[1] ?? ''))

	for (const match of source.matchAll(LISTED_HOOK)) hooks.push(...hookNames(match[1] ?? ''))

	return hooks
}

function hookNames(text: string): string[] {
	return text.match(/\buse[A-Z]\w*/g) ?? []
}

/** The stem of a `use-*` file in PascalCase: `use-query-value.ts` gives `QueryValue`. */
function hookStem(file: string): string {
	return basename(file)
		.replace(/^use-/, '')
		.replace(/\.tsx?$/, '')
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('')
}

function primitivesWithBarrel(): Set<string> {
	const names = new Set<string>()

	for (const entry of readdirSync(primitivesDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue

		try {
			statSync(join(primitivesDir, entry.name, 'index.ts'))

			names.add(entry.name)
		} catch {}
	}

	return names
}

describe('primitive hook boundary', () => {
	it('a primitive exports each hook from a use-* file or a context file', () => {
		const violations: string[] = []

		walkSource(primitivesDir, (file, content) => {
			if (!isSourceFile(file)) return

			const name = basename(file)

			if (name === 'index.ts' || HOOK_FILE.test(name)) return

			if (exportedHooks(stripSourceComments(content)).length > 0) violations.push(srcRelative(file))
		})

		expect(
			violations,
			`hook exported from a primitive file that is not use-* or context (CONVENTIONS.md §3.3):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('a use-* file names each hook that it exports after the file', () => {
		const violations: string[] = []

		walkSource(primitivesDir, (file, content) => {
			if (!isSourceFile(file) || !basename(file).startsWith('use-')) return

			const stem = hookStem(file)

			for (const hook of exportedHooks(stripSourceComments(content))) {
				if (!hook.slice(3).includes(stem)) violations.push(`${srcRelative(file)}: ${hook}`)
			}
		})

		expect(
			violations,
			`hook without the stem of its file in its name (rename the hook or the file):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it("no file outside primitives imports a primitive's main file", () => {
		const barrels = primitivesWithBarrel()

		const violations: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!isSourceFile(file)) return

			if (file.startsWith(primitivesDir) || file.startsWith(testsDir)) return

			for (const match of content.matchAll(PRIMITIVE_MAIN_IMPORT)) {
				const name = match[1]

				if (name && barrels.has(name))
					violations.push(`${srcRelative(file)} → primitives/${name}/${name}`)
			}
		})

		expect(
			violations,
			`primitive main file imported deeply (import the barrel or a leaf file):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
