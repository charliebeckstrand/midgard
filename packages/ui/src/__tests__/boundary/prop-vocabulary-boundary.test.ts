// @vitest-environment node
import { isPropertySignatureDeclaration, type Node } from 'typescript/unstable/ast'
import {
	type Project,
	SignatureKind,
	SymbolFlags,
	type Symbol as TsSymbol,
	type Type,
} from 'typescript/unstable/sync'
import { afterAll, describe, expect, it } from 'vitest'
import {
	barrelExports,
	openPublicProject,
	publicBarrels,
	resolvedSymbol,
} from '../helpers/public-barrels'
import { startTypeScript } from '../helpers/ts-server'
import { srcRelative } from '../helpers/walk-source'

// A prop takes the name that the vocabulary of CONVENTIONS §4.9 gives for its
// idea. This gate reads each props type and each options type of the public
// barrels with the checker, so a key that a type takes from a base or a shared
// type counts too. It holds these rows of the table: no alias in the last
// column, a heading level typed `HeadingLevel`, a severity whose kinds are the
// kinds of `AlertSeverity`, `multiple` for more than one at once, `formatValue`
// for a number formatter, a time with no unit suffix, `on<Thing>Click` for the
// activation of an item, and `on<State>Change` for a change of a state.
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
	['virtual', 'virtualize'],
	['preventClose', 'closeOnClick'],
])

/** A time in milliseconds with its unit in the name, such as `debounceMs`. */
const UNIT_SUFFIX = /^(\w+)Ms$/

/** An item handler that ends in `Press`, such as `onDayPress`. */
const PRESS_HANDLER = /^(on\w+)Press$/

/** A function of one number, such as `(value: number) => string`. */
const NUMBER_FORMATTER = /^\(\s*\w+\s*:\s*number\s*\)\s*=>/

/** A union of heading levels written by hand, such as `1 | 2 | 3`. */
const HAND_LEVELS = /^\(?\s*[1-6](?:\s*\|\s*[1-6])+\s*\)?$/

/** Each exported `<Name>Props` and `<Name>Options` type of the public barrels, once. */
function publicProps(project: Project): TsSymbol[] {
	const found = new Map<number, TsSymbol>()

	for (const barrel of publicBarrels()) {
		for (const symbol of barrelExports(project, barrel)) {
			if (!/(Props|Options)$/.test(symbol.name)) continue

			const props = resolvedSymbol(project.checker, symbol)

			if (props.flags & SymbolFlags.TypeAlias) found.set(props.id, props)
		}
	}

	return [...found.values()]
}

/** The type of the exported `AlertSeverity`. */
function alertSeverity(project: Project) {
	const { checker } = project

	for (const barrel of publicBarrels()) {
		const symbol = barrelExports(project, barrel).find((s) => s.name === 'AlertSeverity')

		if (symbol) return checker.getDeclaredTypeOfSymbol(resolvedSymbol(checker, symbol))
	}

	throw new Error('no public barrel exports AlertSeverity')
}

/** The written type of a property, if it declares one. */
function typeText(project: Project, property: TsSymbol): string | undefined {
	const declaration: Node | undefined = property.declarations?.[0]?.resolve(project)

	if (!declaration || !isPropertySignatureDeclaration(declaration) || !declaration.type) return

	return declaration.getSourceFile().text.slice(declaration.type.pos, declaration.type.end).trim()
}

/** The type of a property without `undefined` and `null`. */
function valueType(project: Project, property: TsSymbol): Type | undefined {
	const { checker } = project

	const type = checker.getTypeOfSymbol(property)

	return type && checker.getNonNullableType(type)
}

/**
 * Whether `onX` reports a new value of the key `x`: its first parameter and
 * `x` take the same values. `confirm` and `onConfirm` pass, because the key is
 * the config of a button and the callback takes no value.
 */
