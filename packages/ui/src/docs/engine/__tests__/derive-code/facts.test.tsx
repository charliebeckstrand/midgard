// @vitest-environment node
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { type ComponentRegistry, deriveCode, type SourceFacts } from '../../derive-code'
import { readTag } from '../../derive-code/registry'
import { extractSourceFacts } from '../../plugins/source-facts'
import { tag } from './helpers'

const registry: ComponentRegistry = {
	byType: { get: readTag },
	byName: new Map([
		['Field', { name: 'Field', module: 'fieldset' }],
		['Label', { name: 'Label', module: 'fieldset' }],
		['NumberInput', { name: 'NumberInput', module: 'number-input' }],
	]),
	packageName: 'ui',
}

const facts = (overrides: Partial<SourceFacts>): SourceFacts => ({
	elements: [],
	bindings: {},
	declarations: [],
	imports: {},
	...overrides,
})

describe('deriveCode source-fact props', () => {
	const MaskInput = tag<{
		value?: string
		onValueChange?: (value: string) => void
		format?: (value: string) => string
		placeholder?: string
	}>('MaskInput', 'mask-input')

	it('renders a function prop as its authored source and pulls the declaration', () => {
		const tree = createElement(MaskInput, { format: (v) => v, placeholder: 'ABC' })

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [{ name: 'MaskInput', props: { format: 'formatPlate' } }],
				bindings: { formatPlate: 0 },
				declarations: [
					{
						names: ['formatPlate'],
						code: 'function formatPlate(raw: string) {\n\treturn raw.toUpperCase()\n}',
					},
				],
			}),
		)

		expect(result).toBe(
			[
				`import { MaskInput } from 'ui/mask-input'`,
				'',
				'function formatPlate(raw: string) {',
				'\treturn raw.toUpperCase()',
				'}',
				'',
				'<MaskInput format={formatPlate} placeholder="ABC" />',
			].join('\n'),
		)
	})

	it('renders a controlled pair as source once the setter pulls their declaration', () => {
		const tree = createElement(MaskInput, { value: '', onValueChange: () => {} })

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [{ name: 'MaskInput', props: { value: 'value', onValueChange: 'setValue' } }],
				bindings: { value: 0, setValue: 0 },
				declarations: [
					{ names: ['value', 'setValue'], code: `const [value, setValue] = useState('')` },
				],
			}),
		)

		expect(result).toBe(
			[
				`import { MaskInput } from 'ui/mask-input'`,
				`import { useState } from 'react'`,
				'',
				`const [value, setValue] = useState('')`,
				'',
				'<MaskInput value={value} onValueChange={setValue} />',
			].join('\n'),
		)
	})

	it('keeps a live primitive when its declaration is never pulled', () => {
		const tree = createElement(MaskInput, { value: 'solid' })

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [{ name: 'MaskInput', props: { value: 'variant' } }],
				bindings: { variant: 0 },
				declarations: [{ names: ['variant'], code: `const variant = 'solid'` }],
			}),
		)

		expect(result).toContain('<MaskInput value="solid" />')

		expect(result).not.toContain('const variant')
	})

	describe('a live `false`', () => {
		const Dialog = tag<{
			open?: boolean
			onOpenChange?: (open: boolean) => void
			closable?: boolean
			disabled?: boolean
		}>('Dialog', 'dialog')

		// `false` turns off a prop whose default is on, so dropping it flips the prop.
		it('prints an authored `false`', () => {
			const tree = createElement(Dialog, { closable: false })

			const result = deriveCode(
				tree,
				registry,
				facts({ elements: [{ name: 'Dialog', props: { closable: 'false' } }] }),
			)

			expect(result).toContain('<Dialog closable={false} />')
		})

		it('prints its identifier once the setter pulls the declaration', () => {
			const tree = createElement(Dialog, { open: false, onOpenChange: () => {} })

			const result = deriveCode(
				tree,
				registry,
				facts({
					elements: [{ name: 'Dialog', props: { open: 'open', onOpenChange: 'setOpen' } }],
					bindings: { open: 0, setOpen: 0 },
					declarations: [
						{ names: ['open', 'setOpen'], code: 'const [open, setOpen] = useState(false)' },
					],
				}),
			)

			expect(result).toContain('<Dialog open={open} onOpenChange={setOpen} />')
		})

		it('drops it when its source is an expression', () => {
			const tree = createElement(Dialog, { disabled: false })

			const result = deriveCode(
				tree,
				registry,
				facts({ elements: [{ name: 'Dialog', props: { disabled: '!value' } }] }),
			)

			expect(result).toContain('<Dialog />')
		})
	})

	describe('a live `null` or `undefined`', () => {
		const Picker = tag<{
			value?: Date | null
			defaultValue?: Date | null
			onValueChange?: (value: Date | null) => void
		}>('Picker', 'picker')

		const pulled = {
			bindings: { date: 0, setDate: 0 },
			declarations: [
				{ names: ['date', 'setDate'], code: 'const [date, setDate] = useState<Date | null>(null)' },
			],
		}

		// A controlled value that is empty at render keeps its value beside its setter.
		it.each([null, undefined])(
			'prints %s as its identifier once the setter pulls the declaration',
			(value) => {
				const tree = createElement(Picker, { value, onValueChange: () => {} })

				const result = deriveCode(
					tree,
					registry,
					facts({
						elements: [{ name: 'Picker', props: { value: 'date', onValueChange: 'setDate' } }],
						...pulled,
					}),
				)

				expect(result).toContain('<Picker value={date} onValueChange={setDate} />')
			},
		)

		it('prints an authored `null`', () => {
			const tree = createElement(Picker, { defaultValue: null })

			const result = deriveCode(
				tree,
				registry,
				facts({ elements: [{ name: 'Picker', props: { defaultValue: 'null' } }] }),
			)

			expect(result).toContain('<Picker defaultValue={null} />')
		})

		it('drops it when its source is an expression', () => {
			const tree = createElement(Picker, { value: undefined })

			const result = deriveCode(
				tree,
				registry,
				facts({ elements: [{ name: 'Picker', props: { value: 'picked ?? fallback' } }] }),
			)

			expect(result).toContain('<Picker />')
		})
	})

	describe('an element prop', () => {
		const Kbd = tag<{ children?: ReactNode }>('Kbd', 'kbd')

		const Trigger = tag<{ suffix?: ReactNode; children?: ReactNode }>('Trigger', 'trigger')

		it('prints its authored source, children included', () => {
			const tree = createElement(Trigger, { suffix: createElement(Kbd, null, '⌘O') }, 'Open')

			const result = deriveCode(
				tree,
				registry,
				facts({ elements: [{ name: 'Trigger', props: { suffix: '<Kbd>⌘O</Kbd>' } }] }),
			)

			expect(result).toContain('<Trigger suffix={<Kbd>⌘O</Kbd>}>Open</Trigger>')
		})

		it('prints an identifier source, and pulls its declaration', () => {
			const tree = createElement(Trigger, { suffix: createElement(Kbd, null, '⌘O') })

			const result = deriveCode(
				tree,
				registry,
				facts({
					elements: [{ name: 'Trigger', props: { suffix: 'shortcut' } }],
					bindings: { shortcut: 0 },
					declarations: [{ names: ['shortcut'], code: 'const shortcut = <Kbd>⌘O</Kbd>' }],
				}),
			)

			expect(result).toContain('const shortcut = <Kbd>⌘O</Kbd>')

			expect(result).toContain('<Trigger suffix={shortcut} />')
		})

		// `keys[k]` names the item of a `.map`, which the block never binds.
		it('prints its live form when the source uses a name of a callback in the JSX', () => {
			const tree = createElement(Trigger, { suffix: createElement(Kbd, null, '⌘O') })

			const result = deriveCode(
				tree,
				registry,
				facts({
					elements: [{ name: 'Trigger', props: { suffix: 'keys[k]' }, local: ['suffix'] }],
				}),
			)

			expect(result).toContain('<Trigger suffix={<Kbd>⌘O</Kbd>} />')
		})

		it('prints the children of its live form, with text that JSX reads as syntax quoted', () => {
			const tree = createElement(Trigger, {
				suffix: createElement(Kbd, null, 'a < b', createElement(Kbd, null, 'K')),
			})

			expect(deriveCode(tree, registry)).toContain(
				'<Trigger suffix={<Kbd>{"a < b"}<Kbd>K</Kbd></Kbd>} />',
			)
		})
	})

	it('rescues an unserializable prop with source instead of a placeholder', () => {
		const Grid = tag<{ sort?: unknown }>('Grid', 'modules/grid')

		const tree = createElement(Grid, { sort: { value: [], onValueChange: () => {} } })

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [{ name: 'Grid', props: { sort: '{ value: sort, onValueChange: setSort }' } }],
				bindings: { sort: 0, setSort: 0 },
				declarations: [
					{ names: ['sort', 'setSort'], code: 'const [sort, setSort] = useState([])' },
				],
			}),
		)

		expect(result).toContain('<Grid sort={{ value: sort, onValueChange: setSort }} />')

		expect(result).toContain('const [sort, setSort] = useState([])')
	})

	it('drops a function prop and placeholders an unserializable one without facts', () => {
		const Grid = tag<{ sort?: unknown; onRowClick?: () => void }>('Grid', 'modules/grid')

		const tree = createElement(Grid, { sort: { value: [] }, onRowClick: () => {} })

		const result = deriveCode(tree, registry)

		expect(result).toContain('<Grid sort={...} />')

		expect(result).not.toContain('onRowClick')
	})

	it('resolves preamble identifiers through the import facts', () => {
		const Odometer = tag<{ value?: number; format?: unknown }>('Odometer', 'odometer')

		const tree = createElement(Odometer, { value: 42, format: () => '' })

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [{ name: 'Odometer', props: { format: 'format' } }],
				bindings: { format: 0 },
				declarations: [
					{ names: ['format'], code: `const format = useFormat({ type: 'currency' })` },
				],
				imports: { useFormat: { module: 'providers/locale' } },
			}),
		)

		expect(result).toContain(`import { useFormat } from 'ui/providers/locale'`)

		expect(result).toContain(`const format = useFormat({ type: 'currency' })`)
	})
})

