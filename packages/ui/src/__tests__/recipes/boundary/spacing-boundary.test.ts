import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Spacing boundary.
//
// `ma` is a TypeScript label set that maps semantic sizes (xs/sm/md/lg/xl)
// to Tailwind numeric spacing tokens. Two rules keep the abstraction honest:
//
//   1. No file may use the `p-{ma}`, `m-{ma}`, `gap-{ma}` shape. Compose
//      Tailwind natives directly (`p-3`, `gap-2`) from `ma`'s values via
//      a static `Record<Ma, string>` lookup.
//
//   2. The `calc(--spacing(v)-1px)` formula (ring-compensated padding) lives
//      only in `recipes/kiso/kasane.ts` — consumers reach it through
//      `kasane.p / px / py / pl / pr`. Inline literals are forbidden so the
//      formula has a single source of truth.
//
// Both rules carry an ALLOWLIST of files exempt from the check. The first
// list is empty — every legacy-utility consumer has migrated. The second
// retains entries whose remaining `calc(--spacing(…))` literals carry
// Tailwind variant prefixes (`data-*`, `has-*`, `autofill:*`); variants
// must appear in source and so can't move behind the kasane helpers.

const srcDir = join(__dirname, '../../..')

const SCAN_ROOTS = [
	join(srcDir, 'recipes/kata'),
	join(srcDir, 'recipes/katakana'),
	join(srcDir, 'recipes/genkei'),
	join(srcDir, 'components'),
]

const RENAMED_UTILITY =
	/\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-(?:xs|sm|md|lg|xl)\b/

const RAW_CALC = /calc\(--spacing\(/

/** Empty — every file has migrated. The rule is now a regression guard. */
const RENAMED_UTILITY_ALLOWLIST = new Set<string>()

/**
 * Files still spelling `calc(--spacing(v)-1px)` inline — variant-prefixed
 * cases (`data-*:py-[…]`, `has-*:pl-[…]`, `autofill:ml-[…]`) stay inline
 * because Tailwind variants must appear in source, not at runtime. The
 * bare cases in these files have already migrated to `kasane.p / px / py /
 * pl / pr`.
 */
const RAW_CALC_ALLOWLIST = new Set(['recipes/genkei/control.ts', 'recipes/kata/button.ts'])

describe('spacing boundary', () => {
	it('no file outside the allowlist uses the legacy renamed spacing utilities', () => {
		const violations: string[] = []

		for (const root of SCAN_ROOTS) {
			for (const path of walk(root)) {
				const rel = relative(srcDir, path)

				if (RENAMED_UTILITY_ALLOWLIST.has(rel)) continue

				const source = readFileSync(path, 'utf8')

				if (RENAMED_UTILITY.test(source)) violations.push(rel)
			}
		}

		expect(
			violations,
			`new files using legacy renamed spacing utilities (compose Tailwind natives from \`ma\` instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('no file outside kasane uses inline `calc(--spacing(...))`', () => {
		const violations: string[] = []

		for (const root of SCAN_ROOTS) {
			for (const path of walk(root)) {
				const rel = relative(srcDir, path)

				if (RAW_CALC_ALLOWLIST.has(rel)) continue

				const source = readFileSync(path, 'utf8')

				if (RAW_CALC.test(source)) violations.push(rel)
			}
		}

		expect(
			violations,
			`new files writing inline calc(--spacing(...)) (use kasane.p / px / py / pl / pr instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})

function* walk(dir: string): Generator<string> {
	if (!exists(dir)) return

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === '__tests__' || entry.name === '__benchmarks__') continue

		if (entry.name === 'node_modules' || entry.name === 'dist') continue

		if (entry.name.startsWith('.')) continue

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			yield* walk(path)
		} else if (entry.isFile() && /\.(?:tsx?|mts|cts)$/.test(entry.name)) {
			yield path
		}
	}
}

function exists(path: string): boolean {
	try {
		statSync(path)

		return true
	} catch {
		return false
	}
}
