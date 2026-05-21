import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractDefaults } from '../../../docs/api-reference/engine/extract-defaults'
import { createInMemoryProgram, firstTypeAlias } from './helpers'

// ---------------------------------------------------------------------------
// Inline destructured defaults — exercised via the callable param, no
// annotation. Use a stub TypeChecker; the inline path never queries it.
// ---------------------------------------------------------------------------

const STUB_CHECKER = {} as ts.TypeChecker

function fromFunction(text: string): ts.SignatureDeclaration {
	const sf = ts.createSourceFile(
		'virtual.tsx',
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	)

	const stmt = sf.statements[0]

	if (!stmt) throw new Error('no statements parsed from source')

	if (ts.isFunctionDeclaration(stmt)) return stmt

	if (ts.isVariableStatement(stmt)) {
		const init = stmt.declarationList.declarations[0]?.initializer

		if (!init) throw new Error('variable declaration has no initializer')

		return findFirstFunctionLike(init)
	}

	throw new Error('unsupported statement shape for callable extraction')
}

function findFirstFunctionLike(node: ts.Node): ts.SignatureDeclaration {
	if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		return node
	}

	if (ts.isCallExpression(node)) {
		for (const arg of node.arguments) {
			try {
				return findFirstFunctionLike(arg)
			} catch {
				/* try next */
			}
		}
	}

	throw new Error('no function-like node found')
}

describe('extractDefaults — inline destructured defaults', () => {
	it('extracts a single string default from destructured parameters', () => {
		const fn = fromFunction(`function Foo({ size = 'md' }) { return null }`)

		expect(extractDefaults(fn, undefined, STUB_CHECKER).get('size')).toBe(`'md'`)
	})

	it('extracts multiple defaults in declaration order', () => {
		const fn = fromFunction(
			`function Foo({ size = 'md', color = 'zinc', disabled = false }) { return null }`,
		)

		expect([...extractDefaults(fn, undefined, STUB_CHECKER).entries()]).toEqual([
			['size', `'md'`],
			['color', `'zinc'`],
			['disabled', `false`],
		])
	})

	it('preserves the source text of complex default expressions verbatim', () => {
		const fn = fromFunction(`function Foo({ items = [1, 2, 3] }) { return null }`)

		expect(extractDefaults(fn, undefined, STUB_CHECKER).get('items')).toBe('[1, 2, 3]')
	})

	it('skips parameters that have no default initializer', () => {
		const fn = fromFunction(`function Foo({ size = 'md', label, color = 'zinc' }) { return null }`)

		const defaults = extractDefaults(fn, undefined, STUB_CHECKER)

		expect(defaults.has('size')).toBe(true)
		expect(defaults.has('color')).toBe(true)
		expect(defaults.has('label')).toBe(false)
	})

	it('returns an empty map when the first parameter is not a destructure', () => {
		const fn = fromFunction(`function Foo(props) { return null }`)

		expect(extractDefaults(fn, undefined, STUB_CHECKER).size).toBe(0)
	})

	it('returns an empty map when the function has no parameters', () => {
		const fn = fromFunction(`function Foo() { return null }`)

		expect(extractDefaults(fn, undefined, STUB_CHECKER).size).toBe(0)
	})

	it('handles arrow function initializers', () => {
		const fn = fromFunction(`const Foo = ({ size = 'md' }) => null`)

		expect(extractDefaults(fn, undefined, STUB_CHECKER).get('size')).toBe(`'md'`)
	})

	it('unwraps a forwardRef wrapper and reads its inner destructured defaults', () => {
		const fn = fromFunction(`const Foo = forwardRef(({ size = 'md' }, ref) => null)`)

		expect(extractDefaults(fn, undefined, STUB_CHECKER).get('size')).toBe(`'md'`)
	})
})

// ---------------------------------------------------------------------------
// CVA defaults — derived from a `VariantProps<typeof recipe>` annotation.
// Pass a parameterless function as the callable so the inline path returns
// nothing and only the CVA collector contributes.
// ---------------------------------------------------------------------------

function emptyCallable(): ts.SignatureDeclaration {
	return fromFunction(`function Foo() { return null }`)
}

function cvaDefaults(sources: Record<string, string>, alias: string): Map<string, string> {
	const program = createInMemoryProgram(sources)

	const sf = program.sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found')

	return extractDefaults(emptyCallable(), firstTypeAlias(sf, alias), program.checker)
}

describe('extractDefaults — CVA defaultVariants', () => {
	it('reads defaultVariants out of a tv({ … }) recipe via VariantProps<typeof recipe>', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = { size?: 'sm' | 'md' }`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({ defaultVariants: { size: 'md' } })`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.get('size')).toBe(`'md'`)
	})

	it('captures multiple variant defaults from one recipe', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({`,
					`	defaultVariants: { size: 'md', color: 'zinc', loading: false },`,
					`})`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect([...defaults.entries()].sort()).toEqual(
			[
				['size', `'md'`],
				['color', `'zinc'`],
				['loading', `false`],
			].sort(),
		)
	})

	it('follows a project alias chain (typeof recipe → alias → VariantProps)', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({ defaultVariants: { size: 'lg' } })`,
					`type RecipeType = typeof recipe`,
					`type FooProps = VariantProps<RecipeType>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.get('size')).toBe(`'lg'`)
	})

	it('unwraps `as const` / `satisfies` around the recipe config', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({ defaultVariants: { size: 'sm' } } as const)`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.get('size')).toBe(`'sm'`)
	})

	it('resolves indirect tv(config) where config is a separate variable', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const config = { defaultVariants: { size: 'md' } }`,
					`const recipe = tv(config)`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.get('size')).toBe(`'md'`)
	})

	it('returns an empty map when the annotation has no VariantProps reference', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [`type FooProps = { size?: 'sm' | 'md' }`, `export type _Use = FooProps`].join(
					'\n',
				),
			},
			'FooProps',
		)

		expect(defaults.size).toBe(0)
	})

	it('returns an empty map when the recipe has no defaultVariants block', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({ variants: { size: { sm: 'a', md: 'b' } } })`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.size).toBe(0)
	})
})

// ---------------------------------------------------------------------------
// Combined — inline destructured defaults take precedence over CVA defaults.
// ---------------------------------------------------------------------------

describe('extractDefaults — inline + CVA precedence', () => {
	it('inline destructured defaults win over CVA defaults for the same key', () => {
		const program = createInMemoryProgram({
			'index.ts': [
				`type VariantProps<T> = T`,
				`declare function tv<T>(config: T): T`,
				`const recipe = tv({ defaultVariants: { size: 'sm' } })`,
				`type FooProps = VariantProps<typeof recipe>`,
				`function Foo({ size = 'lg' }: FooProps) { return null }`,
				`export type _Use = FooProps`,
			].join('\n'),
		})

		const sf = program.sourceFiles['index.ts']

		if (!sf) throw new Error('index.ts not found')

		const fn = sf.statements.find(
			(s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === 'Foo',
		)

		if (!fn) throw new Error('function Foo not found in index.ts')

		const annotation = fn.parameters[0]?.type

		if (!annotation) throw new Error('first parameter has no type annotation')

		expect(extractDefaults(fn, annotation, program.checker).get('size')).toBe(`'lg'`)
	})
})
