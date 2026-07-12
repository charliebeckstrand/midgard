import { readdirSync, readFileSync } from 'node:fs'
import { join, parse, relative } from 'node:path'

// Shared machinery for the filename-boundary suites: the naming grammar from
// CLAUDE.md → "File naming", applied per leaf folder by
// `component-filename-boundary.test.ts` (components/) and
// `module-filename-boundary.test.ts` (modules/, which layers the engine
// layout rules on top).

export type Violation = { path: string; reason: string }

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

// Suffixes that name a collection of utilities rather than a single component
// or hook. Files matching these are exempt from the filename-vs-symbol match.
const UTILITY_SUFFIXES = ['-utilities', '-constants'] as const

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

export function listLeafFolders(root: string): string[] {
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

/**
 * Applies the folder naming grammar to one folder's files: `folderName`
 * supplies the accepted stems and `pathBase` anchors the reported paths.
 */
export function checkFolder(folderPath: string, folderName: string, pathBase: string): Violation[] {
	const stems = acceptedStems(folderName)

	const violations: Violation[] = []

	for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
		if (!entry.isFile()) continue

		const file = entry.name

		if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue

		if (file.endsWith('.d.ts')) continue

		if (BARE_ALLOWED.has(file)) continue

		const path = relative(pathBase, join(folderPath, file))

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
