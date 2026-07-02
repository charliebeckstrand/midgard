import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// Spacing boundary.
//
// `ma` is a TypeScript label set that maps semantic sizes (xs/sm/md/lg/xl)
// to Tailwind numeric spacing tokens. Two rules:
//
//   1. No file may use the `p-{ma}`, `m-{ma}`, `gap-{ma}` shape. Compose
//      Tailwind natives directly (`p-3`, `gap-2`) from `ma`'s values via
//      a static `Record<Ma, string>` lookup.
//
//   2. The `calc(--spacing(v)-1px)` formula (ring-compensated padding) lives
//      only in `recipes/kiso/kasane.ts`; consumers reach it through
//      `kasane.p / px / py / pl / pr`.
//
// Both rules carry an ALLOWLIST of files exempt from the check. The first
// list is empty. The second retains entries whose
// remaining `calc(--spacing(…))` literals carry Tailwind variant prefixes
// (`data-*`, `has-*`, `autofill:*`); variants must appear in source and
// can't move behind the kasane helpers.

// Kiso roots are listed individually because not every kiso family exists in
// every checkout; missing roots are filtered rather than walked.
const SCAN_ROOTS = [
	join(srcDir, 'recipes/kata'),
	join(srcDir, 'recipes/katakana'),
	join(srcDir, 'recipes/kiso/control'),
	join(srcDir, 'recipes/kiso/popover'),
	join(srcDir, 'recipes/kiso/segment'),
	join(srcDir, 'recipes/kiso/slider'),
	join(srcDir, 'components'),
].filter((root) => existsSync(root))

const RENAMED_UTILITY =
	/\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-(?:xs|sm|md|lg|xl)\b/

const RAW_CALC = /calc\(--spacing\(/

/** Empty: no files are exempt. */
const RENAMED_UTILITY_ALLOWLIST = new Set<string>()

/**
 * Files that spell `calc(--spacing(v)-1px)` inline: variant-prefixed
 * cases (`data-*:py-[…]`, `has-*:pl-[…]`, `autofill:ml-[…]`) must appear
 * in source; Tailwind variants can't move behind the kasane helpers.
 */
const RAW_CALC_ALLOWLIST = new Set([
	'recipes/kiso/control/affix.ts',
	'recipes/kata/button.ts',
	'recipes/kata/tag-input.ts',
])

describe('spacing boundary', () => {
	it('no file outside the allowlist uses the legacy renamed spacing utilities', () => {
		const violations: string[] = []

		for (const root of SCAN_ROOTS) {
			walkSource(root, (path, source) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

				const rel = relative(srcDir, path)

				if (RENAMED_UTILITY_ALLOWLIST.has(rel)) return

				if (RENAMED_UTILITY.test(source)) violations.push(rel)
			})
		}

		expect(
			violations,
			`new files using legacy renamed spacing utilities (compose Tailwind natives from \`ma\` instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('no file outside kasane uses inline `calc(--spacing(...))`', () => {
		const violations: string[] = []

		for (const root of SCAN_ROOTS) {
			walkSource(root, (path, source) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

				const rel = relative(srcDir, path)

				if (RAW_CALC_ALLOWLIST.has(rel)) return

				if (RAW_CALC.test(source)) violations.push(rel)
			})
		}

		expect(
			violations,
			`new files writing inline calc(--spacing(...)) (use kasane.p / px / py / pl / pr instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
