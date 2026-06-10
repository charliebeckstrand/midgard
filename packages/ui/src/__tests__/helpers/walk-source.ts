import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Recursively visit every file under `dir` with its content. Dotfiles and
 * dot-directories are skipped. Shared by the boundary tests, which scan
 * source layers for forbidden patterns.
 */
export function walkSource(dir: string, visit: (file: string, content: string) => void): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue

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
 * the `g` flag. Files not matching `fileFilter` are skipped.
 */
export function collectPatternViolations(options: {
	dir: string
	srcDir: string
	patterns: readonly PatternRule[]
	fileFilter?: RegExp
}): string[] {
	const { dir, srcDir, patterns, fileFilter = /\.(?:tsx?|mts|cts)$/ } = options

	const violations: string[] = []

	walkSource(dir, (file, content) => {
		if (!fileFilter.test(file)) return

		const rel = relative(srcDir, file)

		for (const { label, regex } of patterns) {
			for (const match of content.matchAll(regex)) {
				violations.push(`${rel} → ${label} (${match[0]})`)
			}
		}
	})

	return violations
}
