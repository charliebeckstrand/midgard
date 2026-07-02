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

// Entries no boundary scan should descend into: test/bench trees, build
// output, and dot-directories. data-slot-boundary deliberately keeps its own
// collector because its rule covers test files too.
const SKIP = new Set(['__tests__', '__benchmarks__', 'node_modules', 'dist'])

/**
 * Recursively visit every shipped source file under `dir` with its content.
 *
 * @remarks
 * Dot-entries, test and benchmark trees, and build output are skipped. Shared
 * by the boundary tests, which scan source layers for forbidden patterns.
 */
export function walkSource(dir: string, visit: (file: string, content: string) => void): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			walkSource(path, visit)
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
 * the `g` flag. Files not matching `fileFilter` are skipped; violation paths
 * are reported relative to `srcDir` (the package's `src/` by default).
 */
export function collectPatternViolations(options: {
	dir: string
	srcDir?: string
	patterns: readonly PatternRule[]
	fileFilter?: RegExp
}): string[] {
	const { dir, srcDir: root = srcDir, patterns, fileFilter = /\.(?:tsx?|mts|cts)$/ } = options

	const violations: string[] = []

	walkSource(dir, (file, content) => {
		if (!fileFilter.test(file)) return

		const rel = relative(root, file)

		for (const { label, regex } of patterns) {
			for (const match of content.matchAll(regex)) {
				violations.push(`${rel} → ${label} (${match[0]})`)
			}
		}
	})

	return violations
}
