import { basename } from 'node:path'

// The reads that the hook file gates share: `hook-file-boundary.test.ts` for
// ui and `app-hook-file-boundary.test.ts` for the apps (CONVENTIONS.md §3.4,
// §3.5, and §6.4).

// `export function useX`, `export const useX`, and `export const [XContext, useX]`.
const DECLARED_HOOK = /^export\s+(?:function|const)\s+(use[A-Z]\w*|\[[^\]]*\])/gm

// `export { useX }` with no `from`: a local binding that the file exports.
const LISTED_HOOK = /^export\s+\{([^}]*)\}(?!\s*from)/gm

/** The names of the hooks that `source` declares and exports. Strip the comments first. */
export function exportedHooks(source: string): string[] {
	const hooks: string[] = []

	for (const match of source.matchAll(DECLARED_HOOK)) hooks.push(...hookNames(match[1] ?? ''))

	for (const match of source.matchAll(LISTED_HOOK)) hooks.push(...hookNames(match[1] ?? ''))

	return hooks
}

function hookNames(text: string): string[] {
	return text.match(/\buse[A-Z]\w*/g) ?? []
}

/**
 * The stem of a `use-*` file in lowercase with no hyphens, less the unit:
 * `use-grid-active-cell.ts` in `modules/grid` gives `activecell`.
 *
 * @param unit - The unit that the folder of the file names, or `null` for a
 *   folder that names no unit.
 */
export function hookStem(file: string, unit: string | null): string {
	const base = basename(file)
		.replace(/^use-/, '')
		.replace(/\.tsx?$/, '')

	const units = unit === null ? [] : [unit, unit.replace(/s$/, '')]

	const prefix = units.find((name) => base.startsWith(`${name}-`))

	return (prefix ? base.slice(prefix.length + 1) : base).replaceAll('-', '')
}
