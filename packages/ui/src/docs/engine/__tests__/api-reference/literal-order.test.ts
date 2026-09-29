// @vitest-environment node
import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { formatPropType } from '../../api-reference/engine/format-type'
import { orderMembers, sourceOrder } from '../../api-reference/engine/literal-order'
import { createInMemoryProgram } from './helpers'

/**
 * The program of `source`, and the declaration and the type of the property
 * `name` of the type `Props`. `warm` names types that the checker meets first,
 * so their literals get the lower type ids. `files` adds modules that
 * `source` can import.
 */
function propOf(
	source: string,
	name: string,
	warm: string[] = [],
	files: Record<string, string> = {},
) {
	const { checker, sourceFiles } = createInMemoryProgram({ ...files, 'index.ts': source })

	const sf = sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found')

	const aliases = new Map(
		sf.statements.filter(ts.isTypeAliasDeclaration).map((alias) => [alias.name.text, alias]),
	)

	for (const alias of warm) {
		const node = aliases.get(alias)

		if (node) checker.getTypeAtLocation(node)
	}

	const props = aliases.get('Props')

	if (!props) throw new Error('no `type Props`')

	const symbol = checker.getPropertyOfType(checker.getTypeAtLocation(props), name)

	if (!symbol) throw new Error(`no prop ${name}`)

	return {
		checker,
		declaration: symbol.declarations?.[0],
		type: checker.getTypeOfSymbolAtLocation(symbol, props),
		location: props,
	}
}

const orderOf = (source: string, name: string, files: Record<string, string> = {}) => {
	const { checker, declaration } = propOf(source, name, [], files)

	return sourceOrder(declaration, checker)
}

describe('sourceOrder', () => {
	it('reads an inline union, keywords and null included', () => {
		expect(orderOf(`type Props = { level?: 3 | 1 | 2 | number | null }`, 'level')).toEqual([
			'3',
			'1',
			'2',
			'number',
			'null',
		])
	})

	it('follows an alias to the elements of `(typeof list)[number]`', () => {
		const source = [
			`const steps = ['xs', 'sm', 'md'] as const`,
			`type Step = (typeof steps)[number]`,
			`type Props = { size?: Step }`,
		].join('\n')

		expect(orderOf(source, 'size')).toEqual([`'xs'`, `'sm'`, `'md'`])
	})

	it('reads the keys of `keyof typeof` and of `keyof` an interface', () => {
		const source = [
			`const table = { solid: 1, soft: 2, outline: 3 } as const`,
			`interface Modes { plain: 1; bare: 2 }`,
			`type Props = { variant?: keyof typeof table; mode?: keyof Modes }`,
		].join('\n')

		expect(orderOf(source, 'variant')).toEqual([`'solid'`, `'soft'`, `'outline'`])

		expect(orderOf(source, 'mode')).toEqual([`'plain'`, `'bare'`])
	})

	it('keeps the order of the first argument of a filter such as `Extract`', () => {
		const source = [
			`type Step = 'xs' | 'sm' | 'md' | 'lg'`,
			`type Props = { size?: Extract<Step, 'md' | 'sm'> }`,
		].join('\n')

		expect(orderOf(source, 'size')).toEqual([`'xs'`, `'sm'`, `'md'`, `'lg'`])
	})

	// A recipe axis: a mapped type makes the prop from a property of an object
	// literal, and the value of the property names another object.
	it('reads the keys of the value of a property that a mapped type makes a prop', () => {
		const source = [
			`const panel = { xs: 'a', sm: 'b', full: 'c' }`,
			`const axes = { width: panel }`,
			`type Props = { [K in keyof typeof axes]?: keyof (typeof axes)[K] }`,
		].join('\n')

		expect(orderOf(source, 'width')).toEqual([`'xs'`, `'sm'`, `'full'`])
	})

	it('follows a shorthand property to the import that holds its value', () => {
		const source = [
			`import { panel } from './panel'`,
			`const shaku = { panel }`,
			`const axes = { width: shaku.panel }`,
			`type Props = { [K in keyof typeof axes]?: keyof (typeof axes)[K] }`,
		].join('\n')

		const files = { 'panel.ts': `export const panel = { xs: 'a', sm: 'b', full: 'c' }` }

		expect(orderOf(source, 'width', files)).toEqual([`'xs'`, `'sm'`, `'full'`])
	})

	it('follows a destructured binding to the property that it reads', () => {
		const source = [
			`const kasane = { rounded: { none: 'a', sm: 'b', full: 'c' } }`,
			`const { rounded } = kasane`,
			`const axes = { radius: rounded }`,
			`type Props = { [K in keyof typeof axes]?: keyof (typeof axes)[K] }`,
		].join('\n')

		expect(orderOf(source, 'radius')).toEqual([`'none'`, `'sm'`, `'full'`])
	})

	it('reads the property that an indexed access names', () => {
		const source = [
			`type Variants = { size?: 'xs' | 'sm' | 'md' }`,
			`type Props = { size?: Variants['size'] }`,
		].join('\n')

		expect(orderOf(source, 'size')).toEqual([`'xs'`, `'sm'`, `'md'`])
	})

	it('orders a type parameter by its constraint', () => {
		const source = [
			`type Step = 'xs' | 'sm' | 'md'`,
			`type Sized<S extends Step> = { size?: S }`,
			`type Props = Sized<'md' | 'xs'>`,
		].join('\n')

		expect(orderOf(source, 'size')).toEqual([`'xs'`, `'sm'`, `'md'`])
	})

	it('returns null for a declaration that spells no order', () => {
		expect(orderOf(`type Props = { label?: string & {} }`, 'label')).toBeNull()
	})
})

describe('orderMembers', () => {
	const source = [
		`type Early = 'sm' | 'md'`,
		`type Step = 'xs' | 'sm' | 'md'`,
		`type Props = { size?: Step }`,
	].join('\n')

	it('prints a union in its source order where the checker order differs', () => {
		const { checker, declaration, type, location } = propOf(source, 'size', ['Early'])

		// The checker met `sm` and `md` first, so its order puts `xs` last.
		const members = type.isUnion() ? type.types.filter((member) => member.isLiteral()) : []

		expect(members.map((member) => checker.typeToString(member))).toEqual([`"sm"`, `"md"`, `"xs"`])

		expect(formatPropType(type, checker, location, sourceOrder(declaration, checker))).toBe(
			`'xs' | 'sm' | 'md'`,
		)
	})

	it('keeps the checker order when the source order leaves out a literal member', () => {
		const { type } = propOf(source, 'size', ['Early'])

		const members = type.isUnion() ? type.types : []

		expect(orderMembers(members, [`'md'`, `'sm'`])).toBe(members)
	})
})
