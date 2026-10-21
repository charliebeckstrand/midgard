// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { definePalette, defineRecipe } from '../../core/recipe'
import { k as badge } from '../../recipes/kata/badge'

describe('palette', () => {
	it('joins the cells of each matrix in order', () => {
		const config = definePalette(
			{ solid: { zinc: 'z-rest', red: 'r-rest' } },
			{ solid: { zinc: 'z-hover', red: 'r-hover' } },
			{ solid: { inherit: 'i' } },
		)

		expect(config.matrix).toEqual({
			solid: { zinc: ['z-rest', 'z-hover'], red: ['r-rest', 'r-hover'], inherit: ['i'] },
		})
	})

	it('unions the colors of each matrix into the color axis', () => {
		const recipe = defineRecipe({
			palette: definePalette(
				{ solid: { zinc: 'z-rest' } },
				{ solid: { zinc: 'z-hover' } },
				{ solid: { inherit: 'i' } },
			),
			defaults: { variant: 'solid' },
		})

		expect(recipe({ color: 'zinc' })).toBe('z-rest z-hover')

		expect(recipe({ color: 'inherit' })).toBe('i')
	})

	it('scaffolds compound rules for every (variant × palette color)', () => {
		const recipe = defineRecipe({
			palette: definePalette({
				solid: { zinc: 'z-solid', red: 'r-solid', amber: '', green: '', blue: '' },
			}),
			defaults: { variant: 'solid' },
		})

		expect(recipe({ color: 'zinc' })).toContain('z-solid')

		expect(recipe({ color: 'red' })).toContain('r-solid')
	})

	it('unions matrix variants into the explicit `variant:` axis', () => {
		// The engine adds palette-only variants to the `variant:` axis; compound rules fire.
		const recipe = defineRecipe({
			variant: { outline: 'has-ring' },
			palette: definePalette({
				solid: { zinc: 'solid-zinc', red: '', amber: '', green: '', blue: '' },
			}),
			defaults: { color: 'zinc' },
		})

		expect(recipe({ variant: 'solid' })).toContain('solid-zinc')

		expect(recipe({ variant: 'outline' })).toContain('has-ring')
	})

	it('derives the color axis from the matrix keys, scaffolding extended colors', () => {
		// A matrix keyed by the extended colors too expands the `color` axis to
		// them; the engine reads keys, not a fixed list.
		const recipe = defineRecipe({
			palette: definePalette({
				solid: {
					zinc: 'z',
					red: 'r',
					amber: 'a',
					green: 'g',
					blue: 'b',
					rose: 'solid-rose',
					violet: 'solid-violet',
					sky: 'solid-sky',
				},
			}),
			defaults: { variant: 'solid' },
		})

		expect(recipe({ color: 'rose' })).toContain('solid-rose')

		expect(recipe({ color: 'violet' })).toContain('solid-violet')

		// Standard colors stay intact alongside the extended ones.
		expect(recipe({ color: 'blue' })).toContain('b')
	})

	it('Badge writes the extended colors: they resolve to their classes', () => {
		expect(badge({ variant: 'solid', color: 'rose' })).toContain('bg-rose-600')

		expect(badge({ variant: 'soft', color: 'violet' })).toContain('bg-violet-500/15')

		// The standard colors resolve beside them.
		expect(badge({ variant: 'solid', color: 'zinc' })).toContain('bg-zinc-600')
	})
})
