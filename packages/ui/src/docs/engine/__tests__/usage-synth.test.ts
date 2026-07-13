import ts from 'typescript'
import type { CallableApi, ComponentApi } from '../extractor/schema'
import type { Expr, UsageDoc } from '../usage'
import {
	type Complexity,
	formatSeed,
	makeRng,
	parseSeed,
	printUsage,
	resolveConfig,
	synthesize,
} from '../usage'

// A component exercising every synthesis path: literal unions, primitives, a
// controlled prop (`value`) beside its safe `defaultValue` twin, and a function
// prop. All optional, so complexity alone decides what gets set.
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

const config = (complexity: Complexity, extra?: { include?: string[]; exclude?: string[] }) =>
	resolveConfig({ complexity, ...extra })

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

	it('round-trips a seed through the base36 codec', () => {
		for (const seed of [0, 1, 42, 1337, 0xffffffff]) {
			expect(parseSeed(formatSeed(seed))).toBe(seed >>> 0)
		}

		expect(parseSeed(null)).toBeNull()

		expect(parseSeed('!!!')).toBeNull()
	})
})

describe('synthesize: components', () => {
	it('is deterministic for a fixed seed and complexity', () => {
		for (const seed of [1, 42, 1337]) {
			expect(synthesize(widget, 'ui/widget', config('rich'), seed)).toEqual(
				synthesize(widget, 'ui/widget', config('rich'), seed),
			)
		}
	})

	it('varies across seeds', () => {
		const outputs = new Set(
			Array.from({ length: 12 }, (_, seed) =>
				printUsage(synthesize(widget, 'ui/widget', config('rich'), seed)),
			),
		)

		expect(outputs.size).toBeGreaterThan(1)
	})

	it('includes props monotonically as complexity rises', () => {
		for (const seed of [1, 7, 42, 99, 1337]) {
			const minimal = new Set(attrNames(synthesize(widget, 'ui/widget', config('minimal'), seed)))
			const typical = new Set(attrNames(synthesize(widget, 'ui/widget', config('typical'), seed)))
			const rich = new Set(attrNames(synthesize(widget, 'ui/widget', config('rich'), seed)))

			for (const name of minimal) expect(typical).toContain(name)

			for (const name of typical) expect(rich).toContain(name)
		}
	})

	it('never sets a controlled prop, preferring its uncontrolled twin', () => {
		for (let seed = 0; seed < 24; seed++) {
			expect(attrNames(synthesize(widget, 'ui/widget', config('rich'), seed))).not.toContain(
				'value',
			)
		}

		// The `defaultValue` twin is eligible and appears at high complexity.
		const everSetsDefault = Array.from({ length: 24 }, (_, seed) =>
			attrNames(synthesize(widget, 'ui/widget', config('rich'), seed)),
		).some((names) => names.includes('defaultValue'))

		expect(everSetsDefault).toBe(true)
	})

	it('honors author include and exclude', () => {
		// `minimal` sets no optionals, yet an included prop is forced on.
		expect(
			attrNames(synthesize(widget, 'ui/widget', config('minimal', { include: ['count'] }), 3)),
		).toContain('count')

		// An excluded prop is absent even at the richest complexity.
		for (let seed = 0; seed < 12; seed++) {
			expect(
				attrNames(synthesize(widget, 'ui/widget', config('rich', { exclude: ['variant'] }), seed)),
			).not.toContain('variant')
		}
	})

	it('gives a child label to a component that renders children', () => {
		const doc = synthesize(widget, 'ui/widget', config('minimal'), 1)

		expect(showcase(doc).children).toEqual([{ e: 'text', value: expect.any(String) }])
	})

	it('produces valid TSX at every complexity and seed', () => {
		for (const complexity of ['minimal', 'typical', 'rich'] as const) {
			for (let seed = 0; seed < 8; seed++) {
				expect(parses(printUsage(synthesize(widget, 'ui/widget', config(complexity), seed)))).toBe(
					true,
				)
			}
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
		const doc = synthesize(hook, 'ui/hooks', config('typical'), 5)

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
		const doc = synthesize(formatter, 'ui/format', config('typical'), 5)

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
})
