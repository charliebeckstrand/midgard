// @vitest-environment node
import { join } from 'node:path'
import { parse, TYPE } from '@formatjs/icu-messageformat-parser'
import {
	type Expression,
	isBinaryExpression,
	isBindingElement,
	isCallExpression,
	isConditionalExpression,
	isIdentifier,
	isJsxAttribute,
	isJsxElement,
	isJsxExpression,
	isJsxFragment,
	isJsxText,
	isNewExpression,
	isNoSubstitutionTemplateLiteral,
	isObjectLiteralExpression,
	isParenthesizedExpression,
	isPropertyAccessExpression,
	isPropertyAssignment,
	isStringLiteral,
	isTemplateExpression,
	type Node,
	type ObjectLiteralExpression,
	type SourceFile,
	SyntaxKind,
	type TypeNode,
} from 'typescript/unstable/ast'
import {
	type Checker,
	isUnionType,
	type Project,
	type Type,
	TypeFlags,
} from 'typescript/unstable/sync'
import { afterAll, describe, expect, it } from 'vitest'
import { TEXT_ATTRIBUTES, TEXT_PROP } from '../../../scripts/intl-catalog'
import { startTypeScript } from '../helpers/ts-server'
import { docsSites, isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// Each text of ui that a person sees or hears is in the language of the
// reader. This gate holds three rules over the shipped tree.
//
//   1. Text comes from a message. JSX text, a text attribute, the default of a
//      text prop, a JSX child, an announcement, and a write to the text of a
//      DOM node hold no literal letters.
//   2. A format takes the locale. A `toLocale…` call, a `localeCompare` call,
//      and an `Intl` constructor name the locale of the reader. A number that a
//      person reads or hears goes through `intl.formatNumber`. The checker
//      finds a number in a JSX child, in a text attribute, and in an
//      announcement.
//   3. A message formats its numbers. A simple argument, such as `{total}`,
//      prints `String(total)`, with no group separator and no digits of the
//      locale. A value of type `number` fills `{total, number}`, or a plural or
//      a selectordinal. The checker reads the type argument of each
//      `defineMessage` and `defineMessages` call for the type of each value.
//
// The docs site is out of scope. Its demo text goes into the docs catalog by
// the same names of text (`docs/plugin/demo-text.ts`), not through messages.

/** A file that may name no locale, because it finds the default locale. */
const LOCALE_SOURCE = 'utilities/resolve-locale.ts'

/**
 * The places that show text that is not language, by file and rule, and the
 * reason for each.
 */
const ALLOWED = new Map([
	['hooks/use-drag-cursor.ts DOM text', 'The text of a `<style>` node is a CSS rule.'],
	[
		'components/json-tree/json-tree-node-key.tsx number with no locale',
		'A JSON tree shows its data in JSON notation, so an array index stays as JSON writes it.',
	],
])

/** The DOM properties that write the text of a node. */
const DOM_TEXT = new Set(['textContent', 'innerText', 'ariaLabel', 'title', 'placeholder'])

/** The calls that speak a text through a live region. */
const ANNOUNCERS = new Set(['announce', 'announcePolite', 'announceAssertive'])

/** The `toLocale…` methods, which take the locale as their first argument. */
const LOCALE_METHODS = new Set([
	'toLocaleDateString',
	'toLocaleLowerCase',
	'toLocaleString',
	'toLocaleTimeString',
	'toLocaleUpperCase',
])

/** The `Intl` constructors, which take the locale as their first argument. */
const INTL_CONSTRUCTORS = new Set([
	'Collator',
	'DateTimeFormat',
	'DisplayNames',
	'DurationFormat',
	'ListFormat',
	'NumberFormat',
	'PluralRules',
	'RelativeTimeFormat',
	'Segmenter',
])

/** The calls that make text from a number with no locale. */
const RAW_NUMBER = new Set(['String', 'toString', 'toFixed', 'toPrecision', 'toExponential'])

const LETTER = /\p{L}/u

/** A character reference of JSX text, such as `&hellip;`, which is not a word. */
const ENTITY = /&(?:[a-z]+|#\d+|#x[\da-f]+);/gi

const NUMBER = TypeFlags.Number | TypeFlags.NumberLiteral

const NOTHING = TypeFlags.Undefined | TypeFlags.Null

/**
 * The compiler options of the scan over the package config, which it extends:
 * no type packages, no output, and no build info.
 */
const COMPILER_OPTIONS = { types: [], noEmit: true, incremental: false }

/** One finding of a scan, before the allowlist. */
type Finding = { file: string; rule: string; line: string }

/** Each shipped source file, with its text. */
function shippedFiles(): Map<string, string> {
	const files = new Map<string, string>()

	walkSource(
		srcDir,
		(file, content) => {
			if (isSourceFile(file) && !file.endsWith('.d.ts')) files.set(file, content)
		},
		docsSites,
	)

	return files
}

/** The line of `node` in its file, from 1. */
function getLine(source: SourceFile, node: Node): number {
	return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
}

/** The name of a called function or method, such as `announce` or `toFixed`. */
function calleeName(node: Node): string | undefined {
	if (!isCallExpression(node) && !isNewExpression(node)) return undefined

	const callee = node.expression

	if (isIdentifier(callee)) return callee.text

	if (isPropertyAccessExpression(callee) && isIdentifier(callee.name)) return callee.name.text

	return undefined
}

/** The name of a JSX attribute, a binding, or a property, such as `aria-label`. */
function nameText(node: Node | undefined): string | undefined {
	return node && (isIdentifier(node) || isStringLiteral(node)) ? node.text : undefined
}

/**
 * The literals with letters that an expression can give: a string, a template
 * with letters in its fixed part, and each branch of a condition or a fallback.
 * A call is out of scope, because a call is where a message is formatted.
 */
function literalTexts(node: Expression): Expression[] {
	if (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)) {
		return LETTER.test(node.text) ? [node] : []
	}

	if (isTemplateExpression(node)) {
		const fixed = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)]

		return fixed.some((part) => LETTER.test(part)) ? [node] : []
	}

	if (isParenthesizedExpression(node)) return literalTexts(node.expression)

	if (isConditionalExpression(node)) {
		return [...literalTexts(node.whenTrue), ...literalTexts(node.whenFalse)]
	}

	if (isBinaryExpression(node)) {
		const operator = node.operatorToken.kind

		if (
			operator === SyntaxKind.QuestionQuestionToken ||
			operator === SyntaxKind.BarBarToken ||
			operator === SyntaxKind.AmpersandAmpersandToken ||
			operator === SyntaxKind.PlusToken
		) {
			return [...literalTexts(node.left), ...literalTexts(node.right)]
		}
	}

	return []
}

