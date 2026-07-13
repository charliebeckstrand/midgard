import type { ComponentApi } from '../extractor/schema'
import { type Expr, printUsage, resolveConfig, synthesize, type UsageDoc } from '../usage'

/** A showcase-only document wrapping one expression. */
const show = (imports: UsageDoc['imports'], value: Expr): UsageDoc => ({
	imports,
	body: [{ s: 'show', value }],
})

describe('printUsage: goldens', () => {
	it('prints an inline element with a text child', () => {
		const doc = show([{ names: ['Button'], from: 'ui/button' }], {
			e: 'jsx',
			tag: 'Button',
			attrs: [
				{ name: 'variant', value: { e: 'str', value: 'soft' } },
				{ name: 'block', value: null },
			],
			children: [{ e: 'text', value: 'Save changes' }],
		})

		expect(printUsage(doc)).toBe(
			`import { Button } from 'ui/button'\n\n<Button variant="soft" block>Save changes</Button>`,
		)
	})

	it('breaks a child onto its own line when the one-liner overflows', () => {
		const doc = show([{ names: ['Button'], from: 'ui/button' }], {
			e: 'jsx',
			tag: 'Button',
			attrs: [
				{ name: 'variant', value: { e: 'str', value: 'outline' } },
				{ name: 'color', value: { e: 'str', value: 'violet' } },
				{ name: 'href', value: { e: 'str', value: 'https://example.com/checkout' } },
			],
			children: [{ e: 'text', value: 'Proceed to checkout now' }],
		})

		expect(printUsage(doc)).toBe(
			[
				`import { Button } from 'ui/button'`,
				'',
				`<Button variant="outline" color="violet" href="https://example.com/checkout">`,
				'\tProceed to checkout now',
				'</Button>',
			].join('\n'),
		)
	})

	it('breaks a self-closing tag one attribute per line when it overflows', () => {
		const doc = show([{ names: ['Field'], from: 'ui/field' }], {
			e: 'jsx',
			tag: 'Field',
			attrs: [
				{ name: 'name', value: { e: 'str', value: 'shippingAddressLineOne' } },
				{ name: 'placeholder', value: { e: 'str', value: 'Enter your full street address' } },
				{ name: 'description', value: { e: 'str', value: 'We never share this information' } },
			],
			children: [],
		})

		expect(printUsage(doc)).toBe(
			[
				`import { Field } from 'ui/field'`,
				'',
				'<Field',
				'\tname="shippingAddressLineOne"',
				'\tplaceholder="Enter your full street address"',
				'\tdescription="We never share this information"',
				'/>',
			].join('\n'),
		)
	})

	it('hoists array data to a multiline const and references it', () => {
		const doc: UsageDoc = {
			imports: [{ names: ['Grid'], from: 'ui/grid' }],
			body: [
				{
					s: 'const',
					name: 'rows',
					value: {
						e: 'array',
						items: [
							{
								e: 'object',
								fields: [
									{ key: 'id', value: { e: 'str', value: 'a1b2c3' } },
									{ key: 'name', value: { e: 'str', value: 'Ada Lovelace' } },
									{ key: 'email', value: { e: 'str', value: 'ada@example.com' } },
								],
							},
							{
								e: 'object',
								fields: [
									{ key: 'id', value: { e: 'str', value: 'b2c3d4' } },
									{ key: 'name', value: { e: 'str', value: 'Alan Turing' } },
									{ key: 'email', value: { e: 'str', value: 'alan@example.com' } },
								],
							},
						],
					},
				},
				{
					s: 'show',
					value: {
						e: 'jsx',
						tag: 'Grid',
						attrs: [{ name: 'rows', value: { e: 'ident', name: 'rows' } }],
						children: [],
					},
				},
			],
		}

		expect(printUsage(doc)).toBe(
			[
				`import { Grid } from 'ui/grid'`,
				'',
				'const rows = [',
				`\t{ id: 'a1b2c3', name: 'Ada Lovelace', email: 'ada@example.com' },`,
				`\t{ id: 'b2c3d4', name: 'Alan Turing', email: 'alan@example.com' },`,
				']',
				'',
				'<Grid rows={rows} />',
			].join('\n'),
		)
	})

	it('prints a destructured hook call', () => {
		const doc: UsageDoc = {
			imports: [{ names: ['useToggle'], from: 'ui/hooks' }],
			body: [
				{
					s: 'destructure',
					names: ['value', 'setValue'],
					value: {
						e: 'call',
						callee: 'useToggle',
						args: [{ e: 'object', fields: [{ key: 'onValueChange', value: { e: 'arrow' } }] }],
					},
				},
			],
		}

		expect(printUsage(doc)).toBe(
			`import { useToggle } from 'ui/hooks'\n\nconst [value, setValue] = useToggle({ onValueChange: () => {} })`,
		)
	})

	it('nests a wrapper provider around the showcase', () => {
		const doc = show([{ names: ['Toast'], from: 'ui/toast' }], {
			e: 'jsx',
			tag: 'ToastProvider',
			attrs: [],
			children: [
				{
					e: 'jsx',
					tag: 'Toast',
					attrs: [{ name: 'title', value: { e: 'str', value: 'Saved' } }],
					children: [],
				},
			],
		})

		expect(printUsage(doc)).toBe(
			[
				`import { Toast } from 'ui/toast'`,
				'',
				'<ToastProvider>',
				'\t<Toast title="Saved" />',
				'</ToastProvider>',
			].join('\n'),
		)
	})
})

describe('printUsage: style invariants', () => {
	const widget: ComponentApi = {
		kind: 'component',
		name: 'Widget',
		props: [
			{ name: 'variant', type: "'a' | 'b'", shape: { k: 'literal-union', members: ['a', 'b'] } },
			{ name: 'label', type: 'string', shape: { k: 'primitive', name: 'string' } },
			{ name: 'count', type: 'number', shape: { k: 'primitive', name: 'number' } },
			{ name: 'block', type: 'boolean', shape: { k: 'primitive', name: 'boolean' } },
		],
		passThrough: [{ element: 'div' }],
	}

	/** Every synthesized snippet across a spread of seeds and complexities. */
	const snippets = ['minimal', 'typical', 'rich'].flatMap((complexity) =>
		Array.from({ length: 8 }, (_, seed) =>
			printUsage(
				synthesize(
					widget,
					'ui/widget',
					resolveConfig({ complexity: complexity as 'typical' }),
					seed,
				),
			),
		),
	)

	it('never emits a semicolon', () => {
		for (const code of snippets) expect(code).not.toContain(';')
	})

	it('indents with tabs only — no space-led lines', () => {
		for (const code of snippets) {
			for (const line of code.split('\n')) expect(line).not.toMatch(/^ /)
		}
	})

	it('keeps every line within the 100-column budget', () => {
		for (const code of snippets) {
			for (const line of code.split('\n')) {
				const tabs = line.match(/^\t*/)?.[0].length ?? 0

				expect(tabs * 2 + (line.length - tabs)).toBeLessThanOrEqual(100)
			}
		}
	})

	it('single-quotes JS strings in import lines', () => {
		for (const code of snippets) {
			const importLine = code.split('\n')[0] ?? ''

			expect(importLine).toMatch(/ from '[^']+'$/)
		}
	})
})
