import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	docsSites,
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Import a name from the file that declares it (CONVENTIONS §9.3). The one
// exception is a name in the main file or a component file of another unit:
// it comes through the barrel of that unit, because those files are the
// private layout of the unit. So a reader asks one question of each import:
// where is the name declared?
//
// The shared folders hold many unrelated files, so each file is its own home.
// Their barrels are for the apps: `core` is `ui/core` and `hooks` is `ui/hooks`.
// Inside `ui`, an import of such a barrel ties internal wiring to the public
// surface, and it hides the real edge from the import-graph gates.
//
// Only a barrel re-exports, so each name has one path in. The entry of a lazy
// chunk, a file that another file loads with `import()`, re-exports the
// modules of its chunk, so that one fetch loads them all.
//
// `recipes/` keeps the rules of `recipes/README.md`: a kata and a kumi read the
// recipe engine and the density scale through their barrels, so the scans skip
// it.

const SHARED = ['core', 'hooks', 'types', 'utilities']

const NO_BARREL = ['types', 'utilities']

const UNIT_TREES = ['components', 'modules', 'primitives', 'providers', 'structure', 'layouts']

const SKIP = new Set(['recipes'])

const SPECIFIER = /(?:^|\n)\s*(?:import|export)\s[^'"]*?\sfrom\s+'(\.[^']+)'/g

const NAMED_IMPORT = /(?:^|\n)\s*import\s+(?:type\s+)?\{([^}]*)\}\s*from\s+'(\.[^']+)'/g

const RELATIVE_REEXPORT = /(?:^|\n)\s*export\s+(?:type\s+)?\{[^}]*\}\s*from\s+'(\.[^']+)'/g

const DYNAMIC_IMPORT = /import\(\s*'(\.[^']+)'\s*\)/g

const BARREL_CLAUSE = /export\s+(?:type\s+)?\{([^}]*)\}\s*from\s+'([^']+)'/g

function resolveFile(from: string, specifier: string): string | undefined {
	const target = resolve(dirname(from), specifier.replace(/\.tsx?$/, ''))

	for (const candidate of [`${target}.ts`, `${target}.tsx`, join(target, 'index.ts')]) {
		if (existsSync(candidate)) return candidate
	}

	return undefined
}

function barrelDir(from: string, specifier: string): string | undefined {
	const target = resolve(dirname(from), specifier)

	if (!existsSync(target) || !statSync(target).isDirectory()) return undefined

	return existsSync(join(target, 'index.ts')) ? target : undefined
}

function isShared(dir: string): boolean {
	const rel = srcRelative(dir)

	return SHARED.some((root) => rel === root || rel.startsWith(`${root}/`))
}

/** The unit folder of a file, `<tree>/<name>`, or `undefined` outside a unit. */
function findUnit(file: string): string | undefined {
	const parts = srcRelative(file).split('/')

	if (parts.length < 3 || !UNIT_TREES.includes(parts[0] as string)) return undefined

	return join(srcDir, parts[0] as string, parts[1] as string)
}

/**
 * A file of the private layout of a unit: its main file, or a file that holds
 * components (a `.tsx` file other than `context.tsx`, or `slots.ts`).
 */
function isLayoutFile(file: string): boolean {
	const name = basename(file)

	const unit = findUnit(file)

	if (unit && name.replace(/\.tsx?$/, '') === basename(unit)) return true

	return name === 'slots.ts' || (name.endsWith('.tsx') && name !== 'context.tsx')
}

function importedNames(clause: string): string[] {
	return clause
		.split(',')
		.map((part) => part.trim().replace(/^type\s+/, ''))
		.filter(Boolean)
		.map((part) => part.split(/\s+as\s+/)[0] as string)
}

const barrels = new Map<string, Map<string, string>>()

/**
 * The file that declares each name that the barrel of `unit` exports. A barrel
 * names each export (CONVENTIONS §4.6), so the syntax gives the whole map.
 */