/** Whether a type is a number, or a number that can be absent. */
function isNumber(type: Type | undefined): boolean {
	if (!type) return false

	if (!isUnionType(type)) return (type.flags & NUMBER) !== 0

	const kinds = type.getTypes()

	return (
		kinds.some((kind) => kind.flags & NUMBER) &&
		kinds.every((kind) => kind.flags & (NUMBER | NOTHING))
	)
}

/**
 * Whether an expression shows a number with no locale: a number itself, a
 * template that splices one in, or a `String`, `toString`, or `toFixed` call.
 */
function isRawNumber(checker: Checker, node: Expression): boolean {
	if (isParenthesizedExpression(node)) return isRawNumber(checker, node.expression)

	if (RAW_NUMBER.has(calleeName(node) ?? '')) return true

	if (isTemplateExpression(node)) {
		return node.templateSpans.some((span) => isNumber(checker.getTypeAtLocation(span.expression)))
	}

	return isNumber(checker.getTypeAtLocation(node))
}

/** Whether a locale argument is absent, or is `undefined`, the default locale. */
function lacksLocale(args: readonly Expression[] | undefined): boolean {
	const first = args?.[0]

	return !first || (isIdentifier(first) && first.text === 'undefined')
}

/** Each place in `files` that shows text that no message gives (rules 1 and 2). */
function textFindings(project: Project, files: readonly string[]): Finding[] {
	const { program, checker } = project

	const found: Finding[] = []

	for (const file of files) {
		const source = program.getSourceFile(file)

		if (!source) throw new Error(`the TypeScript server did not parse ${file}`)

		const path = srcRelative(file)

		const at = (node: Node, rule: string) => {
			const text = node.getText(source).replace(/\s+/g, ' ').slice(0, 80)

			found.push({ file: path, rule, line: `${path}:${getLine(source, node)} ${rule}: ${text}` })
		}

		const literal = (node: Expression, rule: string) => {
			for (const text of literalTexts(node)) at(text, rule)
		}

		// A text that a person reads or hears: no literal and no raw number.
		const shown = (node: Expression, rule: string) => {
			literal(node, rule)

			if (isRawNumber(checker, node)) at(node, 'number with no locale')
		}

		const visit = (node: Node): void => {
			const parent = node.parent

			const isChild = parent && (isJsxElement(parent) || isJsxFragment(parent))

			if (isJsxText(node) && LETTER.test(node.text.replace(ENTITY, ''))) at(node, 'JSX text')

			if (isJsxExpression(node) && node.expression && isChild) shown(node.expression, 'JSX child')

			if (isJsxAttribute(node) && TEXT_ATTRIBUTES.has(nameText(node.name) ?? '')) {
				const value = node.initializer

				if (value && isStringLiteral(value)) literal(value, 'text attribute')

				if (value && isJsxExpression(value) && value.expression) {
					shown(value.expression, 'text attribute')
				}
			}

			if (isBindingElement(node) && node.initializer) {
				const name = nameText(node.propertyName ?? node.name) ?? ''

				if (TEXT_ATTRIBUTES.has(name) || TEXT_PROP.test(name)) {
					literal(node.initializer, 'text default')
				}
			}

			const name = calleeName(node)

			if (isCallExpression(node) && ANNOUNCERS.has(name ?? '')) {
				for (const argument of node.arguments) shown(argument, 'announcement')
			}

			if (
				isBinaryExpression(node) &&
				node.operatorToken.kind === SyntaxKind.EqualsToken &&
				isPropertyAccessExpression(node.left) &&
				DOM_TEXT.has(nameText(node.left.name) ?? '')
			) {
				literal(node.right, 'DOM text')
			}

			if (isCallExpression(node) && name === 'setAttribute') {
				const [attribute, value] = node.arguments

				if (attribute && value && TEXT_ATTRIBUTES.has(nameText(attribute) ?? '')) {
					literal(value, 'DOM text')
				}
			}

			if (isCallExpression(node) && LOCALE_METHODS.has(name ?? '') && lacksLocale(node.arguments)) {
				at(node, 'format with no locale')
			}

			if (isCallExpression(node) && name === 'localeCompare' && node.arguments.length < 2) {
				at(node, 'collation with no locale')
			}

			if (
				(isNewExpression(node) || isCallExpression(node)) &&
				isPropertyAccessExpression(node.expression) &&
				nameText(node.expression.expression) === 'Intl' &&
				INTL_CONSTRUCTORS.has(name ?? '') &&
				lacksLocale(node.arguments) &&
				path !== LOCALE_SOURCE
			) {
				at(node, 'Intl with no locale')
			}

			node.forEachChild(visit)
		}

		visit(source)
	}

	return found
}

