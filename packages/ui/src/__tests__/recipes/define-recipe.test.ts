// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { defineGroup, defineKata, definePalette, defineRecipe } from '../../core/recipe'
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
		// Skipping unknown axis values (rather than throwing) is documented behavior.
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

	it('fires a compound rule keyed on a boolean axis in either condition form', () => {
		// An axis key is a string, so a rule condition takes the same `String()`
		// coercion the prop does. `interactive: true` and `interactive: 'true'`
		// name the same key; the boolean form must not become a silent no-op.
		const recipe = defineRecipe({
			variant: { solid: '', soft: '' },
			interactive: { true: '', false: '' },
			compound: [
				{ variant: 'solid', interactive: true, class: 'solid-interactive' },
				{ variant: 'soft', interactive: 'true', class: 'soft-interactive' },
			],
			defaults: { variant: 'solid', interactive: false },
		})

		expect(recipe({ interactive: true })).toContain('solid-interactive')

		expect(recipe({ variant: 'soft', interactive: true })).toContain('soft-interactive')

		// The default (`false`) pre-stringifies down the same path, so a no-props
		// call leaves the rule unfired.
		expect(recipe()).not.toContain('solid-interactive')

		expect(recipe({ variant: 'soft', interactive: false })).not.toContain('soft-interactive')

		// Normalization happens at ingestion, so `.config` introspection reads the
		// same condition the call path matches on.
		expect(recipe.config.compound[0]?.interactive).toBe('true')
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

	it('user compound rules win over palette compounds on the same (variant × color)', () => {
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

	// `define-recipe.test-d.ts` holds the type of `skeleton`.
	it('attaches `skeleton` only to a recipe whose config declares one', () => {
		const plain = defineRecipe({ base: 'block' })

		const withSkeleton = defineRecipe({ base: 'block', skeleton: { base: 'h-4' } as const })

		expect('skeleton' in plain).toBe(false)

		expect(withSkeleton.skeleton).toEqual({ base: 'h-4' })
	})

	it('rejects a prop that is not an object', () => {
		// The engine reads each axis as a key of the prop object, so `true` in
		// place of `{ interactive: true }` would give the defaults.
		const recipe = defineRecipe({
			base: 'block',
			interactive: { true: 'cursor-pointer', false: '' },
		})

		// @ts-expect-error a bare boolean is not a prop object
		expect(recipe(true)).toBe('block')

		expect(recipe({ interactive: true })).toBe('block cursor-pointer')
	})

	it('pre-merges a slot group into a group of class strings', () => {
		// A part keeps its children under its own name. Each entry merges on its
		// own, so a conflict inside an entry resolves, and the entries stay apart.
		const recipe = defineRecipe({
			slots: {
				close: { base: ['p-1', 'p-2'], line: 'h-lh' },
				title: 'font-semibold',
			},
		})

		expect(recipe.close).toEqual({ base: 'p-2', line: 'h-lh' })

		expect(recipe.title).toBe('font-semibold')
	})

	it('keeps the default color active when only variant is overridden', () => {
		// Guards the (variant × default-color) compound: omitting `color` must
		// still resolve the default.
		const classes = button({ variant: 'soft' }).base

		// The (soft × zinc) compound from button.ts emits bg-zinc-500/15.
		expect(classes).toContain('bg-zinc-500/15')
	})

	it('a synthetic color is one more key of the matrix', () => {
		const recipe = defineRecipe({
			palette: definePalette({
				solid: { zinc: 'solid-zinc', red: 'solid-red', inherit: 'solid-inherit' },
			}),
			defaults: { variant: 'solid', color: 'zinc' },
		})

		expect(recipe({ color: 'inherit' })).toContain('solid-inherit')
	})

	it('memoizes per variant combination without cross-talk', () => {
		// Repeat calls read the memo; interleaved combinations must not bleed
		// into each other's cached output.
		const recipe = defineRecipe({
			variant: { solid: 'v-solid', soft: 'v-soft' },
			size: { sm: 's-sm', lg: 's-lg' },
			defaults: { variant: 'solid', size: 'sm' },
		})

		const first = recipe({ variant: 'soft', size: 'lg' })

		expect(recipe()).toContain('v-solid')

		expect(recipe({ variant: 'soft', size: 'lg' })).toBe(first)

		expect(first).toContain('v-soft')

		expect(first).toContain('s-lg')
	})

	it('ignores props outside the declared axes when memoizing', () => {
		// A stray prop reads nothing in the pipeline, so it must neither perturb
		// the output nor fork the memo key.
		const recipe = defineRecipe({
			size: { sm: 'size-sm' },
			defaults: { size: 'sm' },
		})

		const plain = recipe({ size: 'sm' })

		expect(recipe({ size: 'sm', stray: 'x' } as { size: 'sm' })).toBe(plain)
	})

	it('rejects a slot or extra name that collides with a recipe property', () => {
		// Function built-ins (own like `name`, inherited like `call`) would be
		// shadowed or throw an opaque strict-mode TypeError on assignment; the
		// engine-attached `config` / `skeleton` would be silently clobbered.
		expect(() => defineRecipe({ slots: { name: 'x' } })).toThrow(/slot name/)

		expect(() => defineRecipe({ slots: { call: 'x' } })).toThrow(/slot name/)

		expect(() => defineRecipe({ slots: { config: 'x' } })).toThrow(/slot name/)

		expect(() => defineRecipe({ slots: { skeleton: 'x' } })).toThrow(/slot name/)

		// An extra would overwrite a slot, the skeleton, or `config` with no error.
		expect(() => defineRecipe({ slots: { title: 'x' } }, { title: {} })).toThrow(/extra name/)

		expect(() => defineRecipe({ skeleton: 'x' }, { skeleton: {} })).toThrow(/extra name/)

		// `skeleton` is reserved for the config, so an extra with that name throws
		// also when the config has no skeleton.
		expect(() => defineRecipe({}, { skeleton: {} })).toThrow(/extra name/)

		expect(() => defineRecipe({}, { config: {} })).toThrow(/extra name/)

		expect(() => defineRecipe({}, { name: 'x' })).toThrow(/extra name/)
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

	it('resolves each slot from one set of props', () => {
		expect(kata()).toEqual({ base: 'root col', list: 'list border-b', tab: 'tab' })

		expect(Object.keys(kata())).toEqual(['base', 'list', 'tab'])

		expect(kata({ orientation: 'vertical', stretch: true })).toEqual({
			base: 'root row',
			list: 'list border-s',
			tab: 'tab w-full grow',
		})
	})

	it('returns the same object for the same resolved props', () => {
		expect(kata({ orientation: 'horizontal' })).toBe(kata())
	})

	it('exposes the shared defaults and the axes of each slot', () => {
		expect(kata.config.defaults).toEqual({ orientation: 'horizontal', stretch: false })

		expect(Object.keys(kata.config.variants)).toEqual(['orientation', 'stretch'])

		expect(kata.config.variants.orientation?.vertical).toEqual({ base: 'row', list: 'border-s' })
	})

	it('rejects a child slot named base, a slot with its own defaults, and an extra that collides', () => {
		expect(() => defineKata({ slots: { base: 'a' } })).toThrow(/root slot "base"/)

		expect(() =>
			defineKata({ slots: { icon: { size: { sm: 'a' }, defaults: { size: 'sm' } } } }),
		).toThrow(/slot "icon"/)

		expect(() => defineKata({ slots: { icon: { slots: { base: 'a' } } } })).toThrow(
			/classes of slot "icon"/,
		)

		expect(() => defineKata({ slots: { 'icon.mark': 'a' } })).toThrow(/dot in its name/)

		expect(() =>
			defineKata({ slots: { icon: { slots: { mark: { defaults: { size: 'sm' } } } } } }),
		).toThrow(/slot "icon.mark"/)

		expect(() => defineKata({}, { config: {} })).toThrow(/extra name/)
	})

	it('reads a child slot written as its classes as its base', () => {
		const unit = defineKata({ base: 'root', slots: { icon: ['a', 'b'], label: 'c' } })

		expect(unit()).toEqual({ base: 'root', icon: 'a b', label: 'c' })
	})

	it('gives a unit with no root classes an empty root', () => {
		expect(defineKata({ slots: { icon: 'a' } })()).toEqual({ base: '', icon: 'a' })
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

	it('nests the output of a slot with child slots, with its own classes as base', () => {
		expect(tree()).toEqual({
			base: 'tree',
			chevron: { base: 'chevron', spacer: 'w-4', mark: 'mark off' },
			tool: { head: 'head', name: 'name text-sm' },
		})

		expect(Object.keys(tree().tool)).toEqual(['head', 'name'])

		expect(tree({ open: true }).chevron).toEqual({
			base: 'chevron rotate-90',
			spacer: 'w-4',
			mark: 'mark on',
		})
	})

	it('freezes each record, and the bare output keeps the shape', () => {
		expect(Object.isFrozen(tree().chevron)).toBe(true)

		expect(tree.bare).toEqual({
			base: '',
			chevron: { base: '', spacer: '', mark: '' },
			tool: { head: '', name: '' },
		})
	})

	it('names a slot under a slot by its path in the config', () => {
		expect(Object.keys(tree.config.slots)).toEqual([
			'base',
			'chevron',
			'chevron.spacer',
			'chevron.mark',
			'tool.head',
			'tool.name',
		])

		expect(tree.config.variants.open?.true).toEqual({ chevron: 'rotate-90', 'chevron.mark': 'on' })
	})

	it('merges a slot under a slot of a group with the same slot of the unit', () => {
		const group = defineGroup({ slots: { chevron: { slots: { spacer: 'w-4' } } } })

		const unit = defineKata({
			extends: group,
			slots: { chevron: { slots: { spacer: 'shrink-0', mark: 'mark' } } },
		})

		expect(unit().chevron).toEqual({ spacer: 'w-4 shrink-0', mark: 'mark' })
	})

	it('takes a responsive axis of a slot under a slot', () => {
		const unit = defineKata({
			slots: { row: { slots: { gap: { responsive: { gap: { sm: 'gap-1', lg: 'gap-4' } } } } } },
			defaults: { gap: 'sm' },
		})

		expect(unit({ gap: { initial: 'sm', md: 'lg' } }).row.gap).toBe('gap-1 md:gap-4')
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

	it('holds the slots, the defaults, and the extras as data', () => {
		expect(group.defaults).toEqual({ variant: 'default' })

		expect(group.extras).toEqual({ marker: 'group' })

		expect(Object.isFrozen(group)).toBe(true)
	})

	it('merges a unit over its group: group classes first, then the unit', () => {
		expect(unit()).toEqual({ base: 'frame row fill', field: 'reset', number: 'spin' })

		expect(Object.keys(unit())).toEqual(['base', 'field', 'number'])

		expect(unit({ variant: 'glass', affixed: true })).toEqual({
			base: 'frame row blur grid',
			field: 'reset',
			number: 'spin',
		})
	})

	it('merges the defaults and the extras of the group and the unit', () => {
		expect(unit.config.defaults).toEqual({ variant: 'default', affixed: false })

		expect(unit.marker).toBe('group')

		expect(unit.own).toBe('unit')
	})

	it('extends a group with a group, with the merge of a unit', () => {
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

		expect(child.defaults).toEqual({ variant: 'glass' })

		expect(child.extras).toEqual({ marker: 'child' })

		const leaf = defineKata({ extends: child })

		expect(leaf()).toEqual({ base: 'frame', field: 'reset press' })

		expect(leaf({ variant: 'default' }).base).toBe('frame fill')
	})

	it('rejects a palette in the group and in the unit', () => {
		const palette = definePalette({
			solid: { zinc: ['a'], red: [], amber: [], green: [], blue: [] },
		})

		expect(() => defineKata({ extends: defineGroup({ palette }), palette })).toThrow(
			/palette in the group and in the unit/,
		)
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

	it('takes a bare value as a plain axis', () => {
		expect(unit({ align: 'end' }).base).toBe('flex items-end')
	})

	it('prefixes the classes of each breakpoint of a map', () => {
		const slots = unit({ align: { initial: 'start', md: 'end' } })

		expect(slots.base).toBe('flex items-start md:items-end')
		expect(slots.box).toBe('p-4 md:p-2')
		expect(slots.label).toBe('truncate')
	})

	it('holds the default below the first breakpoint of a map with no initial value', () => {
		expect(unit({ align: { lg: 'end' } }).base).toBe('flex items-start lg:items-end')
		expect(unit({ align: { xl: 'end' } }).base).toBe('flex items-start xl:items-end')
	})

	it('memoizes each map by its values', () => {
		expect(unit({ align: { sm: 'end' } })).toBe(unit({ align: { sm: 'end' } }))
		expect(unit({ align: { sm: 'end' } })).not.toBe(unit({ align: { md: 'end' } }))
	})

	it('lists the responsive axes in its config', () => {
		expect(unit.config.responsive).toEqual(['align'])
	})

	it('keeps the other props plain', () => {
		const plain = defineKata({
			base: 'a',
			size: { sm: 'b', lg: 'c' },
			responsive: { align: { start: 'd' } },
		})

		expect(plain({ size: 'lg', align: 'start' }).base).toBe('a c d')
	})

	it('gives a unit the responsive axes of its group', () => {
		const group = defineGroup({ responsive: { side: { left: 'left-0', right: 'right-0' } } })

		const member = defineKata({ extends: group, base: 'fixed' })

		expect(member({ side: { initial: 'left', md: 'right' } }).base).toBe('fixed left-0 md:right-0')
		expect(member.config.responsive).toEqual(['side'])
	})

	it('throws on an axis that is responsive and plain in one slot', () => {
		expect(() =>
			defineKata({ align: { start: 'a' }, responsive: { align: { start: 'b' } } }),
		).toThrow(/declares the axis "align" twice/)
	})

	describe('compound rules that read a responsive axis', () => {
		const panel = defineKata({
			base: 'absolute',
			side: { left: 'w-full', top: 'max-h-full' },
			responsive: { layout: { flush: '', floating: '' } },
			compound: [
				{ side: 'left', layout: 'flush', class: 'left-0 rounded-none' },
				{ side: 'left', layout: 'floating', class: 'left-4 rounded-xl' },
				{ side: 'top', layout: 'flush', class: 'rounded-none' },
				{ side: 'top', layout: 'floating', class: 'rounded-xl' },
			],
			defaults: { side: 'left', layout: 'flush' },
		})

		it('applies the rule of a bare value', () => {
			expect(panel({ layout: 'floating' }).base).toBe('absolute w-full left-4 rounded-xl')
		})

		it('prefixes the rule that holds at each breakpoint of a map', () => {
			expect(panel({ layout: { initial: 'flush', md: 'floating' } }).base).toBe(
				'absolute w-full left-0 rounded-none md:left-4 md:rounded-xl',
			)
		})

		it('reads the plain axes and the defaults at each breakpoint', () => {
			expect(panel({ side: 'top', layout: { lg: 'floating' } }).base).toBe(
				'absolute max-h-full rounded-none lg:rounded-xl',
			)
		})

		it('applies a rule only at the breakpoints that name a value', () => {
			expect(panel({ layout: { initial: 'floating', sm: 'floating', xl: 'flush' } }).base).toBe(
				'absolute w-full left-4 rounded-xl sm:left-4 sm:rounded-xl xl:left-0 xl:rounded-none',
			)
		})
	})
})
