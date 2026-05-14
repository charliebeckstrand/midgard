/**
 * Enforces the file-naming convention documented in CLAUDE.md → "File naming".
 *
 * Walks every leaf folder under `packages/ui/src/components/` and verifies each
 * `.ts` / `.tsx` file is one of:
 *
 * - the main component file:   `<folder>.tsx`
 * - a prefixed sub-file:       `<folder>-<part>.tsx` (or singular stem when folder is plural)
 * - a prefixed hook:           `use-<folder>.ts(x)` or `use-<folder>-<hook>.ts(x)`
 *                              (singular stem also accepted when folder is plural)
 * - a permitted bare file:     `index.ts(x)`, `types.ts`, `context.ts(x)`, `slots.ts(x)`
 *
 * In addition, every component / hook file must export a symbol whose PascalCase
 * (or `useCamelCase`) form matches its kebab-case filename. `tag-input-badge.tsx`
 * must export `TagInputBadge`; `use-tag-input-keyboard.ts` must export
 * `useTagInputKeyboard`. Catches the case where a file is renamed but its
 * exported component or hook keeps the old, now-divergent name.
 *
 * Existing offenders are pinned in `filename-allowlist.json`. CI fails on any
 * file not on the allowlist that breaks the rule. The allowlist shrinks as the
 * convention is rolled out and is deleted in the final sweep.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, parse, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

const componentsRoot = join(here, '..', 'src', 'components')

const allowlistPath = join(here, 'filename-allowlist.json')

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

// Suffixes that name a collection of helpers rather than a single component or hook.
// Files matching these are exempt from the filename-vs-symbol match.
const UTILITY_SUFFIXES = ['-utilities', '-helpers', '-constants'] as const

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

		const path = relative(componentsRoot, join(folderPath, file))

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

function reportAndExit(header: string, lines: string[], hint: string): never {
	console.error(`\n${lines.length} ${header}:\n`)

	for (const line of lines) console.error(`  ${line}`)

	console.error(`\n${hint}\n`)

	process.exit(1)
}

const folders = listLeafFolders(componentsRoot)

const violations = folders.flatMap(checkFolder)

if (process.argv.includes('--write-allowlist')) {
	const paths = violations.map((v) => v.path).sort()

	writeFileSync(allowlistPath, `${JSON.stringify(paths, null, '\t')}\n`)

	console.log(`Wrote ${paths.length} entries to ${relative(process.cwd(), allowlistPath)}`)

	process.exit(0)
}

const allowlist: string[] = existsSync(allowlistPath)
	? JSON.parse(readFileSync(allowlistPath, 'utf8'))
	: []

const allowed = new Set(allowlist)

const violationPaths = new Set(violations.map((v) => v.path))

const newViolations = violations.filter((v) => !allowed.has(v.path))

const staleEntries = allowlist.filter((p) => !violationPaths.has(p))

if (newViolations.length > 0) {
	reportAndExit(
		'filename violation(s) in packages/ui/src/components',
		newViolations.flatMap((v) => [v.path, `    ${v.reason}`]),
		'See CLAUDE.md → "File naming" for the rule.',
	)
}

if (staleEntries.length > 0) {
	reportAndExit(
		'stale allowlist entry/ies (file no longer exists or no longer violates)',
		staleEntries,
		'Remove them from packages/ui/scripts/filename-allowlist.json.',
	)
}

console.log(`OK · ${folders.length} folders checked · ${allowlist.length} allowlisted`)