/** The names of the values of `type` that take a number. */
function numberValues(checker: Checker, type: Type | undefined): Set<string> {
	const names = new Set<string>()

	if (!type) return names

	for (const property of checker.getPropertiesOfType(type)) {
		if (isNumber(checker.getTypeOfSymbol(property))) names.add(property.name)
	}

	return names
}

/** The names of the simple arguments of an ICU message, at each depth. */
function simpleArguments(message: string): Set<string> {
	const names = new Set<string>()

	const walk = (elements: ReturnType<typeof parse>) => {
		for (const element of elements) {
			if (element.type === TYPE.argument) names.add(element.value)

			if ('options' in element) {
				for (const option of Object.values(element.options)) walk(option.value)
			}

			if (element.type === TYPE.tag) walk(element.children)
		}
	}

	walk(parse(message))

	return names
}

/** The value of the string property `key` of an object literal. */
function stringProperty(object: ObjectLiteralExpression, key: string): string | undefined {
	for (const property of object.properties) {
		if (
			isPropertyAssignment(property) &&
			nameText(property.name) === key &&
			isStringLiteral(property.initializer)
		) {
			return property.initializer.text
		}
	}

	return undefined
}

/** Each message in `files` whose number value fills a simple argument (rule 3). */
function numberArgumentFindings(project: Project, files: readonly string[]): Finding[] {
	const { program, checker } = project

	const found: Finding[] = []

	const check = (source: SourceFile, descriptor: Node, numbers: Set<string>) => {
		if (!isObjectLiteralExpression(descriptor)) return

		const id = stringProperty(descriptor, 'id')

		const message = stringProperty(descriptor, 'defaultMessage')

		if (!id || message === undefined) return

		const path = srcRelative(source.fileName)

		for (const name of simpleArguments(message)) {
			if (!numbers.has(name)) continue

			const line = `${path}:${getLine(source, descriptor)} ${id}: write {${name}, number}`

			found.push({ file: path, rule: 'number argument', line })
		}
	}

	for (const file of files) {
		const source = program.getSourceFile(file)

		if (!source) throw new Error(`the TypeScript server did not parse ${file}`)

		const visit = (node: Node): void => {
			const call = isCallExpression(node) ? node : undefined

			const argument = call?.arguments[0]

			const typeArgument = call?.typeArguments?.[0]

			const values = typeArgument && checker.getTypeFromTypeNode(typeArgument as TypeNode)

			const name = calleeName(node)

			if (name === 'defineMessage' && argument && values) {
				check(source, argument, numberValues(checker, values))
			}

			if (name === 'defineMessages' && argument && values && isObjectLiteralExpression(argument)) {
				for (const property of argument.properties) {
					const key = isPropertyAssignment(property) ? nameText(property.name) : undefined

					const value = key ? checker.getPropertyOfType(values, key) : undefined

					if (isPropertyAssignment(property) && value) {
						check(
							source,
							property.initializer,
							numberValues(checker, checker.getTypeOfSymbol(value)),
						)
					}
				}
			}

			node.forEachChild(visit)
		}

		visit(source)
	}

	return found
}

