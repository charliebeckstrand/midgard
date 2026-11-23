// @vitest-environment node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
	workspaceKey,
	workspaceRoot,
} from '../helpers/walk-source'

// A `'use no memo'` directive keeps the React Compiler off one function. The
// skip gate (`compiler/react-compiler-skips.test.ts`) does not report such a
// function, so this list is the one record of each opt-out. Each function
// states its reason in its TSDoc, and a change to the list shows in the diff of
// the commit that makes it.
//
//   - `useWindowVirtualizer`: the virtualizer keeps one identity, and its reads
//     are live, so a compiled read of the window goes stale. It gives each
//     render its window as plain values, so `useVirtualWindow` compiles. The
//     opt-out is permanent, because the compiler marks react-virtual as
//     incompatible.

const OPT_OUTS = {
	'hooks/use-virtual-window.ts': 1,
}

const OPT_OUT = /(['"])use no memo\1/g

// A suppression of the dependency lint: for one line, for a range
// (`-start`), or for the file (`-all`). The pattern joins its parts, so this
// file does not match itself.
const DEPENDENCY_IGNORE = new RegExp(
	['biome', 'ignore(?:-all|-start)? lint/correctness/useExhaustive'].join('-'),
)

// The apps compile with the React Compiler too (`reactCompiler` in
// `auth/config`), so the scan of the suppression reads them and the packages
// that they render.
const COMPILED_ROOTS = [
	srcDir,
	join(workspaceRoot, 'apps'),
	join(workspaceRoot, 'packages', 'auth', 'src'),
	join(workspaceRoot, 'packages', 'shared', 'src'),
]

describe('React Compiler opt-outs', () => {
	it('only the listed functions keep the compiler off', () => {
		const found: Record<string, number> = {}

		walkSource(srcDir, (file, content) => {
			if (!isSourceFile(file)) return

			const count = stripSourceComments(content).match(OPT_OUT)?.length ?? 0

			if (count > 0) found[srcRelative(file)] = count
		})

		expect(found).toEqual(OPT_OUTS)
	})

	// The compiler caches on the dependencies that the lint reads, so a
	// suppressed lint hides a stale value (CONVENTIONS §10.7). The
	// `no-unused-layout-read` Biome plugin holds the other half of §10.7: a bare
	// layout read and a `void` of a name.
	it('no compiled source suppresses the exhaustive dependency lint', () => {
		const found: string[] = []

		for (const root of COMPILED_ROOTS.filter((dir) => existsSync(dir))) {
			walkSource(
				root,
				(file, content) => {
					if (DEPENDENCY_IGNORE.test(content)) found.push(workspaceKey(file))
				},
				undefined,
				isSourceFile,
			)
		}

		expect(found, 'list what the effect or the memo reads (CONVENTIONS §10.7)').toEqual([])
	})
})
