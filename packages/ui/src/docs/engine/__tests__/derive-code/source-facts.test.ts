// @vitest-environment node
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { extractSourceFacts, importFacts, injectSourceFacts } from '../../plugins/source-facts'
import { parseSource } from '../../plugins/ts-source'

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

		// The walker reads a live `false` as absent, so `open={false}` keeps its fact.
		expect(facts?.sites[0]?.elements).toEqual([
			{ name: 'MaskInput', props: { value: 'value', onValueChange: 'setValue', open: 'false' } },
		])
	})

	// The walk pairs the k-th rendered element of a tag with the k-th entry.
	it('keeps an empty entry for an element of a tag that has facts elsewhere', () => {
		const source = [
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Buttons">`,
			`\t\t\t<Button>Plain</Button>`,
			`\t\t\t<Button onClick={save}>Save</Button>`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		expect(extract(source)?.sites[0]?.elements).toEqual([
			{ name: 'Button', props: {} },
			{ name: 'Button', props: { onClick: 'save' } },
		])
	})

	it('omits the elements of a tag that has no facts', () => {
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

		// `variant` is the map's item, so the source of `onClick` is local, and
		// the Button carries the map it renders from.
		expect(facts?.sites[0]?.elements).toEqual([
			{
				name: 'Button',
				props: { onClick: '() => pick(variant)' },
				local: ['onClick'],
				map: `variants.map((variant) => (\n\t\t\t\t<Button key={variant} onClick={() => pick(variant)}>{variant}</Button>\n\t\t\t))`,
			},
		])
	})

	it('marks no prop local for a name that the prop binds itself, or a property name', () => {
		const source = [
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Own">`,
			`\t\t\t{items.map((item) => (`,
			`\t\t\t\t<Select key={item.id} onChange={(item) => pick(item)} format={(v) => v.item} />`,
			`\t\t\t))}`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		expect(extract(source)?.sites[0]?.elements).toEqual([
			expect.objectContaining({
				name: 'Select',
				props: { onChange: '(item) => pick(item)', format: '(v) => v.item' },
			}),
		])

		expect(extract(source)?.sites[0]?.elements[0]?.local).toBeUndefined()
	})
})

