// @vitest-environment node
import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import {
	isPassThroughTypeName,
	PROPS_WRAPPERS,
	stringLiteralKeys,
	TAG_PASS_THROUGHS,
	typeRefName,
} from '../../api-reference/engine/ts-utils'

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
	it('recognizes each pass-through that takes a tag', () => {
		for (const name of TAG_PASS_THROUGHS) {
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

	// A wrapper takes a props type, and a project alias is walked with its type
	// parameters bound, so neither is a pass-through by name.
	it('rejects the props wrappers and the polymorphic aliases', () => {
		for (const name of [...PROPS_WRAPPERS, 'PolymorphicProps', 'PolymorphicStaticProps']) {
			expect(isPassThroughTypeName(name)).toBe(false)
		}
	})
})
