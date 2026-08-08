import { describe, expect, it } from 'vitest'
import { extractSourceFacts, injectSourceFacts } from '../../plugins/source-facts'

// Paths mirror a real demo's layout so relative imports resolve against the
// synthetic source root.
const OPTIONS = {
	filePath: '/lib/src/docs/demos/components/demo.tsx',
	srcDir: '/lib/src',
}

const extract = (source: string) => extractSourceFacts(source, OPTIONS)

describe('extractSourceFacts element facts', () => {
	it('records expression props and skips runtime-recoverable literals', () => {
		const source = [
			`export function Demo() {`,
			`\tconst [value, setValue] = useState('')`,
			``,
			`\treturn (`,
			`\t\t<Example title="Controlled">`,
			`\t\t\t<MaskInput value={value} onValueChange={setValue} placeholder="ABC" size={2} open={false} tab={-1} />`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		expect(facts?.sites).toHaveLength(1)

		expect(facts?.sites[0]?.elements).toEqual([
			{ name: 'MaskInput', props: { value: 'value', onValueChange: 'setValue' } },
		])
	})

	it('omits elements contributing no facts', () => {
		const source = [
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Default">`,
			`\t\t\t<Field>`,
			`\t\t\t\t<Label>Card number</Label>`,
			`\t\t\t\t<CreditCardInput format={fmt} />`,
			`\t\t\t</Field>`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		expect(facts?.sites[0]?.elements.map((el) => el.name)).toEqual(['CreditCardInput'])
	})

	it('returns null when every Example is literal-only or carries an explicit code override', () => {
		const source = [
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<>`,
			`\t\t\t<Example title="Literals">`,
			`\t\t\t\t<Button variant="solid" disabled>Hi</Button>`,
			`\t\t\t</Example>`,
			`\t\t\t<Example title="Override" code={code\`<Grid sort={sort} />\`}>`,
			`\t\t\t\t<Grid sort={sort} />`,
			`\t\t\t</Example>`,
			`\t\t</>`,
			`\t)`,
			`}`,
		].join('\n')

		expect(extract(source)).toBeNull()
	})

	it('records a render-prop child verbatim without descending into it', () => {
		const source = [
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Render props">`,
			`\t\t\t<FiltersField name="minPrice">`,
			`\t\t\t\t{({ value, onValueChange }) => (`,
			`\t\t\t\t\t<NumberInput value={value} onValueChange={onValueChange} />`,
			`\t\t\t\t)}`,
			`\t\t\t</FiltersField>`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		const [field] = facts?.sites[0]?.elements ?? []

		expect(field?.name).toBe('FiltersField')

		expect(field?.children).toContain('({ value, onValueChange }) =>')

		// NumberInput lives inside the render prop: the walker never reaches it,
		// so no element fact may claim it.
		expect(facts?.sites[0]?.elements).toHaveLength(1)
	})

	it('descends into map callbacks whose elements the walker does see', () => {
		const source = [
			`const variants = ['solid', 'soft']`,
			``,
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Variants">`,
			`\t\t\t{variants.map((variant) => (`,
			`\t\t\t\t<Button key={variant} onClick={() => pick(variant)}>{variant}</Button>`,
			`\t\t\t))}`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		expect(facts?.sites[0]?.elements).toEqual([
			{ name: 'Button', props: { onClick: '() => pick(variant)' } },
		])
	})
})

describe('extractSourceFacts declarations and bindings', () => {
	it('binds module-scope and enclosing-function declarations, pruning the unreferenced', () => {
		const source = [
			`const UNUSED = ['never', 'shipped']`,
			``,
			`function formatPlate(raw: string) {`,
			`\treturn raw.toUpperCase()`,
			`}`,
			``,
			`function ControlledExample() {`,
			`\tconst [value, setValue] = useState('')`,
			``,
			`\treturn (`,
			`\t\t<Example title="Controlled">`,
			`\t\t\t<MaskInput value={value} onValueChange={setValue} format={formatPlate} />`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		const codes = facts?.declarations.map((decl) => decl.code) ?? []

		expect(codes.some((code) => code.startsWith('function formatPlate'))).toBe(true)

		expect(codes.some((code) => code.includes('useState'))).toBe(true)

		expect(codes.some((code) => code.includes('UNUSED'))).toBe(false)

		const bindings = facts?.sites[0]?.bindings ?? {}

		expect(bindings.value).toBe(bindings.setValue)

		expect(bindings.formatPlate).not.toBe(bindings.value)
	})

	it('lets an enclosing-function declaration shadow a module-scope one', () => {
		const source = [
			`const label = 'outer'`,
			``,
			`export function Demo() {`,
			`\tconst label = 'inner'`,
			``,
			`\treturn (`,
			`\t\t<Example title="Shadow">`,
			`\t\t\t<Chip prefix={label} />`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		const bindings = facts?.sites[0]?.bindings ?? {}

		const bound = bindings.label

		expect(bound).toBeDefined()

		expect(facts?.declarations[bound ?? -1]?.code).toBe(`const label = 'inner'`)
	})

	it('includes declarations pulled only transitively', () => {
		const source = [
			`const BASE = 10`,
			``,
			`const fmt = makeFmt(BASE)`,
			``,
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Chain">`,
			`\t\t\t<Odometer format={fmt} />`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const codes = extract(source)?.declarations.map((decl) => decl.code) ?? []

		expect(codes).toContain('const BASE = 10')

		expect(codes).toContain('const fmt = makeFmt(BASE)')
	})

	it('excludes module-scope JSX helper components from the declaration table', () => {
		const source = [
			`const Card = () => <div>card</div>`,
			``,
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Helper">`,
			`\t\t\t<Slot render={Card} />`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		expect(facts?.sites[0]?.bindings.Card).toBeUndefined()

		expect(facts?.declarations).toHaveLength(0)
	})
})

describe('extractSourceFacts imports', () => {
	const source = [
		`import { useState } from 'react'`,
		`import { Star, type LucideIcon } from 'lucide-react'`,
		`import { useFormat } from '../../../providers/locale'`,
		`import { MaskInput as Masked } from '../../../components/mask-input'`,
		`import { Example } from '../../engine'`,
		``,
		`export function Demo() {`,
		`\tconst [value, setValue] = useState('')`,
		``,
		`\tconst format = useFormat({ type: 'currency' })`,
		``,
		`\treturn (`,
		`\t\t<Example title="Imports">`,
		`\t\t\t<Odometer value={value} format={format} icon={Star} masked={Masked} />`,
		`\t\t</Example>`,
		`\t)`,
		`}`,
	].join('\n')

	it('maps relative specifiers to public modules and keeps bare ones external', () => {
		const imports = extract(source)?.imports ?? {}

		expect(imports.useFormat).toEqual({ module: 'providers/locale' })

		expect(imports.Star).toEqual({ module: 'lucide-react', external: true })

		expect(imports.useState).toEqual({ module: 'react', external: true })
	})

	it('skips docs-internal, aliased, and type-only specifiers', () => {
		const imports = extract(source)?.imports ?? {}

		expect(imports.Example).toBeUndefined()

		expect(imports.Masked).toBeUndefined()

		expect(imports.LucideIcon).toBeUndefined()
	})
})

describe('injectSourceFacts splicing', () => {
	it('injects a __facts attribute per qualifying Example and one shared tail const', () => {
		const source = [
			`export function Demo() {`,
			`\tconst [value, setValue] = useState('')`,
			``,
			`\treturn (`,
			`\t\t<>`,
			`\t\t\t<Example title="One">`,
			`\t\t\t\t<MaskInput onValueChange={setValue} />`,
			`\t\t\t</Example>`,
			`\t\t\t<Example`,
			`\t\t\t\ttitle="Two"`,
			`\t\t\t>`,
			`\t\t\t\t<MaskInput value={value} />`,
			`\t\t\t</Example>`,
			`\t\t</>`,
			`\t)`,
			`}`,
		].join('\n')

		const out = injectSourceFacts(source, OPTIONS)

		expect(out).toContain('<Example __facts={__exampleFacts[0]} title="One">')

		expect(out).toContain('<Example __facts={__exampleFacts[1]}\n\t\t\t\ttitle="Two"')

		expect(out?.match(/__exampleFactsShared =/g)).toHaveLength(1)

		// The original body is untouched ahead of the splices.
		expect(out?.startsWith('export function Demo() {')).toBe(true)
	})

	it('leaves an Example with an explicit code override unspliced', () => {
		const source = [
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<>`,
			`\t\t\t<Example title="Override" code={snippet}>`,
			`\t\t\t\t<Grid sort={sort} />`,
			`\t\t\t</Example>`,
			`\t\t\t<Example title="Derived">`,
			`\t\t\t\t<Grid sort={sort} />`,
			`\t\t\t</Example>`,
			`\t\t</>`,
			`\t)`,
			`}`,
		].join('\n')

		const out = injectSourceFacts(source, OPTIONS)

		expect(out).toContain('<Example title="Override" code={snippet}>')

		expect(out).toContain('<Example __facts={__exampleFacts[0]} title="Derived">')
	})
})