function barrelSources(unit: string): Map<string, string> {
	const cached = barrels.get(unit)

	if (cached) return cached

	const index = join(unit, 'index.ts')

	const sources = new Map<string, string>()

	barrels.set(unit, sources)

	for (const match of stripSourceComments(readFileSync(index, 'utf8')).matchAll(BARREL_CLAUSE)) {
		const file = resolveFile(index, match[2] as string)

		if (!file) continue

		for (const part of (match[1] as string).split(',')) {
			const exported = part
				.trim()
				.replace(/^type\s+/, '')
				.split(/\s+as\s+/)
				.at(-1)

			const local = part
				.trim()
				.replace(/^type\s+/, '')
				.split(/\s+as\s+/)[0]

			if (!exported || !local) continue

			// A nested barrel, such as `modules/chart/bar-chart`, passes the name on.
			const nested = basename(file) === 'index.ts' ? barrelSources(dirname(file)).get(local) : file

			if (nested) sources.set(exported, nested)
		}
	}

	return sources
}

function walkLibrary(visit: (file: string, code: string) => void): void {
	walkSource(
		srcDir,
		(file, content) => {
			if (isSourceFile(file)) visit(file, stripSourceComments(content))
		},
		new Set([...SKIP, ...docsSites]),
	)
}

describe('import home boundary', () => {
	it('no file in ui imports the barrel of a shared folder', () => {
		const violations: string[] = []

		walkSource(
			srcDir,
			(file, content) => {
				if (!isSourceFile(file)) return

				for (const match of stripSourceComments(content).matchAll(SPECIFIER)) {
					const specifier = match[1] as string

					const dir = barrelDir(file, specifier)

					if (dir && isShared(dir)) violations.push(`${srcRelative(file)} → ${specifier}`)
				}
			},
			SKIP,
		)

		expect(
			violations,
			`import each name from the file that declares it:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it.each(NO_BARREL)('%s has no barrel', (folder) => {
		expect(existsSync(join(srcDir, folder, 'index.ts'))).toBe(false)
	})

	it('across units, the private layout comes through the barrel and any other name from its file', () => {
		const violations: string[] = []

		walkLibrary((file, code) => {
			const own = findUnit(file)

			for (const match of code.matchAll(NAMED_IMPORT)) {
				const specifier = match[2] as string

				const target = resolveFile(file, specifier)

				const unit = target && findUnit(target)

				if (!target || !unit || unit === own || !existsSync(join(unit, 'index.ts'))) continue

				const sources = barrelSources(unit)

				for (const name of importedNames(match[1] as string)) {
					const source = sources.get(name)

					if (basename(target) === 'index.ts' && dirname(target) === unit) {
						if (source && !isLayoutFile(source)) {
							violations.push(`${srcRelative(file)}: ${name} from ${srcRelative(source)}`)
						}
					} else if (source === target && isLayoutFile(target)) {
						violations.push(`${srcRelative(file)}: ${name} from ${srcRelative(unit)}`)
					}
				}
			}
		})

		expect(violations, `import each name from its home:\n  ${violations.join('\n  ')}`).toEqual([])
	})

	it('only a barrel or the entry of a lazy chunk re-exports', () => {
		const chunkEntries = new Set<string>()

		const relays: [file: string, specifier: string][] = []

		walkLibrary((file, code) => {
			for (const match of code.matchAll(DYNAMIC_IMPORT)) {
				const entry = resolveFile(file, match[1] as string)

				if (entry) chunkEntries.add(entry)
			}

			if (basename(file) === 'index.ts') return

			for (const match of code.matchAll(RELATIVE_REEXPORT)) relays.push([file, match[1] as string])
		})

		const violations = relays
			.filter(([file]) => !chunkEntries.has(file))
			.map(([file, specifier]) => `${srcRelative(file)} → ${specifier}`)

		expect(
			violations,
			`import the name from its home, and drop the re-export:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
