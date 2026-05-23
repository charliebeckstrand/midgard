import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Spacing boundary.
//
// `ma` is a TypeScript label set that maps semantic sizes (xs/sm/md/lg/xl)
// to Tailwind numeric spacing tokens. Two rules keep the abstraction honest:
//
//   1. No file may use the legacy `p-{ma}`, `m-{ma}`, `gap-{ma}` utilities.
//      Those are projected by an `@utility` rename layer in `src/theme.css`
//      that is being retired. Compose Tailwind natives directly (`p-3`,
//      `gap-2`) from `ma`'s values via a static `Record<Ma, string>` lookup.
//
//   2. The `calc(--spacing(v)-1px)` formula (ring-compensated padding) lives
//      only in `recipes/kiso/kasane.ts` — consumers reach it through
//      `kasane.p / px / py / pl / pr`. Inline literals are forbidden so the
//      formula has a single source of truth.
//
// Each rule carries an ALLOWLIST of files that haven't been migrated yet.
// Entries are removed as the sweep proceeds; when both lists are empty,
// `src/theme.css` can be deleted.

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

/**
 * Files still spelling `p-{ma}` / `m-{ma}` / `gap-{ma}` from the legacy
 * `theme.css` rename layer. Each entry will be removed as the sweep
 * migrates that file to Tailwind natives composed from `ma`.
 */
const RENAMED_UTILITY_ALLOWLIST = new Set([
	'components/alert/alert.tsx',
	'components/box/variants.ts',
	'components/card/card-body.tsx',
	'components/card/card-footer.tsx',
	'components/card/card-header.tsx',
	'components/flex/variants.ts',
	'components/grid/variants.ts',
	'components/split/variants.ts',
	'recipes/genkei/control.ts',
	'recipes/genkei/segment.ts',
	'recipes/kata/accordion.ts',
	'recipes/kata/alert.ts',
	'recipes/kata/badge.ts',
	'recipes/kata/bottom-nav.ts',
	'recipes/kata/breadcrumb.ts',
	'recipes/kata/button.ts',
	'recipes/kata/calendar.ts',
	'recipes/kata/collapse.ts',
	'recipes/kata/command-palette.ts',
	'recipes/kata/data-table-column-manager.ts',
	'recipes/kata/data-table.ts',
	'recipes/kata/editable-grid.ts',
	'recipes/kata/file-upload.ts',
	'recipes/kata/json-tree.ts',
	'recipes/kata/kanban.ts',
	'recipes/kata/list.ts',
	'recipes/kata/nav.ts',
	'recipes/kata/pagination.ts',
	'recipes/kata/password-strength.ts',
	'recipes/kata/pdf-viewer.ts',
	'recipes/kata/sidebar.ts',
	'recipes/kata/signature-pad.ts',
	'recipes/kata/stat.ts',
	'recipes/kata/table.ts',
	'recipes/kata/tabs.ts',
	'recipes/kata/tooltip.ts',
])

/**
 * Files still spelling `calc(--spacing(v)-1px)` inline. Bare cases will
 * migrate to `kasane.p / px / py / pl / pr`; variant-prefixed cases
 * (`data-*:py-[…]`, `has-*:pl-[…]`) stay inline by necessity, so these
 * files may remain on the list with reduced surface after the sweep.
 */
const RAW_CALC_ALLOWLIST = new Set([
	'recipes/genkei/control.ts',
	'recipes/kata/badge.ts',
	'recipes/kata/button.ts',
])

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