/** The lines of the findings that the allowlist does not hold. */
function unallowed(findings: readonly Finding[]): string[] {
	return findings
		.filter((finding) => !ALLOWED.has(`${finding.file} ${finding.rule}`))
		.map((finding) => finding.line)
}

describe('intl coverage boundary', () => {
	const server = startTypeScript()

	afterAll(() => server.close())

	const files = shippedFiles()

	// The files that define a message with values.
	const messageFiles = [...files]
		.filter(([, content]) => /\bdefineMessages?</.test(content))
		.map(([file]) => file)

	// The scan runs at collection, under no budget, and each case asserts on its
	// result (`nodeScan` in `vitest.config.ts`).
	const project = server.open([...files.keys()], COMPILER_OPTIONS, './tsconfig.json')

	const texts = textFindings(project, [...files.keys()])

	const numbers = numberArgumentFindings(project, messageFiles)

	it('shows no text that a message does not give, and names the locale of each format', () => {
		expect(unallowed(texts)).toEqual([])
	})

	it('formats each number that a message takes', () => {
		expect(unallowed(numbers)).toEqual([])
	})

	it('keeps no allowlist entry that the source no longer needs', () => {
		const used = new Set([...texts, ...numbers].map((finding) => `${finding.file} ${finding.rule}`))

		expect([...ALLOWED.keys()].filter((key) => !used.has(key))).toEqual([])
	})

	it('reads the type argument of each message set', () => {
		expect(messageFiles).toContain(join(srcDir, 'primitives', 'intl', 'intl-reorder.ts'))
	})

	it('finds each kind of text that no message gives', () => {
		const file = server.write(
			'fixture.tsx',
			`
			declare function announce(text: string): void
			declare function defineMessage<V>(descriptor: unknown): V
			declare const count: number
			declare const node: HTMLElement

			export const total = defineMessage<{ total: number }>({ id: 'x.total', defaultMessage: 'of {total}' })

			export function Fixture({ emptyLabel = 'None' }: { emptyLabel?: string }) {
				announce('Saved')
				announce(String(count))
				node.textContent = 'Loading'
				const sorted = ['b', 'a'].sort((a, b) => a.localeCompare(b))
				const format = new Intl.NumberFormat()

				return (
					<div aria-label="Close" title={count}>
						Hello
						{count}
						{'Show'}
						{new Date().toLocaleDateString()}
						{emptyLabel}
						{sorted}
						{format.format(1)}
					</div>
				)
			}
			`,
		)

		const fixture = server.open([file], COMPILER_OPTIONS, './tsconfig.json')

		const rules = [...textFindings(fixture, [file]), ...numberArgumentFindings(fixture, [file])]
			.map((finding) => finding.rule)
			.sort()

		expect(rules).toEqual([
			'DOM text',
			'Intl with no locale',
			'JSX child',
			'JSX text',
			'announcement',
			'collation with no locale',
			'format with no locale',
			'number argument',
			'number with no locale',
			'number with no locale',
			'number with no locale',
			'text attribute',
			'text default',
		])
	})
})
