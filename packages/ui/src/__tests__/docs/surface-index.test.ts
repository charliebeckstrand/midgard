// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	isClassDeclaration,
	isExportDeclaration,
	isFunctionDeclaration,
	isNamedExports,
	isVariableStatement,
	type Statement,
	SyntaxKind,
} from 'typescript/unstable/ast'
import { afterAll, describe, expect, it } from 'vitest'
import { startTypeScript, type TypeScriptServer } from '../helpers/ts-server'
import { isSourceFile, srcDir, uiRoot, walkSource } from '../helpers/walk-source'

const DOCS = join(uiRoot, 'docs')

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

/**
 * The names of the values that a barrel re-exports, such as `Button` from
 * `export { Button, type ButtonProps } from './button'`. A type-only statement
 * or specifier is not a value. The barrel names each re-export (CONVENTIONS
 * §4.6), so a parse of the syntax finds each one.
 */
function barrelValueExports(server: TypeScriptServer, relPath: string): string[] {
	const file = join(srcDir, relPath)

	const source = server.parse([file]).get(file)

	return (source?.statements ?? []).flatMap((statement) => {
		if (!isExportDeclaration(statement) || statement.isTypeOnly) return []

		const clause = statement.exportClause

		if (!statement.moduleSpecifier || !clause || !isNamedExports(clause)) return []

		return clause.elements.filter((element) => !element.isTypeOnly).map(({ name }) => name.text)
	})
}

/**
 * The names of the values that the files of a folder declare and export, such
 * as `clamp` from `export function clamp(…)`. A folder with no barrel, such as
 * `utilities`, has no export list of its own: each importer reads the file
 * (CONVENTIONS §9.3). A value whose doc comment holds `@internal` is left out.
 */
function folderValueExports(server: TypeScriptServer, relPath: string): string[] {
	const files: string[] = []

	walkSource(join(srcDir, relPath), (file) => {
		if (isSourceFile(file)) files.push(file)
	})

	return [...server.parse(files).values()].flatMap((source) =>
		source.statements.flatMap((statement) => {
			if (!isExported(statement)) return []

			const leading = source.text.slice(statement.pos, statement.getStart(source))

			if (leading.includes('@internal')) return []

			return declaredNames(statement)
		}),
	)
}

function isExported(statement: Statement): boolean {
	if (
		!isVariableStatement(statement) &&
		!isFunctionDeclaration(statement) &&
		!isClassDeclaration(statement)
	) {
		return false
	}

	return (
		statement.modifiers?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword) ?? false
	)
}

function declaredNames(statement: Statement): string[] {
	if (isVariableStatement(statement)) {
		return statement.declarationList.declarations.map((declaration) => declaration.name.getText())
	}

	if ((isFunctionDeclaration(statement) || isClassDeclaration(statement)) && statement.name) {
		return [statement.name.text]
	}

	return []
}

function subdirectories(relPath: string): string[] {
	return readdirSync(join(srcDir, relPath), { withFileTypes: true })
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
	const server = startTypeScript()

	afterAll(() => server.close())

	it.each([
		['CORE.md', 'core/index.ts'],
		['HOOKS.md', 'hooks/index.ts'],
		['LAYOUTS.md', 'layouts/index.ts'],
		['SERVER.md', 'server/index.ts'],
	])('%s documents every value export of %s', (mdFile, barrel) => {
		const exports = barrelValueExports(server, barrel)

		// Guard against a vacuous pass if the barrel ever fails to parse.
		expect(exports.length, `no value exports parsed from ${barrel}`).toBeGreaterThan(0)

		const documented = documentedTokens(mdFile)

		const undocumented = exports.filter((name) => !documented.has(name))

		expect(undocumented, `value exports missing from ${mdFile}`).toEqual([])
	})

	it('UTILITIES.md documents every value export of utilities', () => {
		const exports = folderValueExports(server, 'utilities')

		expect(exports.length, 'no value exports parsed from utilities').toBeGreaterThan(0)

		const documented = documentedTokens('UTILITIES.md')

		const undocumented = exports.filter((name) => !documented.has(name))

		expect(undocumented, 'value exports missing from UTILITIES.md').toEqual([])
	})

	it.each([
		['COMPONENTS.md', 'components'],
		['MODULES.md', 'modules'],
		['PRIMITIVES.md', 'primitives'],
		['STRUCTURE.md', 'structure'],
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
