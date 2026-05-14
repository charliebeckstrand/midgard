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
import { dirname, join, relative } from 'node:path'
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

type Violation = { path: string; reason: string }

function expectedSymbol(file: string): string {
	const base = file.replace(/\.tsx?$/, '')
	const isHook = base.startsWith('use-')
	const parts = (isHook ? base.slice(4) : base).split('-').filter(Boolean)
	const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
	return isHook ? `use${pascal}` : pascal
}

// Suffixes that name a collection of helpers rather than a single component or hook.
// Files matching these are exempt from the filename-vs-symbol match.
const UTILITY_SUFFIXES = ['-utilities', '-helpers', '-constants']

function isUtilityFile(file: string): boolean {
	const base = file.replace(/\.tsx?$/, '')
	return UTILITY_SUFFIXES.some((suffix) => base.endsWith(suffix))
}

function checkSymbolMatch(folderPath: string, file: string): Violation | null {
	if (isUtilityFile(file)) return null
	// `.ts` files that are not hooks are utility/data modules without a single
	// primary export to match. Component files use `.tsx`; only enforce the
	// symbol rule there and on hook files (which always start with `use-`).
	const isHook = file.startsWith('use-')
	if (!file.endsWith('.tsx') && !isHook) return null
	const content = readFileSync(join(folderPath, file), 'utf8')
	const expected = expectedSymbol(file)
	// Match `export function Foo`, `export const Foo`, `export class Foo`,
	// `export async function Foo`, or `export { ..., Foo, ... }`.
	const pattern = new RegExp(
		`export\\s+(?:async\\s+)?(?:function|const|class|let)\\s+${expected}\\b|` +
			`export\\s*\\{[^}]*\\b${expected}\\b`,
	)
	if (pattern.test(content)) return null
	return {
		path: relative(componentsRoot, join(folderPath, file)),
		reason: `expected an exported \`${expected}\` matching the filename`,
	}
}

function listLeafFolders(root: string): string[] {
	const out: string[] = []
	const walk = (dir: string) => {
		const entries = readdirSync(dir, { withFileTypes: true })
		const subdirs = entries.filter((e) => e.isDirectory())
		const files = entries.filter((e) => e.isFile())
		if (files.length > 0) out.push(dir)
		for (const d of subdirs) walk(join(dir, d.name))
	}
	walk(root)
	return out
}

function acceptedStems(folderName: string): string[] {
	const stems = [folderName]
	if (folderName.endsWith('s') && folderName.length > 1) {
		stems.push(folderName.slice(0, -1))
	}
	return stems
}

function checkFolder(folderPath: string): Violation[] {
	const folderName = folderPath.split('/').pop() as string
	const stems = acceptedStems(folderName)
	const violations: Violation[] = []

	for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
		if (!entry.isFile()) continue
		const file = entry.name
		if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue
		if (file.endsWith('.d.ts')) continue

		if (BARE_ALLOWED.has(file)) continue

		if (file === 'component.tsx') {
			violations.push({
				path: relative(componentsRoot, join(folderPath, file)),
				reason: `main file must be named \`${folderName}.tsx\``,
			})
			continue
		}

		const isMain = file === `${folderName}.tsx`
		const isHook = file.startsWith('use-')

		if (isHook) {
			const ok = stems.some(
				(stem) =>
					file === `use-${stem}.ts` ||
					file === `use-${stem}.tsx` ||
					file.startsWith(`use-${stem}-`),
			)
			if (!ok) {
				violations.push({
					path: relative(componentsRoot, join(folderPath, file)),
					reason: `hook filename must start with \`use-${stems.join('` or `use-')}\``,
				})
				continue
			}
		} else if (!isMain) {
			const matchesStem = stems.some(
				(stem) => file === `${stem}.ts` || file === `${stem}.tsx` || file.startsWith(`${stem}-`),
			)
			if (!matchesStem) {
				violations.push({
					path: relative(componentsRoot, join(folderPath, file)),
					reason: `filename must be prefixed with \`${stems.join('-` or `')}-\``,
				})
				continue
			}
		}

		const symbolViolation = checkSymbolMatch(folderPath, file)
		if (symbolViolation) violations.push(symbolViolation)
	}

	return violations
}

const folders = listLeafFolders(componentsRoot)
const violations = folders.flatMap(checkFolder)

const writeMode = process.argv.includes('--write-allowlist')
if (writeMode) {
	const paths = violations.map((v) => v.path).sort()
	writeFileSync(allowlistPath, `${JSON.stringify(paths, null, '\t')}\n`)
	console.log(`Wrote ${paths.length} entries to ${relative(process.cwd(), allowlistPath)}`)
	process.exit(0)
}

const allowlist: string[] = existsSync(allowlistPath)
	? JSON.parse(readFileSync(allowlistPath, 'utf8'))
	: []
const allowed = new Set(allowlist)
const allViolationPaths = new Set(violations.map((v) => v.path))

const newViolations = violations.filter((v) => !allowed.has(v.path))
const staleAllowlist = allowlist.filter((p) => !allViolationPaths.has(p))

if (newViolations.length > 0) {
	console.error(`\n${newViolations.length} filename violation(s) in packages/ui/src/components:\n`)
	for (const v of newViolations) {
		console.error(`  ${v.path}`)
		console.error(`    ${v.reason}`)
	}
	console.error('\nSee CLAUDE.md → "File naming" for the rule.\n')
	process.exit(1)
}

if (staleAllowlist.length > 0) {
	console.error(
		`\n${staleAllowlist.length} stale allowlist entry/ies (file no longer exists or no longer violates):\n`,
	)
	for (const p of staleAllowlist) console.error(`  ${p}`)
	console.error('\nRemove them from packages/ui/scripts/filename-allowlist.json.\n')
	process.exit(1)
}

console.log(`OK · ${folders.length} folders checked · ${allowlist.length} allowlisted`)