describe('deriveCode source-fact render props', () => {
	it('emits a render-prop child verbatim and infers its component imports', () => {
		const FiltersField = tag<{ name?: string; children?: unknown }>('FiltersField', 'filters')

		// A render-prop child isn't a valid ReactNode; the cast mirrors how the
		// component's own children type admits it at runtime.
		const tree = createElement(
			FiltersField,
			{ name: 'minPrice' },
			(() => null) as unknown as ReactNode,
		)

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [
					{
						name: 'FiltersField',
						props: {},
						children:
							'({ value, onValueChange }) => (\n\t<NumberInput value={value} onValueChange={onValueChange} />\n)',
					},
				],
			}),
		)

		// `reindent` anchors the snippet to the child indent while preserving the
		// authored relative indentation (the tab).
		expect(result).toBe(
			[
				`import { FiltersField } from 'ui/filters'`,
				`import { NumberInput } from 'ui/number-input'`,
				'',
				'<FiltersField name="minPrice">',
				'  {({ value, onValueChange }) => (',
				'  \t<NumberInput value={value} onValueChange={onValueChange} />',
				'  )}',
				'</FiltersField>',
			].join('\n'),
		)
	})
})

describe('deriveCode source-fact matching', () => {
	const Button = tag<{ onClick?: () => void; children?: unknown }>('Button', 'button')

	it('drops a prop when same-named candidates disagree on its source', () => {
		const tree = createElement(Button, { onClick: () => {} }, 'One')

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [
					{ name: 'Button', props: { onClick: 'first' } },
					{ name: 'Button', props: { onClick: 'second' } },
				],
			}),
		)

		expect(result).toContain('<Button>One</Button>')
	})

	it('uses the consensus when same-named candidates agree', () => {
		const tree = createElement(Button, { onClick: () => {} }, 'One')

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [
					{ name: 'Button', props: { onClick: 'handle' } },
					{ name: 'Button', props: { onClick: 'handle' } },
				],
			}),
		)

		expect(result).toContain('<Button onClick={handle}>One</Button>')
	})

	it('pairs the k-th rendered element of a tag with its k-th fact', () => {
		const tree = createElement(
			'div',
			null,
			createElement(Button, { onClick: () => {} }, 'One'),
			createElement(Button, { onClick: () => {} }, 'Two'),
		)

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [
					{ name: 'Button', props: { onClick: 'first' } },
					{ name: 'Button', props: { onClick: 'second' } },
				],
			}),
		)

		expect(result).toContain(
			'<Button onClick={first}>One</Button>\n<Button onClick={second}>Two</Button>',
		)
	})

	it('keeps an element with an empty fact free of the facts of the others', () => {
		const tree = createElement(
			'div',
			null,
			createElement(Button, { onClick: () => {} }, 'Spread'),
			createElement(Button, { onClick: () => {} }, 'Saved'),
		)

		const result = deriveCode(
			tree,
			registry,
			facts({
				elements: [
					{ name: 'Button', props: {} },
					{ name: 'Button', props: { onClick: 'save' } },
				],
			}),
		)

		expect(result).toContain('<Button>Spread</Button>\n<Button onClick={save}>Saved</Button>')
	})

	// An authored prop that is `undefined` at render is still a key of the props.
	it('claims a fact whose prop is `undefined` at render', () => {
		const Cvv = tag<{ brand?: string; onBrandChange?: () => void }>('Cvv', 'cvv')

		const tree = createElement(Cvv, { brand: undefined, onBrandChange: () => {} })

		const result = deriveCode(
			tree,
			registry,
			facts({ elements: [{ name: 'Cvv', props: { brand: 'brand', onBrandChange: 'setBrand' } }] }),
		)

		expect(result).toContain('<Cvv onBrandChange={setBrand} />')
	})

	it('ignores a candidate claiming props the runtime element lacks', () => {
		const tree = createElement(Button, null, 'Plain')

		const result = deriveCode(
			tree,
			registry,
			facts({ elements: [{ name: 'Button', props: { onClick: 'handle' } }] }),
		)

		expect(result).toContain('<Button>Plain</Button>')
	})
})

