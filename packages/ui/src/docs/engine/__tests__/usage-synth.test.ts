import ts from 'typescript'
import type { UsageAuthorConfig } from '../contracts'
import type { CallableApi, ComponentApi } from '../extractor/schema'
import type { Expr, UsageDoc } from '../usage'
import { hashSeed, makeRng, printUsage, resolveConfig, synthesize } from '../usage'

// A component exercising every synthesis path: literal unions, primitives, a
// controlled prop (`value`) beside its safe `defaultValue` twin, and a function
// prop. All optional, so nothing is set unless required or author-included.
const widget: ComponentApi = {
	kind: 'component',
	name: 'Widget',
	props: [
		{
			name: 'variant',
			type: "'a' | 'b' | 'c'",
			shape: { k: 'literal-union', members: ['a', 'b', 'c'] },
		},
		{ name: 'size', type: "'sm' | 'md'", shape: { k: 'literal-union', members: ['sm', 'md'] } },
		{ name: 'label', type: 'string', shape: { k: 'primitive', name: 'string' } },
		{ name: 'count', type: 'number', shape: { k: 'primitive', name: 'number' } },
		{ name: 'block', type: 'boolean', shape: { k: 'primitive', name: 'boolean' } },
		{ name: 'value', type: 'string', shape: { k: 'primitive', name: 'string' } },
		{ name: 'defaultValue', type: 'string', shape: { k: 'primitive', name: 'string' } },
		{ name: 'onChange', type: '(v: string) => void', shape: { k: 'fn', arity: 1 } },
	],
	passThrough: [{ element: 'div' }],
}

const config = (author: UsageAuthorConfig = {}) => resolveConfig(author)

/** The showcase JSX element of a synthesized component doc. */
function showcase(doc: UsageDoc): Extract<Expr, { e: 'jsx' }> {
	const show = doc.body.at(-1)

	if (show?.s !== 'show' || show.value.e !== 'jsx') throw new Error('no showcase element')

	return show.value
}

const attrNames = (doc: UsageDoc): string[] => showcase(doc).attrs.map((attr) => attr.name)

