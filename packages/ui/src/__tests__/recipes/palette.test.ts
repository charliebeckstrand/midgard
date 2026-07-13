import { describe, expect, it } from 'vitest'
import { definePalette, defineRecipe } from '../../core/recipe'
import { k as badge } from '../../recipes/kata/badge'

describe('palette', () => {
	it('exposes the matrix unchanged on the returned config', () => {
		const matrix = {
			solid: { neutral: ['z-solid'], danger: ['r-solid'], warning: [], success: [], primary: [] },
		}

		const config = definePalette(matrix)

		expect(config.matrix).toBe(matrix)
	})

	it('merges overlays left-to-right so a later overlay wins on key collision', () => {
		// Later `Object.assign` passes overwrite earlier values on the same key.
		const config = definePalette(
			{ solid: { neutral: [], danger: [], warning: [], success: [], primary: [] } },
			{ inherit: 'first-inherit', mute: 'first-mute' },
			{ inherit: 'second-inherit', mute: 'second-mute' },
		)

		expect(config.overlays).toEqual({ inherit: 'second-inherit', mute: 'second-mute' })
	})

	it('scaffolds compound rules for every (variant × palette colour)', () => {
		const recipe = defineRecipe({
			palette: definePalette({
				solid: { neutral: ['z-solid'], danger: ['r-solid'], warning: [], success: [], primary: [] },
			}),
			defaults: { variant: 'solid' },
		})

		expect(recipe({ color: 'neutral' })).toContain('z-solid')

		expect(recipe({ color: 'danger' })).toContain('r-solid')
	})

	it('merges per-colour entries when the matrix value is an array of records', () => {
		// Array of records (e.g. `bg`, `text`, `hover` slots) are concatenated per colour.
		const recipe = defineRecipe({
			palette: definePalette({
				solid: [
					{ neutral: ['z-bg'], danger: [], warning: [], success: [], primary: [] },
					{ neutral: ['z-text'], danger: [], warning: [], success: [], primary: [] },
				],
			}),
			defaults: { variant: 'solid', color: 'neutral' },
		})

		const out = recipe()

		expect(out).toContain('z-bg')

		expect(out).toContain('z-text')
	})

	it('unions matrix variants into the explicit `variant:` axis', () => {
		// The engine adds palette-only variants to the `variant:` axis; compound rules fire.
		const recipe = defineRecipe({
			variant: { outline: 'has-ring' },
			palette: definePalette({
				solid: { neutral: ['solid-neutral'], danger: [], warning: [], success: [], primary: [] },
			}),
			defaults: { color: 'neutral' },
		})

		expect(recipe({ variant: 'solid' })).toContain('solid-neutral')

		expect(recipe({ variant: 'outline' })).toContain('has-ring')
	})

	it('derives the colour axis from the matrix keys, scaffolding extended colours', () => {
		// A wide-keyed matrix (the `iro.spectrum` shape) expands the `color` axis
		// to the extended set; the engine reads keys, not a fixed list.
		const recipe = defineRecipe({
			palette: definePalette({
				solid: {
					neutral: ['z'],
					danger: ['r'],
					warning: ['a'],
					success: ['g'],
					primary: ['b'],
					rose: ['solid-rose'],
					violet: ['solid-violet'],
					sky: ['solid-sky'],
				},
			}),
			defaults: { variant: 'solid' },
		})

		expect(recipe({ color: 'rose' })).toContain('solid-rose')

		expect(recipe({ color: 'violet' })).toContain('solid-violet')

		// Standard colours stay intact alongside the extended ones.
		expect(recipe({ color: 'primary' })).toContain('b')
	})

	it('Badge opts into the wide palette: extended colours resolve to their classes', () => {
		expect(badge({ variant: 'solid', color: 'rose' })).toContain('bg-rose-600')

		expect(badge({ variant: 'soft', color: 'violet' })).toContain('bg-violet-500/15')

		// The standard palette is unaffected by the opt-in.
		expect(badge({ variant: 'solid', color: 'neutral' })).toContain('bg-neutral-600')
	})
})
