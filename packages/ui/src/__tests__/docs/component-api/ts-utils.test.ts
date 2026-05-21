import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
	getPropsAnnotation,
	isPassThroughTypeName,
	STRING_LITERAL_PASS_THROUGHS,
	stringLiteralKeys,
	typeRefName,
	unwrapFunctionLike,
} from '../../../docs/component-api/ts-utils'

function sourceFile(text: string): ts.SourceFile {
	return ts.createSourceFile('virtual.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

function firstStatement<T extends ts.Statement>(text: string): T {
	const sf = sourceFile(text)

	const stmt = sf.statements[0]

	if (!stmt) throw new Error('no statements parsed from source')

	return stmt as T
}

describe('typeRefName', () => {
	it('returns the identifier for a single-name reference', () => {
		const decl = firstStatement<ts.VariableStatement>(`const x: Foo = null as never`)

		const typeNode = decl.declarationList.declarations[0]?.type as ts.TypeReferenceNode

		expect(typeRefName(typeNode.typeName)).toBe('Foo')
	})

	it('joins qualified names with dots', () => {
		const decl = firstStatement<ts.VariableStatement>(`const x: Foo.Bar = null as never`)

		const typeNode = decl.declarationList.declarations[0]?.type as ts.TypeReferenceNode

		expect(typeRefName(typeNode.typeName)).toBe('Foo.Bar')
	})

	it('handles deeply nested qualified names', () => {
		const decl = firstStatement<ts.VariableStatement>(`const x: Foo.Bar.Baz = null as never`)

		const typeNode = decl.declarationList.declarations[0]?.type as ts.TypeReferenceNode

		expect(typeRefName(typeNode.typeName)).toBe('Foo.Bar.Baz')
	})
})

describe('stringLiteralKeys', () => {
	it('returns an empty array for undefined', () => {
		expect(stringLiteralKeys(undefined)).toEqual([])
	})

	it('extracts a single literal type', () => {
		const decl = firstStatement<ts.VariableStatement>(`const x: 'foo' = null as never`)

		const typeNode = decl.declarationList.declarations[0]?.type

		expect(stringLiteralKeys(typeNode)).toEqual(['foo'])
	})

	it('extracts every member of a string-literal union', () => {
		const decl = firstStatement<ts.VariableStatement>(`const x: 'a' | 'b' | 'c' = null as never`)

		const typeNode = decl.declarationList.declarations[0]?.type

		expect(stringLiteralKeys(typeNode)).toEqual(['a', 'b', 'c'])
	})

	it('returns an empty array for a non-literal type reference', () => {
		const decl = firstStatement<ts.VariableStatement>(`const x: Foo = null as never`)

		const typeNode = decl.declarationList.declarations[0]?.type

		expect(stringLiteralKeys(typeNode)).toEqual([])
	})
})

describe('unwrapFunctionLike', () => {
	it('returns the function for a `function Foo() {}` declaration', () => {
		const fn = firstStatement<ts.FunctionDeclaration>(`function Foo(props: P) {}`)

		const out = unwrapFunctionLike(fn)

		expect(out).toBeTruthy()

		expect(ts.isFunctionDeclaration(out as ts.Node)).toBe(true)
	})

	it('returns the arrow function for `const Foo = (props: P) => ...`', () => {
		const decl = firstStatement<ts.VariableStatement>(`const Foo = (props: P) => null`)

		const init = decl.declarationList.declarations[0]?.initializer

		expect(init).toBeTruthy()

		expect(ts.isArrowFunction(unwrapFunctionLike(init as ts.Node) as ts.Node)).toBe(true)
	})

	it('unwraps a single layer of forwardRef / memo wrapping', () => {
		const decl = firstStatement<ts.VariableStatement>(
			`const Foo = forwardRef((props: P, ref) => null)`,
		)

		const init = decl.declarationList.declarations[0]?.initializer

		const fn = unwrapFunctionLike(init as ts.Node)

		expect(fn).toBeTruthy()

		expect(ts.isArrowFunction(fn as ts.Node)).toBe(true)
	})

	it('unwraps nested wrappers (memo(forwardRef(...)))', () => {
		const decl = firstStatement<ts.VariableStatement>(
			`const Foo = memo(forwardRef((props: P, ref) => null))`,
		)

		const init = decl.declarationList.declarations[0]?.initializer

		expect(unwrapFunctionLike(init as ts.Node)).toBeTruthy()
	})

	it('returns null when nothing in the call chain is function-like', () => {
		const decl = firstStatement<ts.VariableStatement>(`const Foo = wrap(value)`)

		const init = decl.declarationList.declarations[0]?.initializer

		expect(unwrapFunctionLike(init as ts.Node)).toBeNull()
	})
})

describe('getPropsAnnotation', () => {
	it('returns the type node of the first parameter', () => {
		const fn = firstStatement<ts.FunctionDeclaration>(`function Foo(props: Bar) {}`)

		const annotation = getPropsAnnotation(fn)

		expect(annotation).toBeTruthy()

		expect((annotation as ts.TypeReferenceNode).typeName.getText()).toBe('Bar')
	})

	it('returns null when the first parameter has no type annotation', () => {
		const fn = firstStatement<ts.FunctionDeclaration>(`function Foo(props) {}`)

		expect(getPropsAnnotation(fn)).toBeNull()
	})

	it('returns null when the function has no parameters', () => {
		const fn = firstStatement<ts.FunctionDeclaration>(`function Foo() {}`)

		expect(getPropsAnnotation(fn)).toBeNull()
	})
})

describe('isPassThroughTypeName', () => {
	it('recognizes each canonical string-literal pass-through', () => {
		for (const name of STRING_LITERAL_PASS_THROUGHS) {
			expect(isPassThroughTypeName(name)).toBe(true)
		}
	})

	it('recognizes HTMLAttributes variants by suffix', () => {
		expect(isPassThroughTypeName('HTMLAttributes')).toBe(true)
		expect(isPassThroughTypeName('ButtonHTMLAttributes')).toBe(true)
		expect(isPassThroughTypeName('AnchorHTMLAttributes')).toBe(true)
	})

	it('rejects unrelated names', () => {
		expect(isPassThroughTypeName('Foo')).toBe(false)
		expect(isPassThroughTypeName('Props')).toBe(false)
		expect(isPassThroughTypeName('')).toBe(false)
	})

	it('exposes the canonical pass-through set', () => {
		expect(STRING_LITERAL_PASS_THROUGHS.has('ComponentPropsWithoutRef')).toBe(true)
		expect(STRING_LITERAL_PASS_THROUGHS.has('PolymorphicProps')).toBe(true)
	})
})
