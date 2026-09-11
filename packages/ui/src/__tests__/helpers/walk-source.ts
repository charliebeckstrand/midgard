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

// The docblock Vitest reads for a per-file environment, with Vitest's own
// pattern: anywhere in the file, either spelling.
const DOCBLOCK_ENVIRONMENT = /@(?:vitest|jest)-environment\s+([\w-]+)\b/

/**
 * The environment a test file declares in its docblock, or `undefined` when
 * it declares none. One reader for `vitest.config.ts`, which builds the
 * `pure` project from it, and `node-environment-boundary.test.ts`, which
 * holds it to the file's DOM use.
 */
export function docblockEnvironment(content: string): string | undefined {
	return DOCBLOCK_ENVIRONMENT.exec(content)?.[1]
}

/**
 * Blank the comments in a source text, so a rule that bans a call does not
 * read prose that names the call as a violation.
 *
 * Line comments go first: a block opener inside one — `providers/*` in prose —
 * would otherwise open a block match that runs to the next block closer
 * anywhere in the file and blanks every line between. Block comments are then
 * stripped only where the opener starts a line, so an opener inside a string
 * cannot open one either. The strip is textual, so it also blanks a `//`
 * inside a string literal.
 */
export function stripSourceComments(text: string): string {
	return text.replace(/\/\/.*$/gm, '').replace(/^[ \t]*\{?[ \t]*\/\*[\s\S]*?\*\//gm, '')
}

/**
 * Scan a source layer for forbidden patterns and return human-readable
 * violation lines (`relative/path → label (match)`), ready for an
 * `expect(violations, …).toEqual([])` assertion. `regex` rules must carry
 * the `g` flag. Files not matching `fileFilter` are skipped, and `skip` prunes
 * directory entries by name before the read; violation paths are reported
 * relative to `srcDir`. Set `stripComments` when a rule bans a call rather than
 * a token, so prose that names the call does not read as a violation; see
 * {@link stripSourceComments} for what the strip can and cannot see.
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

			const text = stripComments ? stripSourceComments(content) : content

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
