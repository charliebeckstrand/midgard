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

	it('spells each combination of a template literal, the last span fastest', () => {
		const source = [
			`type Side = 'top' | 'right'`,
			`type Align = 'start' | 'end'`,
			`type Props = { placement?: Side | \`\${Side}-\${Align}\` }`,
		].join('\n')

		expect(orderOf(source, 'placement')).toEqual([
			`'top'`,
			`'right'`,
			`'top-start'`,
			`'top-end'`,
			`'right-start'`,
			`'right-end'`,
		])
	})

	it('reads the keys of a spread, and of the type that `as` gives a value', () => {
		const source = [
			`const scale = { xs: 'a', sm: 'b' }`,
			`const steps = Object.fromEntries([]) as Record<keyof typeof scale, never[]>`,
			`function base(): Record<'solid' | 'soft', string> { return { solid: '', soft: '' } }`,
			`const axes = { width: { ...steps, fit: [] }, variant: { ...base(), plain: '' } }`,
			`type Props = { [K in keyof typeof axes]?: keyof (typeof axes)[K] }`,
		].join('\n')

		expect(orderOf(source, 'width')).toEqual([`'xs'`, `'sm'`, `'fit'`])

		expect(orderOf(source, 'variant')).toEqual([`'solid'`, `'soft'`, `'plain'`])
	})

	// React's `ElementType` spells its tags so.
	it('reads the keys of a mapped type that an index filters', () => {
		const source = [
			`interface Tags { b: 1; a: 2 }`,
			`interface Tags { c: 3 }`,
			`type Tag<T extends keyof Tags = keyof Tags> = { [K in T]: K }[T]`,
			`type Props = { as?: Tag }`,
		].join('\n')

		expect(orderOf(source, 'as')).toEqual([`'b'`, `'a'`, `'c'`])
	})

	it('returns null for a declaration that spells no order', () => {
		expect(orderOf(`type Props = { label?: string & {} }`, 'label')).toBeNull()
	})
})

// A small copy of the recipe engine. The engine's `ComputedProps` declares
// `variant` and `color` with no order of their own, so the order comes from the
// config of the recipe that the props name.
describe('sourceOrder — recipe props', () => {
	const engine = [
		`export type PaletteConfig<E extends string = never, M extends string = string, C extends string = never> = {`,
		`  matrix: Record<M, Record<C, string>>`,
		`  overlays: Record<E, string>`,
		`}`,
		`type ExplicitVariantKeys<C> = C extends { variant: infer V } ? keyof V & string : never`,
		`export type ComputedProps<C> = {`,
		`  [K in keyof C as K extends 'variant' | 'palette' ? never : K]?: keyof C[K]`,
		`} & (C extends { palette: PaletteConfig<infer E, infer M, infer Col> }`,
		`  ? { variant?: (M & string) | ExplicitVariantKeys<C>; color?: Col | (E & string) }`,
		`  : Record<never, never>)`,
		`export type VariantProps<R> = R extends { config: infer C } ? ComputedProps<C> : never`,
		`export declare function definePalette<M extends string, E extends string = never, C extends string = never>(`,
		`  matrix: Record<M, Record<C, string>>,`,
		`  ...overlays: Record<E, string>[]`,
		`): PaletteConfig<E, M, C>`,
		`export declare function defineRecipe<C>(config: C): { config: C }`,
	].join('\n')

	const kata = [
		`import { definePalette, defineRecipe, type VariantProps } from './core/recipe/engine/types'`,
		`type Hue = 'zinc' | 'red' | 'amber'`,
		`declare const tint: Record<Hue, string>`,
		`const k = defineRecipe({`,
		`  variant: { solid: '', soft: '', bare: '' },`,
		`  palette: definePalette({ soft: tint, solid: tint }, { inherit: '' }),`,
		`})`,
		`type Props = VariantProps<typeof k> & { size?: 'sm' }`,
	].join('\n')

	const recipeOrderOf = (name: string) => {
		const { checker, sourceFiles } = createInMemoryProgram({
			'core/recipe/engine/types.ts': engine,
			'index.ts': kata,
		})

		const props = sourceFiles['index.ts']?.statements
			.filter(ts.isTypeAliasDeclaration)
			.find((alias) => alias.name.text === 'Props')

		if (!props) throw new Error('no `type Props`')

		const symbol = checker.getPropertyOfType(checker.getTypeAtLocation(props), name)

		return sourceOrder(symbol?.declarations?.[0], checker, props.type)
	}

	it('orders `variant` by the palette matrix, then by the `variant` axis', () => {
		expect(recipeOrderOf('variant')).toEqual([`'soft'`, `'solid'`, `'bare'`])
	})

	it('orders `color` by the alias of the palette colors, then by the overlays', () => {
		expect(recipeOrderOf('color')).toEqual([`'zinc'`, `'red'`, `'amber'`, `'inherit'`])
	})
})

describe('orderMembers', () => {
	const source = [
		`type Early = 'start' | 'center'`,
		`type Align = 'end' | 'start' | 'center'`,
		`type Props = { align?: Align }`,
	].join('\n')

	it('prints a union in its source order where the checker order differs', () => {
		const { checker, declaration, type, location } = propOf(source, 'align', ['Early'])

		// The checker met `start` and `center` first, so its order puts `end` last.
		const members = type.isUnion() ? type.types.filter((member) => member.isLiteral()) : []

		expect(members.map((member) => checker.typeToString(member))).toEqual([
			`"start"`,
			`"center"`,
			`"end"`,
		])

		expect(formatPropType(type, checker, location, sourceOrder(declaration, checker))).toBe(
			`'end' | 'start' | 'center'`,
		)
	})

	it('keeps the checker order when the source order leaves out a literal member', () => {
		const { type } = propOf(source, 'align', ['Early'])

		const members = type.isUnion() ? type.types : []

		expect(orderMembers(members, [`'center'`, `'start'`])).toBe(members)
	})

	it('prints a union of density steps from `xs` to `xl`, whatever the source order', () => {
		const steps = [
			`type Early = 'sm' | 'md'`,
			`type Step = 'sm' | 'md' | 'lg' | 'xs'`,
			`type Props = { size?: Step }`,
		].join('\n')

		const { checker, declaration, type, location } = propOf(steps, 'size', ['Early'])

		expect(formatPropType(type, checker, location, sourceOrder(declaration, checker))).toBe(
			`'xs' | 'sm' | 'md' | 'lg'`,
		)

		expect(formatPropType(type, checker, location, null)).toBe(`'xs' | 'sm' | 'md' | 'lg'`)
	})
})
