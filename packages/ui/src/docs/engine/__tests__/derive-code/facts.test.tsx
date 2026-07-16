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
