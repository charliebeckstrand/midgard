// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { collectHelpers } from '../../plugins/collect-helpers'

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

	// The walker shows a snippet in place of the tree it renders, so a helper that
	// another helper renders rides along. Without it, the snippet names a
	// component it never defines.
	it('pulls in a sibling helper that the snippet renders', () => {
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

		expect(basic?.code.startsWith('function FilterOutput')).toBe(true)

		expect(basic?.code).toContain('function BasicExample')
	})

	it('follows a dependency of a dependency', () => {
		const source = [
			`type Person = { name: string }`,
			``,
			`const people: Person[] = [{ name: 'Ada' }]`,
			``,
			`function labels() {`,
			`\treturn people.map((person) => person.name)`,
			`}`,
			``,
			`function List() {`,
			`\treturn <ul>{labels().map((label) => <li key={label}>{label}</li>)}</ul>`,
			`}`,
		].join('\n')

		const [helper] = collectHelpers(source)

		expect(helper?.code.startsWith('type Person')).toBe(true)

		expect(helper?.code).toContain('const people')

		expect(helper?.code).toContain('function labels')
	})

	it('carries the entries of the import table that its snippet uses', () => {
		const source = [
			`function Rules() {`,
			`\treturn <PasswordStrength rules={defaultPasswordRules} />`,
			`}`,
		].join('\n')

		const [helper] = collectHelpers(source, undefined, {
			defaultPasswordRules: { module: 'password-strength' },
			Unused: { module: 'button' },
		})

		expect(helper?.imports).toEqual({ defaultPasswordRules: { module: 'password-strength' } })
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

// A helper the JSX test misses carries no `__code`, so its `<Example>` renders
// no code block at all. See `rendersJsx` for the scan these cases retired.
describe('collectHelpers JSX detection', () => {
	it('collects a helper whose return is a conditional', () => {
		const source = [
			`function DestructiveExample() {`,
			`\tconst [deleted, setDeleted] = useState(false)`,
			`\treturn deleted ? <Text>Deleted</Text> : <HoldButton>Hold</HoldButton>`,
			`}`,
		].join('\n')

		expect(collectHelpers(source).map((h) => h.name)).toEqual(['DestructiveExample'])
	})

	it('collects a helper whose JSX sits behind a comment', () => {
		const source = [
			`const PinnedExample = () => (`,
			`\t// The Name column freezes to the left.`,
			`\t<Grid columns={columns} />`,
			`)`,
		].join('\n')

		expect(collectHelpers(source).map((h) => h.name)).toEqual(['PinnedExample'])
	})

	it('collects a helper returning a mapped array of elements', () => {
		const source = [
			`function FilteredPeople() {`,
			`\treturn people.map((person) => <Option key={person} value={person} />)`,
			`}`,
		].join('\n')

		expect(collectHelpers(source).map((h) => h.name)).toEqual(['FilteredPeople'])
	})

	it('skips a PascalCase function that returns no JSX', () => {
		const source = [
			`function BuildColumns() {`,
			`\tconst columns = [{ id: 'name' }]`,
			`\treturn columns`,
			`}`,
		].join('\n')

		expect(collectHelpers(source)).toHaveLength(0)
	})

	// A column list holds JSX in its cells, but a list of objects renders nothing.
	it('skips a PascalCase function that returns JSX inside an object', () => {
		const source = [`function MakeColumns() {`, `\treturn [{ cell: <Badge /> }]`, `}`].join('\n')

		expect(collectHelpers(source)).toHaveLength(0)
	})

	// The same arrow, returned inline or through a name, is a factory both ways.
	it('skips a PascalCase function that returns a render function', () => {
		const source = [`function Factory() {`, `\treturn () => <Badge />`, `}`].join('\n')

		expect(collectHelpers(source)).toHaveLength(0)
	})

	// A callback's returns belong to the callback. Read as the host's, the arrow
	// below would make `Registry` a helper and attach it a `__code` nothing
	// renders.
	it('reads the returns of the function itself, not those of a nested one', () => {
		const source = [
			`function Registry() {`,
			`\tconst render = () => <Badge />`,
			`\treturn render`,
			`}`,
		].join('\n')

		expect(collectHelpers(source)).toHaveLength(0)
	})
})

describe('collectHelpers entry export', () => {
	it('skips the `Demo` page function so its source is not embedded as dead __code', () => {
		const source = [
			`function Swatch() {`,
			`\treturn <Box />`,
			`}`,
			``,
			`export function Demo() {`,
			`\treturn <Example><Swatch /></Example>`,
			`}`,
		].join('\n')

		const names = collectHelpers(source).map((h) => h.name)

		expect(names).toContain('Swatch')

		expect(names).not.toContain('Demo')
	})

	it('skips a `Demo` arrow-const entry export too', () => {
		const source = [`export const Demo = () => <Example><Box /></Example>`].join('\n')

		expect(collectHelpers(source)).toHaveLength(0)
	})
})
