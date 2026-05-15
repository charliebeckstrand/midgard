import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, parse, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Enforces the file-naming convention documented in CLAUDE.md → "File naming".
//
// Every `.ts` / `.tsx` file in a component folder must be one of:
//
//   - the main component file:   `<folder>.tsx`
//   - a prefixed sub-file:       `<folder>-<part>.tsx` (or singular stem when folder is plural)
//   - a prefixed hook:           `use-<folder>.ts(x)` or `use-<folder>-<hook>.ts(x)`
//                                (singular stem also accepted when folder is plural)
//   - a permitted bare file:     `index.ts(x)`, `types.ts`, `context.ts(x)`, `slots.ts(x)`,
//                                `variants.ts`
//
// In addition, every component / hook file must export a symbol whose
// PascalCase (or `useCamelCase`) form matches its kebab-case filename —
// `tag-input-badge.tsx` exports `TagInputBadge`, `use-tag-input-keyboard.ts`
// exports `useTagInputKeyboard`. Catches the case where a file is renamed but
// its exported component or hook keeps the old, now-divergent name.

const componentsDir = join(__dirname, '../../../components')

const BARE_ALLOWED = new Set([
	'index.ts',
	'index.tsx',
	'types.ts',
	'context.ts',
	'context.tsx',
	'slots.ts',
	'slots.tsx',
	'variants.ts',
])

// Suffixes that name a collection of helpers rather than a single component or
// hook. Files matching these are exempt from the filename-vs-symbol match.
const UTILITY_SUFFIXES = ['-utilities', '-helpers', '-constants'] as const

// Grandfathered files where renaming would break a stable public API
// (`Field`, `Label`, etc.). Never extend this list for new files — fix the
// file or fix the export.
const ALLOWLIST = new Set([
	'dl/description-details.tsx',
	'dl/description-list.tsx',
	'dl/description-term.tsx',
	'fieldset/description.tsx',
	'fieldset/field.tsx',
	'fieldset/label.tsx',
	'fieldset/legend.tsx',
	'fieldset/message.tsx',
])

type Violation = { path: string; reason: string }

function stem(file: string): string {
	return parse(file).name
}

function expectedSymbol(file: string): string {
	const base = stem(file)

	const isHook = base.startsWith('use-')

	const parts = (isHook ? base.slice(4) : base).split('-').filter(Boolean)

	const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')

	return isHook ? `use${pascal}` : pascal
}

function isUtilityFile(file: string): boolean {
	const base = stem(file)

	return UTILITY_SUFFIXES.some((suffix) => base.endsWith(suffix))
}

function acceptedStems(folderName: string): string[] {
	if (folderName.endsWith('s') && folderName.length > 1) {
		return [folderName, folderName.slice(0, -1)]
	}

	return [folderName]
}

function classifyName(file: string, folderName: string, stems: string[]): string | null {
	if (file === 'component.tsx') {
		return `main file must be named \`${folderName}.tsx\``
	}

	if (file === `${folderName}.tsx`) return null

	if (file.startsWith('use-')) {
		const ok = stems.some(
			(s) => file === `use-${s}.ts` || file === `use-${s}.tsx` || file.startsWith(`use-${s}-`),
		)

		return ok ? null : `hook filename must start with \`use-${stems.join('` or `use-')}\``
	}

	const matchesStem = stems.some(
		(s) => file === `${s}.ts` || file === `${s}.tsx` || file.startsWith(`${s}-`),
	)

	return matchesStem ? null : `filename must be prefixed with \`${stems.join('-` or `')}-\``
}

function checkSymbolMatch(folderPath: string, file: string): string | null {
	if (isUtilityFile(file)) return null

	// `.ts` files that are not hooks are utility/data modules without a single
	// primary export to match. Component files use `.tsx`; only enforce the
	// symbol rule there and on hook files (which always start with `use-`).
	const isHook = file.startsWith('use-')

	if (!file.endsWith('.tsx') && !isHook) return null

	const expected = expectedSymbol(file)

	const content = readFileSync(join(folderPath, file), 'utf8')

	// Match `export function Foo`, `export const Foo`, `export class Foo`,
	// `export async function Foo`, or `export { ..., Foo, ... }`.
	const pattern = new RegExp(
		`export\\s+(?:async\\s+)?(?:function|const|class|let)\\s+${expected}\\b|` +
			`export\\s*\\{[^}]*\\b${expected}\\b`,
	)

	return pattern.test(content) ? null : `expected an exported \`${expected}\` matching the filename`
}

function listLeafFolders(root: string): string[] {
	const out: string[] = []

	const walk = (dir: string) => {
		const entries = readdirSync(dir, { withFileTypes: true })

		if (entries.some((e) => e.isFile())) out.push(dir)

		for (const entry of entries) {
			if (entry.isDirectory()) walk(join(dir, entry.name))
		}
	}

	walk(root)

	return out
}

function checkFolder(folderPath: string): Violation[] {
	const folderName = basename(folderPath)

	const stems = acceptedStems(folderName)

	const violations: Violation[] = []

	for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
		if (!entry.isFile()) continue

		const file = entry.name

		if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue

		if (file.endsWith('.d.ts')) continue

		if (BARE_ALLOWED.has(file)) continue

		const path = relative(componentsDir, join(folderPath, file))

		const nameReason = classifyName(file, folderName, stems)

		if (nameReason) {
			violations.push({ path, reason: nameReason })
			continue
		}

		const symbolReason = checkSymbolMatch(folderPath, file)

		if (symbolReason) violations.push({ path, reason: symbolReason })
	}

	return violations
}

describe('component filename boundary', () => {
	const folders = listLeafFolders(componentsDir)

	const violations = folders.flatMap(checkFolder)

	const newViolations = violations.filter((v) => !ALLOWLIST.has(v.path))

	const violationPaths = new Set(violations.map((v) => v.path))

	const staleEntries = [...ALLOWLIST].filter((p) => !violationPaths.has(p))

	it('every component file matches the filename convention', () => {
		expect(
			newViolations,
			`filename violation(s) in packages/ui/src/components — see CLAUDE.md → "File naming":\n${newViolations
				.map((v) => `  ${v.path}\n    ${v.reason}`)
				.join('\n')}`,
		).toEqual([])
	})

	it('the allowlist does not contain stale entries', () => {
		expect(
			staleEntries,
			`stale allowlist entry/ies (file no longer exists or no longer violates) — remove them from ALLOWLIST:\n${staleEntries
				.map((p) => `  ${p}`)
				.join('\n')}`,
		).toEqual([])
	})
})