describe('deriveCode mapped runs', () => {
	const Page = tag<{ value?: number; onClick?: () => void }>('Page', 'page')

	const Gap = tag('Gap', 'page')

	const List = tag<{ children?: ReactNode }>('List', 'list')

	const map =
		'pages.map((p) => (p === 0 ? <Gap key="gap" /> : <Page key={p} onClick={() => go(p)} />))'

	const pageFacts = (local: boolean) =>
		facts({
			elements: [
				{ name: 'Gap', props: {}, map },
				{
					name: 'Page',
					props: { onClick: '() => go(p)' },
					...(local ? { local: ['onClick'] } : {}),
					map,
				},
			],
			bindings: { pages: 0 },
			declarations: [{ names: ['pages'], code: 'const pages = [1, 0, 2]' }],
		})

	const tree = createElement(
		List,
		null,
		[1, 0, 2].map((p) =>
			p === 0
				? createElement(Gap, { key: 'gap' })
				: createElement(Page, { key: p, value: p, onClick: () => {} }),
		),
	)

	// `p` is the map's item, so the run prints the map, which binds it.
	it('prints a run as its authored map when an element prints a name that the map binds', () => {
		const result = deriveCode(tree, registry, pageFacts(true))

		expect(result).toContain(`<List>\n  {${map}}\n</List>`)

		expect(result).toContain('const pages = [1, 0, 2]')
	})

	// The inner map names the outer item, so the outer map prints, and binds it.
	it('prints the outer map when an inner map uses the outer item', () => {
		const Column = tag<{ children?: ReactNode }>('Column', 'board')

		const Card = tag<{ onClick?: () => void }>('Card', 'board')

		const outer = 'columns.map((column) => <Column key={column.id}>{column.cards.map(…)}</Column>)'

		const inner = 'column.cards.map((card) => <Card key={card} onClick={() => pick(card)} />)'

		const board = createElement(
			List,
			null,
			['a', 'b'].map((id) =>
				createElement(
					Column,
					{ key: id },
					[1, 2].map((card) => createElement(Card, { key: card, onClick: () => {} })),
				),
			),
		)

		const result = deriveCode(
			board,
			registry,
			facts({
				elements: [
					{ name: 'Column', props: {}, map: outer },
					{
						name: 'Card',
						props: { onClick: '() => pick(card)' },
						local: ['onClick'],
						map: inner,
						mapLocal: true,
					},
				],
			}),
		)

		expect(result).toContain(`<List>\n  {${outer}}\n</List>`)
	})

	it('prints a run one element at a time when no element prints such a name', () => {
		const result = deriveCode(tree, registry, pageFacts(false))

		expect(result).toContain('<Page value={1} onClick={() => go(p)} />\n  <Gap />')

		expect(result).not.toContain('pages.map')
	})
})

