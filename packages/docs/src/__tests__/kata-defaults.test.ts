import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type ComponentApi, createExtractor } from '../extractor'
import { readKataDefaults } from '../extractor/kata-defaults'

const KATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'kata-pkg')

describe('kata defaults', () => {
	let chip: ComponentApi

	beforeAll(() => {
		const snapshot = createExtractor({ packageDir: KATA_DIR }).extract(['kata/chip'])

		const found = snapshot.modules['kata/chip']?.exports.find((entry) => entry.name === 'Chip')

		if (found?.kind !== 'component') throw new Error('Chip component missing')

		chip = found
	})

	it('parses axis defaults from the recipe literal as source text', () => {
		expect(readKataDefaults(KATA_DIR, 'chip')).toEqual({
			variant: "'solid'",
			color: "'zinc'",
			size: "'md'",
		})
	})

	it('degrades to an empty record when the kata file is missing', () => {
		expect(readKataDefaults(KATA_DIR, 'gone')).toEqual({})
	})

	it('surfaces merged axis defaults as `variantDefaults`', () => {
		expect(chip.variantDefaults).toEqual({
			variant: "'solid'",
			color: "'zinc'",
			size: "'md'",
		})
	})

	it('fills prop defaults from kata axes when no binding default exists', () => {
		expect(chip.props.find((prop) => prop.name === 'variant')?.default).toBe("'solid'")

		expect(chip.props.find((prop) => prop.name === 'color')?.default).toBe("'zinc'")
	})

	it('prefers a destructured binding default over the kata axis', () => {
		expect(chip.props.find((prop) => prop.name === 'size')?.default).toBe("'lg'")
	})
})