function reportsState(project: Project, state: TsSymbol, callback: TsSymbol): boolean {
	const { checker } = project

	const stateType = valueType(project, state)

	const callbackType = valueType(project, callback)

	if (!stateType || !callbackType) return false

	const [signature] = checker.getSignaturesOfType(callbackType, SignatureKind.Call)

	if (!signature || signature.getParameters().length === 0) return false

	const parameter = checker.getParameterType(signature, 0)

	const reported = parameter && checker.getNonNullableType(parameter)

	return Boolean(
		reported &&
			checker.isTypeAssignableTo(reported, stateType) &&
			checker.isTypeAssignableTo(stateType, reported),
	)
}

/** Each break of a naming pattern of the table by `property`, as a fix. */
function patternBreaks(property: TsSymbol, text: string | undefined): string[] {
	const fixes: string[] = []

	const unit = UNIT_SUFFIX.exec(property.name)

	if (unit)
		fixes.push(`name it \`${unit[1]}\`: a time prop is in milliseconds, with no unit in its name`)

	const press = PRESS_HANDLER.exec(property.name)

	if (press) fixes.push(`name it \`${press[1]}Click\``)

	if (property.name === 'type' && text?.includes("'multiple'")) {
		fixes.push('name it `multiple`, a boolean that discriminates the value')
	}

	if (property.name === 'format' && text && NUMBER_FORMATTER.test(text)) {
		fixes.push('name it `formatValue`')
	}

	return fixes
}

/**
 * Each break of a naming pattern by a key that ui declares, as a fix. A key of
 * a React base, such as the native `onKeyPress`, keeps its name.
 */
function ownBreaks(
	project: Project,
	property: TsSymbol,
	text: string | undefined,
	byName: ReadonlyMap<string, TsSymbol>,
): string[] {
	const file = property.declarations?.[0]?.resolve(project)?.getSourceFile().fileName

	if (!file || file.includes('node_modules')) return []

	const fixes = patternBreaks(property, text)

	const handler = /^on([A-Z]\w*)$/.exec(property.name)?.[1]

	if (!handler || handler.endsWith('Change')) return fixes

	const state = `${handler.charAt(0).toLowerCase()}${handler.slice(1)}`

	const stateProperty = byName.get(state)

	if (stateProperty && reportsState(project, stateProperty, property)) {
		fixes.push(`name it \`${property.name}Change\`, as it reports \`${state}\``)
	}

	return fixes
}

/** Each property of a public props type that breaks a row of the table. */
function violations(project: Project): string[] {
	const { checker } = project

	const severity = alertSeverity(project)

	const found = new Set<string>()

	for (const props of publicProps(project)) {
		const declaration = props.declarations?.[0]?.resolve(project)

		const file = declaration ? srcRelative(declaration.getSourceFile().fileName) : '?'

		const properties = checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(props))

		const byName = new Map(properties.map((property) => [property.name, property]))

		for (const property of properties) {
			const at = `${file} → ${props.name}.${property.name}`

			const text = typeText(project, property)

			const alias = ALIASES.get(property.name)

			// A predicate such as `isDisabled(item)` is not the state that the alias names.
			if (alias && !text?.includes('=>')) found.add(`${at}: name it \`${alias}\``)

			if (text && HAND_LEVELS.test(text)) found.add(`${at}: type it \`HeadingLevel\``)

			for (const fix of ownBreaks(project, property, text, byName)) found.add(`${at}: ${fix}`)

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

	afterAll(() => server.close())

	// The scan runs at collection, under no budget, and each case asserts on its
	// result (`nodeScan` in `vitest.config.ts`).
	const project = openPublicProject(server)

	const found = violations(project)

	const props = publicProps(project)

	it('a public prop takes the name and the type that the vocabulary gives', () => {
		expect(found, `follow the vocabulary (CONVENTIONS §4.9):\n  ${found.join('\n  ')}`).toEqual([])
	})

	it('reads the props types of the public surface', () => {
		expect(props.length).toBeGreaterThan(300)
	})
})
