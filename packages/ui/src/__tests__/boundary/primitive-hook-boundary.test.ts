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
//   2. Outside `primitives/`, no file imports the main `<name>` file of a
//      primitive that has a barrel. It imports the barrel or a leaf file. A
//      primitive with no barrel has no other entry, so its main file is open.

const primitivesDir = join(srcDir, 'primitives')

const testsDir = join(srcDir, '__tests__')

const HOOK_FILE = /^(?:use-[a-z0-9-]+|context)\.tsx?$/

// `export function useX`, `export const useX`, and `export const [XContext, useX]`.
const DECLARED_HOOK = /^export\s+(?:function\s+use[A-Z]|const\s+(?:use[A-Z]|\[[^\]]*\buse[A-Z]))/m

// `export { useX }` with no `from`: a local binding that the file exports.
const LISTED_HOOK = /^export\s+\{([^}]*)\}(?!\s*from)/gm

const PRIMITIVE_MAIN_IMPORT =
	/from\s+['"](?:\.\.\/)+primitives\/([a-z][a-z0-9-]*)\/\1(?:\.tsx?)?['"]/g

function exportsHook(source: string): boolean {
	if (DECLARED_HOOK.test(source)) return true

	for (const match of source.matchAll(LISTED_HOOK)) {
		if (/\buse[A-Z]/.test(match[1] ?? '')) return true
	}

	return false
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

			if (exportsHook(stripSourceComments(content))) violations.push(srcRelative(file))
		})

		expect(
			violations,
			`hook exported from a primitive file that is not use-* or context (CONVENTIONS.md §3.3):\n  ${violations.join('\n  ')}`,
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
