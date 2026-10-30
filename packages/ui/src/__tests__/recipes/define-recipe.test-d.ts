import { describe, expectTypeOf, it } from 'vitest'
import { defineGroup, defineKata, defineRecipe, type VariantProps } from '../../core/recipe'

// The type cases of `define-recipe.test.ts`. Each fixture is the same as the
// fixture of its block there.

describe('defineRecipe', () => {
	it('types `skeleton` only on a recipe whose config declares one', () => {
		// The engine attaches no `skeleton` to a recipe without one, so the type
		// must not offer `k.skeleton` there.
		const plain = defineRecipe({ base: 'block' })

		const withSkeleton = defineRecipe({ base: 'block', skeleton: { base: 'h-4' } as const })

		expectTypeOf(plain).not.toHaveProperty('skeleton')

		expectTypeOf(withSkeleton.skeleton).toEqualTypeOf<{ readonly base: 'h-4' }>()
	})

	it('types a slot group as a group of class strings', () => {
		const recipe = defineRecipe({
			slots: {
				close: { base: ['p-1', 'p-2'], line: 'h-lh' },
				title: 'font-semibold',
			},
		})

		expectTypeOf(recipe.close).toEqualTypeOf<{ readonly base: string; readonly line: string }>()

		expectTypeOf(recipe.title).toEqualTypeOf<string>()
	})
})

describe('defineKata', () => {
	const kata = defineKata({
		base: 'root',
		orientation: { horizontal: 'col', vertical: 'row' },
		slots: {
			list: { base: 'list', orientation: { horizontal: 'border-b', vertical: 'border-s' } },
			tab: {
				base: 'tab',
				stretch: { true: 'w-full', false: '' },
				compound: [{ stretch: true, orientation: 'vertical', class: 'grow' }],
			},
		},
		defaults: { orientation: 'horizontal', stretch: false },
	})

	it('types the output by the slots and merges the props of each slot', () => {
		expectTypeOf(kata()).toEqualTypeOf<{
			readonly base: string
			readonly list: string
			readonly tab: string
		}>()

		expectTypeOf<VariantProps<typeof kata>>().toEqualTypeOf<
			{ orientation?: 'horizontal' | 'vertical' } & { stretch?: boolean }
		>()
	})
})

describe('defineKata slots under a slot', () => {
	const tree = defineKata({
		base: 'tree',
		slots: {
			chevron: {
				base: 'chevron',
				open: { true: 'rotate-90', false: '' },
				slots: { spacer: 'w-4', mark: { base: 'mark', open: { true: 'on', false: 'off' } } },
			},
			tool: { slots: { head: 'head', name: { base: 'name', size: { sm: 'text-sm' } } } },
		},
		defaults: { open: false, size: 'sm' },
	})

	it('types the nested output and the props of each slot under a slot', () => {
		expectTypeOf(tree().chevron).toEqualTypeOf<
			{ readonly base: string } & {
				readonly spacer: string
				readonly mark: string
			}
		>()

		expectTypeOf(tree().tool).toEqualTypeOf<{ readonly head: string; readonly name: string }>()

		expectTypeOf<VariantProps<typeof tree>>().toHaveProperty('open')

		expectTypeOf<VariantProps<typeof tree>>().toHaveProperty('size')
	})
})

describe('defineGroup', () => {
	const group = defineGroup(
		{
			base: 'frame',
			variant: { default: 'fill', glass: '' },
			slots: {
				field: 'reset',
			},
			defaults: { variant: 'default' },
		},
		{ marker: 'group' },
	)

	const unit = defineKata(
		{
			extends: group,
			base: 'row',
			variant: { glass: 'blur' },
			affixed: { true: 'grid', false: '' },
			slots: {
				number: 'spin',
			},
			defaults: { affixed: false },
		},
		{ own: 'unit' },
	)

	it('types the props and the output from the group and the unit', () => {
		expectTypeOf(unit()).toEqualTypeOf<{
			readonly base: string
			readonly field: string
			readonly number: string
		}>()

		expectTypeOf<VariantProps<typeof unit>['variant']>().toEqualTypeOf<
			'default' | 'glass' | undefined
		>()

		expectTypeOf<VariantProps<typeof unit>['affixed']>().toEqualTypeOf<boolean | undefined>()
	})

	it('types a group that extends a group, with the merge of a unit', () => {
		const child = defineGroup(
			{
				extends: group,
				slots: {
					field: 'press',
				},
				defaults: { variant: 'glass' },
			},
			{ marker: 'child' },
		)

		const leaf = defineKata({ extends: child })

		expectTypeOf(leaf()).toEqualTypeOf<{ readonly base: string; readonly field: string }>()
	})
})

describe('defineKata responsive axes', () => {
	const unit = defineKata({
		base: 'flex',
		responsive: { align: { start: 'items-start', end: 'items-end' } },
		slots: {
			box: { base: 'p-0', responsive: { align: { start: 'p-4', end: 'p-2' } } },
			label: 'truncate',
		},
		defaults: { align: 'start' },
	})

	it('types a responsive prop as a value or a map', () => {
		expectTypeOf<VariantProps<typeof unit>['align']>().toEqualTypeOf<
			| 'start'
			| 'end'
			| Partial<Record<'initial' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', 'start' | 'end'>>
			| undefined
		>()
	})

	it('keeps the other props plain', () => {
		const plain = defineKata({
			base: 'a',
			size: { sm: 'b', lg: 'c' },
			responsive: { align: { start: 'd' } },
		})

		expectTypeOf<VariantProps<typeof plain>['size']>().toEqualTypeOf<'sm' | 'lg' | undefined>()
	})
})
