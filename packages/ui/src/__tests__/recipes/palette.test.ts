import { describe, expect, it } from 'vitest'
import { definePalette, defineRecipe } from '../../core/recipe'
import { k as badge } from '../../recipes/kata/badge'

describe('palette', () => {
	it('exposes the matrix unchanged on the returned config', () => {
		const matrix = {
			solid: { zinc: ['z-solid'], red: ['r-solid'], amber: [], green: [], blue: [] },
		}

		const config = definePalette(matrix)

		expect(config.matrix).toBe(matrix)
	})

	it('merges overlays left-to-right so a later overlay wins on key collision', () => {
		// Later `Object.assign` passes overwrite earlier values on the same key.
		const config = definePalette(
			{ solid: { zinc: [], red: [], amber: [], green: [], blue: [] } },
			{ inherit: 'first-inherit', mute: 'first-mute' },
			{ inherit: 'second-inherit', mute: 'second-mute' },
		)

		expect(config.overlays).toEqual({ inherit: 'second-inherit', mute: 'second-mute' })
	})

	it('scaffolds compound rules for every (variant × palette colour)', () => {
		const recipe = defineRecipe({
			palette: definePalette({
				solid: { zinc: ['z-solid'], red: ['r-solid'], amber: [], green: [], blue: [] },
			}),
			defaults: { variant: 'solid' },
		})

		expect(recipe({ color: 'zinc' })).toContain('z-solid')

		expect(recipe({ color: 'red' })).toContain('r-solid')
	})

	it('merges per-colour entries when the matrix value is an array of records', () => {
		// Array of records (e.g. `bg`, `text`, `hover` slots) are concatenated per colour.
		const recipe = defineRecipe({
			palette: definePalette({
				solid: [
					{ zinc: ['z-bg'], red: [], amber: [], green: [], blue: [] },
					{ zinc: ['z-text'], red: [], amber: [], green: [], blue: [] },
				],
			}),
			defaults: { variant: 'solid', color: 'zinc' },
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
				solid: { zinc: ['solid-zinc'], red: [], amber: [], green: [], blue: [] },
			}),
			defaults: { color: 'zinc' },
		})

		expect(recipe({ variant: 'solid' })).toContain('solid-zinc')

		expect(recipe({ variant: 'outline' })).toContain('has-ring')
	})

	it('derives the colour axis from the matrix keys, scaffolding extended colours', () => {
		// A wide-keyed matrix (the `iro.spectrum` shape) expands the `color` axis
		// to the extended set; the engine reads keys, not a fixed list.
		const recipe = defineRecipe({
			palette: definePalette({
				solid: {
					zinc: ['z'],
					red: ['r'],
					amber: ['a'],
					green: ['g'],
					blue: ['b'],
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
		expect(recipe({ color: 'blue' })).toContain('b')
	})

	it('Badge opts into the wide palette: extended colours resolve to their classes', () => {
		expect(badge({ variant: 'solid', color: 'rose' })).toContain('bg-rose-600')

		expect(badge({ variant: 'soft', color: 'violet' })).toContain('bg-violet-500/15')

		// The standard palette is unaffected by the opt-in.
		expect(badge({ variant: 'solid', color: 'zinc' })).toContain('bg-zinc-600')
	})
})
