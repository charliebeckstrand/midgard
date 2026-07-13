import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { declaredDefaults, kebabCase } from '../adapters'

const KATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'kata-pkg')

describe('declaredDefaults', () => {
	const read = declaredDefaults({ dir: 'src/recipes/kata', call: 'defineRecipe' })

	it('reads a factory-call `defaults` literal as source text, kebab-naming the file', () => {
		// fixtures/kata-pkg/src/recipes/kata/chip.ts: defineRecipe({ defaults: {…} }).
		expect(read(KATA_DIR, 'Chip')).toEqual({
			variant: "'solid'",
			color: "'zinc'",
			size: "'md'",
		})
	})

	it('degrades to an empty record when the file is missing', () => {
		expect(read(KATA_DIR, 'Nonexistent')).toEqual({})
	})

	it('honors a custom call name and property', () => {
		const none = declaredDefaults({ dir: 'src/recipes/kata', call: 'notARecipe' })

		expect(none(KATA_DIR, 'Chip')).toEqual({})
	})
})

describe('kebabCase', () => {
	it('splits camel and Pascal boundaries', () => {
		expect(kebabCase('CommandPalette')).toBe('command-palette')

		expect(kebabCase('Button')).toBe('button')
	})
})
