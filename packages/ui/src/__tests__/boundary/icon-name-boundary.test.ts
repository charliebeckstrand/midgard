// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workspaceRoot, workspaceSources } from '../helpers/walk-source'

// Icon name boundary.
//
// lucide exports each icon under its own name and under the old names of the
// icon, such as `AlertTriangle` for `TriangleExclamationPoint` and `Trash2` for
// `Trash`. Two names for one icon hide that two places show the same glyph,
// and the site of lucide finds an icon only by its own name. So an import from
// `lucide-react` uses the own name of the icon. The `Icon` form of a name, such
// as `MapIcon`, passes only where the own name hides a global, such as `Map`.
//
// For each action, the apps and the docs show one icon. The table below gives
// each icon that shows an action whose icon is another one.

/** The names that `lucide-react` exports: the own name of each icon, and each other name with the own name it stands for. */
function readLucideNames(): { own: Set<string>; other: Map<string, string> } {
	const require = createRequire(import.meta.url)

	const types = join(
		dirname(require.resolve('lucide-react/package.json')),
		'dist',
		'lucide-react.d.ts',
	)

	const own = new Set<string>()
	const other = new Map<string, string>()

	for (const [, list] of readFileSync(types, 'utf8').matchAll(
		/export\s*(?:type\s*)?\{([^}]*)\}/g,
	)) {
		for (const entry of (list ?? '').split(',')) {
			const [name, as] = entry
				.trim()
				.replace(/^type\s+/, '')
				.split(/\s+as\s+/)

			if (!name) continue

			if (as === undefined || as === name) own.add(name)
			else other.set(as, name)
		}
	}

	for (const name of own) other.delete(name)

	return { own, other }
}

/** Each icon that shows an action whose icon is another one, and the icon of the action. */
const NOT_ICONS: ReadonlyMap<string, string> = new Map([
	['SquarePen', 'Pencil (edit)'],
	['Cog', 'Settings (settings)'],
])

/** The names that a source imports from `lucide-react`. */
function lucideImports(code: string): string[] {
	return [...code.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'lucide-react'/g)].flatMap(
		([, list]) =>
			(list ?? '')
				.split(',')
				.map(
					(entry) =>
						entry
							.trim()
							.replace(/^type\s+/, '')
							.split(/\s+as\s+/)[0] ?? '',
				)
				.filter(Boolean),
	)
}

/** The fix for one imported name, or nothing when the name passes. */
function iconFix(
	name: string,
	names: { own: ReadonlySet<string>; other: ReadonlyMap<string, string> },
): string | undefined {
	const icon = NOT_ICONS.get(name)

	if (icon !== undefined) return `${name} (use ${icon})`

	const own = names.other.get(name)

	if (own === undefined) return undefined

	// The `Icon` form keeps a global, such as `Map`, in reach.
	if (name === `${own}Icon` && own in globalThis) return undefined

	return `${name} (use ${own})`
}

describe('icon name boundary', () => {
	const names = readLucideNames()

	const files = workspaceSources([join(workspaceRoot, 'apps'), join(workspaceRoot, 'packages')])

	it('reads the names of lucide and the sources of the workspace', () => {
		// A read that found no name would pass the case below with an empty list.
		expect(names.own.size).toBeGreaterThan(1000)

		expect(names.other.size).toBeGreaterThan(100)

		expect(files.size).toBeGreaterThan(500)
	})

	it('imports each icon by its own name, and one icon for each action', () => {
		const violations = [...files].flatMap(([file, code]) =>
			lucideImports(code).flatMap((name) => {
				const fix = iconFix(name, names)

				return fix === undefined ? [] : [`${file}: ${fix}`]
			}),
		)

		expect(
			violations,
			`icons with another name or another icon:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('finds an old name and an icon of the table, and passes the Icon form of a global', () => {
		const code = `import { AlertTriangle, Cog, MapIcon, PencilIcon, Trash, type LucideIcon } from 'lucide-react'`

		expect(lucideImports(code).flatMap((name) => iconFix(name, names) ?? [])).toEqual([
			'AlertTriangle (use TriangleExclamationPoint)',
			'Cog (use Settings (settings))',
			'PencilIcon (use Pencil)',
		])
	})
})
