import { describe, expect, it } from 'vitest'
import { definePalette, defineRecipe } from '../../core/recipe'

describe('palette', () => {
	it('exposes the matrix unchanged on the returned config', () => {
		const matrix = {
			solid: { zinc: ['z-solid'], red: ['r-solid'], amber: [], green: [], blue: [] },
		}

		const config = definePalette(matrix)

		expect(config.matrix).toBe(matrix)
	})

	it('merges overlays left-to-right so a later overlay wins on key collision', () => {
		// Each overlay carries the full key set per the signature; later
		// `Object.assign` passes overwrite earlier values on the same key.
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
		// `iro.palette` slots are authored as separate records (`bg`, `text`,
		// `hover`); a kata that wants the bundle passes them as an array and
		// the engine concatenates per colour.
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
		// A palette-only variant doesn't need a duplicate entry under
		// `variant:` — the engine adds it so the compound rules fire.
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
})
