import { describe, expect, it } from 'vitest'
import { definePalette, defineRecipe } from '../../core/recipe'
import { k as button } from '../../recipes/kata/button'

describe('defineRecipe', () => {
	it('applies defaults when the caller omits a prop', () => {
		const recipe = defineRecipe({
			variant: { solid: 'solid-base' },
			defaults: { variant: 'solid' },
		})

		expect(recipe()).toContain('solid-base')
	})

	it('preserves defaults when the caller passes the prop as undefined', () => {
		// Guards the `{ variant: undefined }` path: spreading undefined must not
		// clobber the default.
		const recipe = defineRecipe({
			variant: { solid: 'solid-base' },
			defaults: { variant: 'solid' },
		})

		expect(recipe({ variant: undefined })).toContain('solid-base')
	})

	it('emits the base classes on every call', () => {
		const recipe = defineRecipe({
			base: 'shared-base',
			size: { sm: 'size-sm' },
		})

		expect(recipe()).toContain('shared-base')

		expect(recipe({ size: 'sm' })).toContain('shared-base')
	})

	it('resolves a variant axis to its class set when the prop is set', () => {
		const recipe = defineRecipe({
			size: { sm: 'size-sm-class', lg: 'size-lg-class' },
			defaults: { size: 'sm' },
		})

		const out = recipe({ size: 'lg' })

		expect(out).toContain('size-lg-class')

		expect(out).not.toContain('size-sm-class')
	})

	it('drops unknown axis values silently', () => {
		// Skipping unknown axis values (rather than throwing) is documented behaviour.
		const recipe = defineRecipe({
			size: { sm: 'size-sm', lg: 'size-lg' },
			defaults: { size: 'sm' },
		})

		expect(recipe({ size: 'xl' as 'sm' })).not.toMatch(/size-(sm|lg)/)
	})

	it('coerces a boolean prop value to its string axis key', () => {
		// `AxisValue` widens `'true'`/`'false'` axes to `boolean`; the engine
		// coerces via `String()` before the axis lookup.
		const recipe = defineRecipe({
			active: { true: 'is-active', false: 'is-inactive' },
			defaults: { active: false },
		})

		expect(recipe({ active: true })).toContain('is-active')

		expect(recipe({ active: false })).toContain('is-inactive')
	})

	it('fires a compound rule only when every named axis matches', () => {
		const recipe = defineRecipe({
			variant: { solid: '', soft: '' },
			tone: { warm: '', cool: '' },
			compound: [{ variant: 'solid', tone: 'warm', class: 'solid-warm' }],
		})

		expect(recipe({ variant: 'solid', tone: 'warm' })).toContain('solid-warm')

		expect(recipe({ variant: 'solid', tone: 'cool' })).not.toContain('solid-warm')

		expect(recipe({ variant: 'soft', tone: 'warm' })).not.toContain('solid-warm')
	})

	it('resolves Tailwind conflicts between base and variant classes', () => {
		// `tailwind-merge` runs over the concatenated output; the variant's `p-4`
		// wins over base `p-2`.
		const recipe = defineRecipe({
			base: 'p-2 rounded',
			size: { lg: 'p-4' },
		})

		const out = recipe({ size: 'lg' })

		expect(out).toContain('p-4')

		expect(out).toContain('rounded')

		expect(out).not.toContain('p-2')
	})

	it('user compound rules win over palette compounds on the same (variant × colour)', () => {
		// Palette compounds are pushed first, user `compound` last; `tailwind-merge`
		// resolves user rules as the winner.
		const recipe = defineRecipe({
			palette: definePalette({
				solid: { zinc: ['bg-zinc-600'], red: [], amber: [], green: [], blue: [] },
			}),
			compound: [{ variant: 'solid', color: 'zinc', class: 'bg-zinc-50' }],
			defaults: { variant: 'solid', color: 'zinc' },
		})

		const out = recipe()

		expect(out).toContain('bg-zinc-50')

		expect(out).not.toContain('bg-zinc-600')
	})

	it('pre-merges slot classes and exposes them as properties on the recipe', () => {
		// Slots are computed once at definition time, looked up by name (`recipe.title`).
		const recipe = defineRecipe({
			slots: { title: ['font-semibold', 'text-lg'], body: 'text-sm' },
		})

		expect(recipe.title).toBe('font-semibold text-lg')

		expect(recipe.body).toBe('text-sm')
	})

	it('keeps the default colour active when only variant is overridden', () => {
		// Guards the (variant × default-color) compound: omitting `color` must
		// still resolve the default.
		const classes = button({ variant: 'soft' })

		// The (soft × zinc) compound from button.ts emits bg-zinc-500/15.
		expect(classes).toContain('bg-zinc-500/15')
	})

	it('palette overlay applies when caller picks the trailing colour', () => {
		const recipe = defineRecipe({
			palette: definePalette(
				{ solid: { zinc: ['solid-zinc'], red: ['solid-red'], amber: [], green: [], blue: [] } },
				{ inherit: 'solid-inherit' },
			),
			defaults: { variant: 'solid', color: 'zinc' },
		})

		expect(recipe({ color: 'inherit' })).toContain('solid-inherit')
	})
})
