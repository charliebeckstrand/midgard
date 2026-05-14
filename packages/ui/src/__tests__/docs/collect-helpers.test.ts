import { describe, expect, it } from 'vitest'
import { collectHelpers } from '../../docs/plugins/derive-code/collect-helpers'

describe('collectHelpers preamble inclusion', () => {
	it('prepends type aliases referenced by name', () => {
		const source = [
			`type BasicFilters = {`,
			`\tsearch: string | undefined`,
			`}`,
			``,
			`function BasicExample() {`,
			`\tconst [filters, setFilters] = useState<BasicFilters>({ search: undefined })`,
			`\treturn <Filters value={filters} onValueChange={setFilters} />`,
			`}`,
		].join('\n')

		const [helper] = collectHelpers(source)

		expect(helper?.name).toBe('BasicExample')
		expect(helper?.code.startsWith('type BasicFilters = {')).toBe(true)
		expect(helper?.code).toContain('function BasicExample()')
		expect(helper?.code.indexOf('type BasicFilters')).toBeLessThan(
			helper?.code.indexOf('function BasicExample()') ?? -1,
		)
	})

	it('prepends interfaces referenced by name', () => {
		const source = [
			`interface Item {`,
			`\tid: string`,
			`}`,
			``,
			`function ItemList() {`,
			`\tconst items: Item[] = []`,
			`\treturn <ul>{items.map(() => null)}</ul>`,
			`}`,
		].join('\n')

		const [helper] = collectHelpers(source)

		expect(helper?.code.startsWith('interface Item {')).toBe(true)
	})

	it('prepends plain const declarations referenced by name', () => {
		const source = [
			`const STATUSES = ['active', 'inactive']`,
			``,
			`function StatusExample() {`,
			`\treturn <Select options={STATUSES} />`,
			`}`,
		].join('\n')

		const [helper] = collectHelpers(source)

		expect(helper?.code.startsWith(`const STATUSES = ['active', 'inactive']`)).toBe(true)
	})

	it('only prepends preambles each helper actually references', () => {
		const source = [
			`type BasicFilters = { search: string | undefined }`,
			`type DateFilters = { dateRange: [Date, Date] | undefined }`,
			``,
			`function BasicExample() {`,
			`\tconst [filters] = useState<BasicFilters>({ search: undefined })`,
			`\treturn <Filters value={filters} />`,
			`}`,
			``,
			`function DateExample() {`,
			`\tconst [filters] = useState<DateFilters>({ dateRange: undefined })`,
			`\treturn <Filters value={filters} />`,
			`}`,
		].join('\n')

		const helpers = collectHelpers(source)

		const basic = helpers.find((h) => h.name === 'BasicExample')
		const date = helpers.find((h) => h.name === 'DateExample')

		expect(basic?.code).toContain('type BasicFilters')
		expect(basic?.code).not.toContain('type DateFilters')

		expect(date?.code).toContain('type DateFilters')
		expect(date?.code).not.toContain('type BasicFilters')
	})

	it('emits preambles in source order when a helper references several', () => {
		const source = [
			`type A = { a: string }`,
			`type B = { b: string }`,
			``,
			`function Combo() {`,
			`\tconst x: A & B = { a: '', b: '' }`,
			`\treturn <div>{x.a}</div>`,
			`}`,
		].join('\n')

		const [helper] = collectHelpers(source)

		const aIndex = helper?.code.indexOf('type A') ?? -1
		const bIndex = helper?.code.indexOf('type B') ?? -1

		expect(aIndex).toBeGreaterThanOrEqual(0)
		expect(bIndex).toBeGreaterThan(aIndex)
	})

	it('does not pull sibling JSX-returning helpers in as preamble', () => {
		const source = [
			`function FilterOutput() {`,
			`\treturn <div>output</div>`,
			`}`,
			``,
			`function BasicExample() {`,
			`\treturn <Filters suffix={<FilterOutput />} />`,
			`}`,
		].join('\n')

		const helpers = collectHelpers(source)

		const basic = helpers.find((h) => h.name === 'BasicExample')

		expect(basic?.code.startsWith('function BasicExample')).toBe(true)
		expect(basic?.code).not.toContain('function FilterOutput')
	})

	it('leaves helpers untouched when no preamble is referenced', () => {
		const source = [
			`type Unused = { x: string }`,
			``,
			`function Plain() {`,
			`\treturn <div />`,
			`}`,
		].join('\n')

		const [helper] = collectHelpers(source)

		expect(helper?.code.startsWith('function Plain')).toBe(true)
		expect(helper?.code).not.toContain('type Unused')
	})
})
