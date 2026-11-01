import { basename, dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportedHooks, hookStem } from '../helpers/hook-files'
import { workspaceRoot, workspaceSources } from '../helpers/walk-source'

// The apps and the other packages keep their hooks in leaf files, as ui does
// (CONVENTIONS.md §3.4 and §3.5). `hook-file-boundary.test.ts` holds the rule
// in ui. This gate reads the files outside ui, so it runs in the `workspace`
// project.
//
//   1. A file that exports a hook is a `use-*` file, a `context` file, or a
//      `<feature>-queries` file, which holds the query hooks of a feature
//      (CONVENTIONS.md §6.4).
//   2. Each hook that a `use-*` file exports has the stem of the file in its
//      name. The folder of the file is its unit, and the stem leaves it out.

const SCAN_ROOTS = [
	join(workspaceRoot, 'apps'),
	join(workspaceRoot, 'packages', 'auth'),
	join(workspaceRoot, 'packages', 'shared'),
]

const HOOK_FILE = /^(?:use-[a-z0-9-]+|context|[a-z0-9-]+-queries)\.tsx?$/

describe('app hook file boundary', () => {
	const files = workspaceSources(SCAN_ROOTS)

	it('reads the source of each app and package', () => {
		expect(files.size).toBeGreaterThan(0)
	})

	it('a file exports each hook from a use-*, context, or queries file', () => {
		const violations = [...files]
			.filter(
				([file, content]) => !HOOK_FILE.test(basename(file)) && exportedHooks(content).length > 0,
			)
			.map(([file]) => file)

		expect(
			violations,
			`hook exported from a file that is not use-*, context, or *-queries (CONVENTIONS.md §3.5):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('a use-* file names each hook that it exports after the file', () => {
		const violations = [...files]
			.filter(([file]) => basename(file).startsWith('use-'))
			.flatMap(([file, content]) => {
				const stem = hookStem(file, basename(dirname(file)))

				return exportedHooks(content)
					.filter((hook) => !hook.slice(3).toLowerCase().includes(stem))
					.map((hook) => `${file}: ${hook}`)
			})

		expect(
			violations,
			`hook without the stem of its file in its name (rename the hook or the file):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
