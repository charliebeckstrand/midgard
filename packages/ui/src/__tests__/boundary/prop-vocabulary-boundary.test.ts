// @vitest-environment node
import { isPropertySignatureDeclaration, type Node } from 'typescript/unstable/ast'
import {
	type Checker,
	type Project,
	SymbolFlags,
	type Symbol as TsSymbol,
} from 'typescript/unstable/sync'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { openPublicProject, publicBarrels } from '../helpers/public-barrels'
import { startTypeScript } from '../helpers/ts-server'
import { srcRelative } from '../helpers/walk-source'

// A prop takes the name that the vocabulary of CONVENTIONS §4.9 gives for its
// idea. This gate reads each props type of the public barrels with the checker,
// so a key that a props type takes from a base or a shared type counts too.
// It holds three rows of the table: no alias in the last column, a heading
// level typed `HeadingLevel`, and a severity whose kinds are the kinds of
// `AlertSeverity`.
// The `onChange` row is out of scope: a native `onChange` is correct on a
// component that takes the native base of an input.

/** Each alias of the table, and the name that replaces it. */
const ALIASES = new Map([
	['isOpen', 'open'],
	['isDisabled', 'disabled'],
	['isReadOnly', 'readOnly'],
	['pending', 'loading'],
	['dismissible', 'closable'],
	['finalFocus', 'returnFocusTo'],
])

/** A union of heading levels written by hand, such as `1 | 2 | 3`. */
const HAND_LEVELS = /^\(?\s*[1-6](?:\s*\|\s*[1-6])+\s*\)?$/

/** The symbol that an import alias names, or the symbol itself. */
function resolved(checker: Checker, symbol: TsSymbol): TsSymbol {
	return symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/** Each exported `<Name>Props` type of the public barrels, once. */
function publicProps(project: Project): TsSymbol[] {
	const { program, checker } = project

	const found = new Map<number, TsSymbol>()

	for (const barrel of publicBarrels()) {
		const source = program.getSourceFile(barrel)

		const module = source && checker.getSymbolAtLocation(source)

		if (!module) continue

		for (const symbol of checker.getExportsOfModule(module)) {
			if (!symbol.name.endsWith('Props')) continue

			const props = resolved(checker, symbol)

			if (props.flags & SymbolFlags.TypeAlias) found.set(props.id, props)
		}
	}

	return [...found.values()]
}

/** The type of the exported `AlertSeverity`. */
function alertSeverity(project: Project) {
	const { program, checker } = project

	for (const barrel of publicBarrels()) {
		const source = program.getSourceFile(barrel)

		const module = source && checker.getSymbolAtLocation(source)

		const symbol =
			module && checker.getExportsOfModule(module).find((s) => s.name === 'AlertSeverity')

		if (symbol) return checker.getDeclaredTypeOfSymbol(resolved(checker, symbol))
	}

	throw new Error('no public barrel exports AlertSeverity')
}

/** The written type of a property, if it declares one. */
function typeText(project: Project, property: TsSymbol): string | undefined {
	const declaration: Node | undefined = property.declarations?.[0]?.resolve(project)

	if (!declaration || !isPropertySignatureDeclaration(declaration) || !declaration.type) return

	return declaration.getSourceFile().text.slice(declaration.type.pos, declaration.type.end).trim()
}

/** Each property of a public props type that breaks a row of the table. */
function violations(project: Project): string[] {
	const { checker } = project

	const severity = alertSeverity(project)

	const found = new Set<string>()

	for (const props of publicProps(project)) {
		const declaration = props.declarations?.[0]?.resolve(project)

		const file = declaration ? srcRelative(declaration.getSourceFile().fileName) : '?'

		for (const property of checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(props))) {
			const at = `${file} → ${props.name}.${property.name}`

			const text = typeText(project, property)

			const alias = ALIASES.get(property.name)

			// A predicate such as `isDisabled(item)` is not the state that the alias names.
			if (alias && !text?.includes('=>')) found.add(`${at}: name it \`${alias}\``)

			if (text && HAND_LEVELS.test(text)) found.add(`${at}: type it \`HeadingLevel\``)

			if (property.name !== 'severity') continue

			const node = property.declarations?.[0]?.resolve(project)

			const type =
				node && isPropertySignatureDeclaration(node) && node.type
					? checker.getTypeAtLocation(node.type)
					: undefined

			// The kinds are the kinds of `AlertSeverity`: all of them and more, or some of them.
			const sameKinds =
				type &&
				(checker.isTypeAssignableTo(severity, type) || checker.isTypeAssignableTo(type, severity))

			if (type && !sameKinds) {
				found.add(`${at}: type it \`AlertSeverity\`, a union that adds to it, or a part of it`)
			}
		}
	}

	return [...found].sort()
}

describe('prop vocabulary boundary', () => {
	const server = startTypeScript()

	let project: Project

	beforeAll(() => {
		project = openPublicProject(server)
	})

	afterAll(() => server.close())

	it('a public prop takes the name and the type that the vocabulary gives', () => {
		const found = violations(project)

		expect(found, `follow the vocabulary (CONVENTIONS §4.9):\n  ${found.join('\n  ')}`).toEqual([])
	})

	it('reads the props types of the public surface', () => {
		expect(publicProps(project).length).toBeGreaterThan(300)
	})
})
