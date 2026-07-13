import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRecipeDefaults } from '../recipe-defaults'

const KATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'kata-pkg')

describe('readRecipeDefaults', () => {
	it('reads a defineRecipe `defaults` literal as source text, kebab-naming the file', () => {
		// fixtures/kata-pkg/src/recipes/kata/chip.ts: defineRecipe({ defaults: {…} }).
		expect(readRecipeDefaults(KATA_DIR, 'Chip')).toEqual({
			variant: "'solid'",
			color: "'zinc'",
			size: "'md'",
		})
	})

	it('degrades to an empty record when the kata file is missing', () => {
		expect(readRecipeDefaults(KATA_DIR, 'Nonexistent')).toEqual({})
	})
})
