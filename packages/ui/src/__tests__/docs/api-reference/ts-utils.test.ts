import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import {
	isPassThroughTypeName,
	STRING_LITERAL_PASS_THROUGHS,
	stringLiteralKeys,
	typeRefName,
} from '../../../docs/api-reference/engine/ts-utils'

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