/** Syntactic validity: the printed snippet parses as TSX with no errors. */
function parses(code: string): boolean {
	const source = ts.createSourceFile(
		'usage.tsx',
		code,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	)

	return (source as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics.length === 0
}

describe('prng', () => {
	it('is deterministic per seed and varies across seeds', () => {
		const a = makeRng(7)

		const b = makeRng(7)

		for (let i = 0; i < 5; i++) expect(a.next()).toBe(b.next())

		expect(makeRng(1).next()).not.toBe(makeRng(2).next())
	})

	it('hashes a stable seed per string', () => {
		expect(hashSeed('ui/button')).toBe(hashSeed('ui/button'))

		expect(hashSeed('ui/button')).not.toBe(hashSeed('ui/badge'))
	})
})

describe('synthesize: components', () => {
	it('is deterministic for a fixed seed', () => {
		for (const seed of [1, 42, 1337]) {
			expect(
				synthesize(widget, 'ui/widget', config({ include: ['variant', 'label'] }), seed),
			).toEqual(synthesize(widget, 'ui/widget', config({ include: ['variant', 'label'] }), seed))
		}
	})

	it('varies across seeds', () => {
		const outputs = new Set(
			Array.from({ length: 12 }, (_, seed) =>
				printUsage(
					synthesize(widget, 'ui/widget', config({ include: ['variant', 'label', 'count'] }), seed),
				),
			),
		)

		expect(outputs.size).toBeGreaterThan(1)
	})

	it('sets no optional props without an author include', () => {
		for (const seed of [0, 1, 7, 42]) {
			expect(attrNames(synthesize(widget, 'ui/widget', config(), seed))).toEqual([])
		}
	})

	it('honors author include and exclude', () => {
		expect(attrNames(synthesize(widget, 'ui/widget', config({ include: ['count'] }), 3))).toContain(
			'count',
		)

		const names = attrNames(
			synthesize(
				widget,
				'ui/widget',
				config({ include: ['count', 'label'], exclude: ['label'] }),
				3,
			),
		)

		expect(names).toContain('count')

		expect(names).not.toContain('label')
	})

	it('never auto-sets a controlled prop', () => {
		for (let seed = 0; seed < 12; seed++) {
			expect(attrNames(synthesize(widget, 'ui/widget', config(), seed))).not.toContain('value')
		}
	})

	it('gives a child label to a component that renders children', () => {
		const doc = synthesize(widget, 'ui/widget', config(), 1)

		expect(showcase(doc).children).toEqual([{ e: 'text', value: expect.any(String) }])
	})

	it('fills an optional text-bearing react-node slot but not an element one', () => {
		const panel: ComponentApi = {
			kind: 'component',
			name: 'Panel',
			props: [
				{ name: 'title', type: 'ReactNode', shape: { k: 'react-node' } },
				{ name: 'icon', type: 'ReactNode', shape: { k: 'react-node' } },
			],
			passThrough: [],
		}

		const { attrs } = showcase(synthesize(panel, 'ui/panel', config(), 1))

		// `title` is optional, yet a content slot fills so the example isn't empty.
		expect(attrs.find((attr) => attr.name === 'title')?.value).toMatchObject({
			e: 'str',
			value: expect.any(String),
		})

		// `icon` is an element slot with no safe value to invent, so it stays unset.
		expect(attrs.map((attr) => attr.name)).not.toContain('icon')
	})

	it('produces valid TSX across seeds', () => {
		for (let seed = 0; seed < 8; seed++) {
			const doc = synthesize(
				widget,
				'ui/widget',
				config({ include: ['variant', 'size', 'label', 'count', 'block', 'defaultValue'] }),
				seed,
			)

			expect(parses(printUsage(doc))).toBe(true)
		}
	})
})

describe('synthesize: callables', () => {
	const hook: CallableApi = {
		kind: 'hook',
		name: 'useThing',
		signatures: [
			{
				params: [
					{
						name: 'options',
						type: 'ThingOptions',
						shape: {
							k: 'object',
							fields: { value: { k: 'opaque' }, onChange: { k: 'fn', arity: 1 } },
						},
					},
				],
				returns: {
					type: '[T | undefined, (value: T) => void]',
					shape: { k: 'tuple', elements: [{ k: 'opaque' }, { k: 'fn', arity: 1 }] },
				},
			},
		],
	}

	const formatter: CallableApi = {
		kind: 'function',
		name: 'formatThing',
		signatures: [
			{
				params: [{ name: 'amount', type: 'number', shape: { k: 'primitive', name: 'number' } }],
				returns: { type: 'string' },
			},
		],
	}

	it('destructures a state hook into [value, setValue] and drops opaque args', () => {
		const doc = synthesize(hook, 'ui/hooks', config(), 5)

		const [binding] = doc.body

		expect(binding).toMatchObject({ s: 'destructure', names: ['value', 'setValue'] })

		expect(
			binding?.s === 'destructure' && binding.value.e === 'call' && binding.value.args[0],
		).toMatchObject({
			e: 'object',
			fields: [{ key: 'onChange', value: { e: 'arrow' } }],
		})
	})

	it('shows a plain function as a call expression', () => {
		const doc = synthesize(formatter, 'ui/format', config(), 5)

		expect(doc.body).toEqual([
			{
				s: 'show',
				value: {
					e: 'call',
					callee: 'formatThing',
					args: [{ e: 'num', value: expect.any(Number) }],
				},
			},
		])

		expect(parses(printUsage(doc))).toBe(true)
	})

	it('synthesizes a tuple parameter as an array of its element values', () => {
		const plot: CallableApi = {
			kind: 'function',
			name: 'plot',
			signatures: [
				{
					params: [
						{
							name: 'point',
							type: '[string, number]',
							shape: {
								k: 'tuple',
								elements: [
									{ k: 'primitive', name: 'string' },
									{ k: 'primitive', name: 'number' },
								],
							},
						},
					],
					returns: { type: 'void', shape: { k: 'opaque' } },
				},
			],
		}

		const show = synthesize(plot, 'ui/plot', config(), 3).body[0]

		expect(show?.s === 'show' && show.value.e === 'call' && show.value.args[0]).toMatchObject({
			e: 'array',
			items: [{ e: 'str' }, { e: 'num' }],
		})
	})
})