describe('deriveCode round trip through extractSourceFacts', () => {
	it('reproduces a controlled-input snippet from the authored demo source', () => {
		const source = [
			`import { useState } from 'react'`,
			`import { Field, Label } from '../../../components/fieldset'`,
			`import { MaskInput } from '../../../components/mask-input'`,
			`import { Example } from '../../engine'`,
			``,
			`function formatPlate(raw: string) {`,
			`\treturn raw.toUpperCase()`,
			`}`,
			``,
			`export function Demo() {`,
			`\tconst [value, setValue] = useState('')`,
			``,
			`\treturn (`,
			`\t\t<Example title="Controlled">`,
			`\t\t\t<Field>`,
			`\t\t\t\t<Label>License plate</Label>`,
			`\t\t\t\t<MaskInput value={value} onValueChange={setValue} format={formatPlate} placeholder="ABC-1234" />`,
			`\t\t\t</Field>`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const extracted = extractSourceFacts(source, {
			filePath: '/lib/src/docs/demos/components/demo.tsx',
			srcDir: '/lib/src',
		})

		const site = extracted?.sites[0]

		expect(site).toBeDefined()

		const Field = tag<{ children?: unknown }>('Field', 'fieldset')

		const Label = tag<{ children?: unknown }>('Label', 'fieldset')

		const MaskInput = tag<{
			value?: string
			onValueChange?: (value: string) => void
			format?: (value: string) => string
			placeholder?: string
		}>('MaskInput', 'mask-input')

		const tree = createElement(
			Field,
			null,
			createElement(Label, null, 'License plate'),
			createElement(MaskInput, {
				value: '',
				onValueChange: () => {},
				format: (raw) => raw,
				placeholder: 'ABC-1234',
			}),
		)

		const result = deriveCode(tree, registry, {
			elements: site?.elements ?? [],
			bindings: site?.bindings ?? {},
			declarations: extracted?.declarations ?? [],
			imports: extracted?.imports ?? {},
		})

		// The rescued props push the open tag past the inline budget, so it wraps
		// one prop per line — value and setValue in source form, the literal live.
		expect(result).toBe(
			[
				`import { Field, Label } from 'ui/fieldset'`,
				`import { MaskInput } from 'ui/mask-input'`,
				`import { useState } from 'react'`,
				'',
				'function formatPlate(raw: string) {',
				'\treturn raw.toUpperCase()',
				'}',
				'',
				`const [value, setValue] = useState('')`,
				'',
				'<Field>',
				'  <Label>License plate</Label>',
				'  <MaskInput',
				'    value={value}',
				'    onValueChange={setValue}',
				'    format={formatPlate}',
				'    placeholder="ABC-1234"',
				'  />',
				'</Field>',
			].join('\n'),
		)
	})
})
