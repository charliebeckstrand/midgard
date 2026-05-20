import { describe, expect, it } from 'vitest'
import { defineRecipe, palette } from '../../recipes'
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
		// Components destructure props they don't pass — leaving them `undefined`.
		// Spreading `{ variant: undefined }` onto defaults would clobber the
		// default; this guards against that regression.
		const recipe = defineRecipe({
			variant: { solid: 'solid-base' },
			defaults: { variant: 'solid' },
		})

		expect(recipe({ variant: undefined })).toContain('solid-base')
	})

	it('keeps the default colour active when only variant is overridden', () => {
		// Reproduces the button-docs regression: iterating variants without
		// passing color must still match the (variant × default-color) compound.
		const classes = button({ variant: 'soft' })

		// The (soft × zinc) compound from button.ts emits bg-zinc-600/15.
		expect(classes).toContain('bg-zinc-600/15')
	})

	it('palette overlay applies when caller picks the trailing colour', () => {
		const recipe = defineRecipe({
			palette: palette(
				{ solid: { zinc: ['solid-zinc'], red: ['solid-red'], amber: [], green: [], blue: [] } },
				{ inherit: 'solid-inherit' },
			),
			defaults: { variant: 'solid', color: 'zinc' },
		})

		expect(recipe({ color: 'inherit' })).toContain('solid-inherit')
	})
})
