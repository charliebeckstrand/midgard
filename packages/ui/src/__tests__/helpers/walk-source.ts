import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Absolute path of the package's `src/` directory.
 *
 * @remarks
 * The single root the boundary tests resolve source layers from
 * (`join(srcDir, 'components')`, …), so a relocated test file can't silently
 * point its scan at the wrong tree.
 */
export const srcDir = join(__dirname, '..', '..')

// Entries a scan of the shipped tree must not descend into: test and bench
// trees, build output, and dot-directories. A caller that scans the test tree
// hands in its root directly, which no entry filter can prune — see
// test-isolation-boundary. data-slot-boundary keeps its own collector for the
// same reason, plus a rule that spans both trees at once.
const SKIP = new Set(['__tests__', '__benchmarks__', 'node_modules', 'dist'])

/**
 * Recursively visit every file under `dir` with its content.
 *
 * @remarks
 * Dot-entries, test and benchmark trees, and build output are skipped, plus
 * any caller-supplied `skip` entry names — pruned before the read, so an
 * excluded tree costs no I/O. `dir` itself is never pruned, so a caller can
 * point this at a tree the default set excludes. Shared by the boundary tests,
 * which scan source layers for forbidden patterns.
 */
export function walkSource(
	dir: string,
	visit: (file: string, content: string) => void,
	skip?: ReadonlySet<string>,
): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.') || SKIP.has(entry.name) || skip?.has(entry.name)) continue

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			walkSource(path, visit, skip)
		} else if (entry.isFile()) {
			visit(path, readFileSync(path, 'utf8'))
		}
	}
}

type PatternRule = { label: string; regex: RegExp }

/**
 * Scan a source layer for forbidden patterns and return human-readable
 * violation lines (`relative/path → label (match)`), ready for an
 * `expect(violations, …).toEqual([])` assertion. `regex` rules must carry
 * the `g` flag. Files not matching `fileFilter` are skipped, and `skip` prunes
 * directory entries by name before the read; violation paths are reported
 * relative to `srcDir`. Set `stripComments` when a rule bans a call rather than
 * a token, so prose that names the call does not read as a violation; the strip
 * is textual, so it also blanks a `//` inside a string literal.
 */
export function collectPatternViolations(options: {
	dir: string
	patterns: readonly PatternRule[]
	fileFilter?: RegExp
	skip?: ReadonlySet<string>
	stripComments?: boolean
}): string[] {
	const { dir, patterns, fileFilter = /\.(?:tsx?|mts|cts)$/, skip, stripComments = false } = options

	const violations: string[] = []

	walkSource(
		dir,
		(file, content) => {
			if (!fileFilter.test(file)) return

			const rel = relative(srcDir, file)

			// Line comments go first: a `/*` inside one — `providers/*` in prose —
			// would otherwise open a block match that runs to the next `*/`
			// anywhere in the file and blanks every line between. Block comments
			// are then stripped only where `/*` opens a line, so a `/*` inside a
			// string cannot open one either.
			const text = stripComments
				? content.replace(/\/\/.*$/gm, '').replace(/^[ \t]*\{?[ \t]*\/\*[\s\S]*?\*\//gm, '')
				: content

			for (const { label, regex } of patterns) {
				for (const match of text.matchAll(regex)) {
					violations.push(`${rel} → ${label} (${match[0]})`)
				}
			}
		},
		skip,
	)

	return violations
}