describe('extractSourceFacts maps', () => {
	const site = (jsx: string[]) =>
		extract(
			[
				`export function Demo() {`,
				`\treturn (`,
				`\t\t<Example title="Map">`,
				...jsx.map((line) => `\t\t\t${line}`),
				`\t\t</Example>`,
				`\t)`,
				`}`,
			].join('\n'),
		)?.sites[0]?.elements

	it('records the map on each element that its callback returns, through a condition', () => {
		const elements = site([
			`{pages.map((p) => (p === 0 ? <Gap key="gap" /> : <Page key={p} onClick={() => go(p)} />))}`,
		])

		const map = `pages.map((p) => (p === 0 ? <Gap key="gap" /> : <Page key={p} onClick={() => go(p)} />))`

		expect(elements?.map((element) => [element.name, element.map])).toEqual([
			['Gap', map],
			['Page', map],
		])
	})

	it('records no map on an element inside the returned one', () => {
		const elements = site([`{rows.map((row) => (<Row key={row}><Cell value={row} /></Row>))}`])

		expect(elements?.find((element) => element.name === 'Cell')?.map).toBeUndefined()
	})

	it('marks an inner map over the item of an outer map as local', () => {
		const elements = site([
			`{columns.map((column) => (`,
			`\t<Column key={column.id} title={column.title}>`,
			`\t\t{column.items.map((item) => <Card key={item} value={item} />)}`,
			`\t</Column>`,
			`))}`,
		])

		const column = elements?.find((element) => element.name === 'Column')

		const card = elements?.find((element) => element.name === 'Card')

		expect(column?.mapLocal).toBeUndefined()

		expect(card?.map).toBe('column.items.map((item) => <Card key={item} value={item} />)')

		expect(card?.mapLocal).toBe(true)
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

	it('ships the names that each source uses, among those that the file binds', () => {
		const source = [
			`import { useState } from 'react'`,
			`import { Star } from 'lucide-react'`,
			``,
			`const trim = (raw: string) => raw.trim()`,
			``,
			`export function Demo() {`,
			`\tconst [value, setValue] = useState('')`,
			``,
			`\treturn (`,
			`\t\t<Example title="Controlled">`,
			`\t\t\t<Input value={value} onValueChange={(next) => setValue(String(trim(next)))} icon={<Star />} />`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		// A parameter (`next`) and a global (`String`) are no names of the file.
		expect(facts?.uses).toEqual({
			value: ['value'],
			'(next) => setValue(String(trim(next)))': ['setValue', 'trim'],
			'<Star />': ['Star'],
		})

		const usesOf = (name: string) =>
			facts?.declarations.find(({ names }) => names.includes(name))?.uses

		// A property name (`raw.trim`) is no use of the declaration `trim`.
		expect(usesOf('trim')).toEqual([])

		expect(usesOf('value')).toEqual(['useState'])
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

	it('pulls no declaration that only a string or a comment in a pulled one names', () => {
		const source = [
			`const units = 4`,
			``,
			`// Sums units.`,
			`const total = sum('units')`,
			``,
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Words">`,
			`\t\t\t<Stat value={total} />`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const codes = extract(source)?.declarations.map((decl) => decl.code) ?? []

		expect(codes).toEqual([`const total = sum('units')`])
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

	// A pulled declaration that names a helper would otherwise name a component
	// that the block never declares.
	it('binds a module-scope JSX helper component that a prop names', () => {
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

		const bound = facts?.sites[0]?.bindings.Card

		expect(facts?.declarations[bound ?? -1]?.code).toBe('const Card = () => <div>card</div>')
	})

	it('keeps the demo page itself out of the declaration table', () => {
		const source = [
			`const label = 'Demo'`,
			``,
			`export default function Page() {`,
			`\treturn <Slot />`,
			`}`,
			``,
			`export function Demo() {`,
			`\treturn (`,
			`\t\t<Example title="Page">`,
			`\t\t\t<Slot render={Demo} fallback={Page} title={label} />`,
			`\t\t</Example>`,
			`\t)`,
			`}`,
		].join('\n')

		const facts = extract(source)

		expect(facts?.sites[0]?.bindings.Demo).toBeUndefined()

		expect(facts?.sites[0]?.bindings.Page).toBeUndefined()

		expect(facts?.declarations.map((decl) => decl.code)).toEqual([`const label = 'Demo'`])
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

	it('skips docs-internal and aliased specifiers', () => {
		const imports = extract(source)?.imports ?? {}

		expect(imports.Example).toBeUndefined()

		expect(imports.Masked).toBeUndefined()
	})

	it('marks a type-only specifier, inline or on an `import type` line', () => {
		const file = parseSource(
			OPTIONS.filePath,
			[
				`import { Star, type LucideIcon } from 'lucide-react'`,
				`import type { PasswordRule } from '../../../components/password-strength'`,
			].join('\n'),
		)

		const imports = importFacts(file, OPTIONS)

		expect(imports.Star).toEqual({ module: 'lucide-react', external: true })

		expect(imports.LucideIcon).toEqual({ module: 'lucide-react', external: true, type: true })

		expect(imports.PasswordRule).toEqual({ module: 'password-strength', type: true })
	})

	it('marks a default binding, beside the named ones, and skips a namespace import', () => {
		const file = parseSource(
			OPTIONS.filePath,
			[
				`import countiesUrl from 'us-atlas/counties-10m.json?url'`,
				`import React, { useState } from 'react'`,
				`import * as Icons from 'lucide-react'`,
			].join('\n'),
		)

		const imports = importFacts(file, OPTIONS)

		expect(imports.countiesUrl).toEqual({
			module: 'us-atlas/counties-10m.json?url',
			external: true,
			default: true,
		})

		expect(imports.React).toEqual({ module: 'react', external: true, default: true })

		expect(imports.useState).toEqual({ module: 'react', external: true })

		expect(imports.Icons).toBeUndefined()
	})

	it('maps the exported core, hooks, and primitive entry points, and no path below them', () => {
		const file = parseSource(
			OPTIONS.filePath,
			[
				`import { cn } from '../../../core'`,
				`import type { Color } from '../../../core/recipe'`,
				`import { useIsTruncated } from '../../../hooks'`,
				`import { VirtualOptions } from '../../../primitives/virtual-options'`,
			].join('\n'),
		)

		const imports = importFacts(file, OPTIONS)

		expect(imports.cn).toEqual({ module: 'core' })

		expect(imports.Color).toBeUndefined()

		expect(imports.useIsTruncated).toEqual({ module: 'hooks' })

		expect(imports.VirtualOptions).toEqual({ module: 'primitives/virtual-options' })
	})

	// The real map demo, because the test for a data module reads the disk.
	it('keeps the authored specifier of a data module beside the demo', () => {
		const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

		const filePath = resolve(srcDir, 'docs/demos/modules/map/index.tsx')

		const file = parseSource(
			filePath,
			[
				`import { timezones, type StateZone } from './data'`,
				`import { Registry } from './registry'`,
				`import { Missing } from './missing'`,
				`import { Nested } from './nested/data'`,
			].join('\n'),
		)

		const imports = importFacts(file, { filePath, srcDir })

		expect(imports.timezones).toEqual({ module: './data', external: true })

		expect(imports.StateZone).toEqual({ module: './data', external: true, type: true })

		expect(imports.Registry).toBeUndefined()

		expect(imports.Missing).toBeUndefined()

		expect(imports.Nested).toBeUndefined()
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
