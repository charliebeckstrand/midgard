import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseReExports } from 'docs/plugins'
import { describe, expect, it } from 'vitest'

// This file lives at packages/ui/src/__tests__/docs/; climb to the package root.
const UI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const SRC = join(UI_ROOT, 'src')

const DOCS = join(UI_ROOT, 'docs')

/**
 * Every `` `identifier` `` span in a markdown surface index, excluding fenced
 * code blocks so import examples don't count as documentation. Captures both
 * symbol names (`useControllable`) and kebab directory names (`pivot-table`).
 */
function documentedTokens(mdFile: string): Set<string> {
	const withoutFences = readFileSync(join(DOCS, mdFile), 'utf-8').replace(/```[\s\S]*?```/g, '')

	return new Set(
		[...withoutFences.matchAll(/`([A-Za-z][\w-]*)`/g)].map(([, name]) => name as string),
	)
}

/** PascalCase / camelCase value exports a barrel re-exports (types excluded). */
function barrelValueExports(relPath: string): string[] {
	const file = join(SRC, relPath)

	return parseReExports(readFileSync(file, 'utf-8'), file)
		.filter((re) => !re.isType)
		.map((re) => re.exportedName)
}

function subdirectories(relPath: string): string[] {
	return readdirSync(join(SRC, relPath), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
}

/**
 * Guards the curated surface indexes under `packages/ui/docs/` against the
 * barrels they index (CONVENTIONS §12.2): adding a public export without
 * documenting it fails here rather than drifting silently. Flat surfaces are
 * checked per value export; directory surfaces (one index entry per unit) are
 * checked per directory, matching the convention's granularity.
 */
describe('surface index ⇄ source sync (CONVENTIONS §12.2)', () => {
	it.each([
		['CORE.md', 'core/index.ts'],
		['HOOKS.md', 'hooks/index.ts'],
		['UTILITIES.md', 'utilities/index.ts'],
		['LAYOUTS.md', 'layouts/index.ts'],
	])('%s documents every value export of %s', (mdFile, barrel) => {
		const exports = barrelValueExports(barrel)

		// Guard against a vacuous pass if the barrel ever fails to parse.
		expect(exports.length, `no value exports parsed from ${barrel}`).toBeGreaterThan(0)

		const documented = documentedTokens(mdFile)

		const undocumented = exports.filter((name) => !documented.has(name))

		expect(undocumented, `value exports missing from ${mdFile}`).toEqual([])
	})

	it.each([
		['COMPONENTS.md', 'components'],
		['MODULES.md', 'modules'],
		['PRIMITIVES.md', 'primitives'],
	])('%s lists every %s directory', (mdFile, dir) => {
		const dirs = subdirectories(dir)

		expect(dirs.length, `no directories found under ${dir}`).toBeGreaterThan(0)

		const documented = documentedTokens(mdFile)

		const missing = dirs.filter((name) => !documented.has(name))

		expect(missing, `directories missing from ${mdFile}`).toEqual([])
	})

	it('PROVIDERS.md documents every provider directory', () => {
		const md = readFileSync(join(DOCS, 'PROVIDERS.md'), 'utf-8')

		const dirs = subdirectories('providers')

		expect(dirs.length).toBeGreaterThan(0)

		const missing = dirs.filter((name) => !md.includes(`providers/${name}`))

		expect(missing, 'provider directories missing from PROVIDERS.md').toEqual([])
	})
})
