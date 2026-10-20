import {
	isArrowFunction,
	isBindingElement,
	isFunctionDeclaration,
	isFunctionExpression,
	isIdentifier,
	isParameterDeclaration,
	isVariableDeclaration,
	type Node,
	type SourceFile,
	SyntaxKind,
} from 'typescript/unstable/ast'
import { type Checker, SignatureKind, type Type, TypeFlags } from 'typescript/unstable/sync'
import { afterAll, describe, expect, it } from 'vitest'
import { startTypeScript } from '../helpers/ts-server'
import { docsSites, isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// Boolean-name boundary (CONVENTIONS.md §8.5).
//
// A function that returns a boolean asks a question or reports an outcome, and
// its name says which. A predicate starts with `is`, `has`, `can`, or `should`.
// An action that returns whether it acted starts with `try`. A `resolve`
// function can give a boolean, because it gives the value that applies.
//
// A boolean value is the other way round: it takes no `is`. Write `open`,
// `pending`, and `transposed`. For a noun, use an adjective that states the
// fact, such as `listed` for an array. A value that holds a function keeps
// `is`, because it is a predicate.
//
// The scan reads the shipped tree with the TypeScript checker, so it sees the
// inferred type of each name.

/** The words that a function that returns a boolean can start with. */
const FUNCTION_PREFIX = /^(?:is|has|can|should|try|resolve|use|handle|on)[A-Z0-9]/

/** A module constant (§4.7), such as `NEVER_EXPANDABLE`, which names a fixed answer. */
const CONSTANT = /^[A-Z][A-Z0-9_]*$/

/** Names that React gives to a function that returns a boolean. */
const REACT_NAMES = new Set(['getSnapshot', 'getServerSnapshot'])

/** Values that mirror a field of a DOM or library type, each with the field. */
const MIRRORS: Record<string, string> = {
	'components/credit-card-input/credit-card-input-utilities.ts isValid':
		'the `isValid` field of the card-validator result',
	'components/credit-card-input/credit-card-input-utilities.ts isPotentiallyValid':
		'the `isPotentiallyValid` field of the card-validator result',
	'components/menu/use-menu-touch-hold.ts isTrusted': 'the DOM `Event.isTrusted`',
	'modules/dashboard/use-dashboard-tile-drag.ts isDragging':
		'the `isDragging` field of the dnd-kit `useSortable` result',
	'modules/grid/engine/grid-editing-utilities.ts isComposing': 'the DOM `InputEvent.isComposing`',
	'utilities/is-composing.ts isComposing': 'the DOM `InputEvent.isComposing`',
}

/** Each source file of the shipped tree. */
function shippedFiles(): string[] {
	const files: string[] = []

	walkSource(
		srcDir,
		(file) => {
			if (isSourceFile(file) && !file.endsWith('.d.ts')) files.push(file)
		},
		docsSites,
	)

	return files
}

function isBoolean(type: Type | undefined): boolean {
	if (!type || type.flags & (TypeFlags.Any | TypeFlags.Unknown | TypeFlags.Never)) return false

	return (type.flags & TypeFlags.BooleanLike) !== 0 || type.flags === TypeFlags.Boolean
}

function returnsBoolean(checker: Checker, name: Node): boolean {
	const type = checker.getTypeAtLocation(name)

	const signatures = type ? checker.getSignaturesOfType(type, SignatureKind.Call) : []

	return (
		signatures.length > 0 &&
		signatures.every((signature) => isBoolean(checker.getReturnTypeOfSignature(signature)))
	)
}

function isFunctionType(checker: Checker, name: Node): boolean {
	const type = checker.getTypeAtLocation(name)

	return !!type && checker.getSignaturesOfType(type, SignatureKind.Call).length > 0
}

/** The findings of one file, as `<file> <name>: <reason>`. */
function scanFile(checker: Checker, source: SourceFile, file: string): string[] {
	const found: string[] = []

	const visit = (node: Node): void => {
		const fn =
			isFunctionDeclaration(node) ||
			(isVariableDeclaration(node) &&
				!node.type &&
				!!node.initializer &&
				(isArrowFunction(node.initializer) || isFunctionExpression(node.initializer)))

		const name = (node as { name?: Node }).name

		if (name && isIdentifier(name)) {
			const text = name.text

			if (fn) {
				if (
					!FUNCTION_PREFIX.test(text) &&
					!CONSTANT.test(text) &&
					!REACT_NAMES.has(text) &&
					returnsBoolean(checker, name)
				)
					found.push(`${file} ${text}: a function that returns a boolean`)
			} else if (
				/^is[A-Z]/.test(text) &&
				(isVariableDeclaration(node) ||
					isParameterDeclaration(node) ||
					isBindingElement(node) ||
					node.kind === SyntaxKind.PropertySignature) &&
				!MIRRORS[`${file} ${text}`] &&
				!isFunctionType(checker, name) &&
				isBoolean(checker.getTypeAtLocation(name))
			) {
				found.push(`${file} ${text}: a boolean value`)
			}
		}

		node.forEachChild(visit)
	}

	visit(source)

	return found
}

describe('boolean-name boundary', () => {
	const server = startTypeScript()

	afterAll(() => server.close())

	const files = shippedFiles()

	// The scan runs at collection, under no budget, and each case asserts on its
	// result (`nodeScan` in `vitest.config.ts`).
	const { program, checker } = server.open(
		files,
		{ types: [], noEmit: true, incremental: false },
		'./tsconfig.json',
	)

	const findings = files.flatMap((file) => {
		const source = program.getSourceFile(file)

		return source ? scanFile(checker, source, srcRelative(file)) : []
	})

	it('names a function that returns a boolean as a predicate or a `try` action', () => {
		expect(findings.filter((finding) => finding.endsWith('returns a boolean'))).toEqual([])
	})

	it('gives a boolean value no `is` prefix', () => {
		expect(findings.filter((finding) => finding.endsWith('a boolean value'))).toEqual([])
	})

	// The scan must fail each kind of break, or a pass means nothing.
	it('finds each kind of break in a fixture', () => {
		const file = server.write(
			'fixture.ts',
			`
				function sameRow(a: number, b: number) { return a === b }
				const wraps = (width: number) => width > 10
				function isSameRow(a: number, b: number) { return a === b }
				const tryOpen = () => true
				const NEVER = () => false
				function read(isOpen: boolean) { const isActive = isOpen; return isActive }
				const isMatch = (value: string) => value === ''
				type Shape = { isHidden: boolean; listed: boolean }
			`,
		)

		const fixture = server.open([file], { types: [], noEmit: true, lib: ['es2023'] })

		const source = fixture.program.getSourceFile(file)

		expect(source && scanFile(fixture.checker, source, 'fixture.ts')).toEqual([
			'fixture.ts sameRow: a function that returns a boolean',
			'fixture.ts wraps: a function that returns a boolean',
			'fixture.ts read: a function that returns a boolean',
			'fixture.ts isOpen: a boolean value',
			'fixture.ts isActive: a boolean value',
			'fixture.ts isHidden: a boolean value',
		])
	})

	it('lists no mirror that the source no longer declares', () => {
		const declared = new Set<string>()

		for (const file of files) {
			const source = program.getSourceFile(file)

			const visit = (node: Node): void => {
				if (isIdentifier(node) && MIRRORS[`${srcRelative(file)} ${node.text}`])
					declared.add(`${srcRelative(file)} ${node.text}`)

				node.forEachChild(visit)
			}

			if (source) visit(source)
		}

		expect(Object.keys(MIRRORS).filter((key) => !declared.has(key))).toEqual([])
	})
})
