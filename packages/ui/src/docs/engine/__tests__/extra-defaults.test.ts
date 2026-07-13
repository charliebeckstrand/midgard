import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type ComponentApi, createExtractor } from '../extractor'

const KATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'kata-pkg')

// The `extraDefaults` seam: the extractor knows nothing of recipes or kata —
// the consumer supplies extra prop defaults, folded in only where a prop has
// no destructured binding default. This fixture reader stands in for the
// design-system reader ui passes in production.
const chipDefaults: Record<string, string> = {
	variant: "'solid'",
	color: "'zinc'",
	size: "'md'",
}

describe('extraDefaults seam', () => {
	let chip: ComponentApi

	beforeAll(() => {
		const snapshot = createExtractor({
			packageDir: KATA_DIR,
			// The seam receives the raw export name; the consumer owns any casing.
			extraDefaults: (_dir, name) => (name === 'Chip' ? chipDefaults : {}),
		}).extract(['kata/chip'])

		const found = snapshot.modules['kata/chip']?.exports.find((entry) => entry.name === 'Chip')

		if (found?.kind !== 'component') throw new Error('Chip component missing')

		chip = found
	})

	it('fills a prop default from the seam when no binding default exists', () => {
		expect(chip.props.find((prop) => prop.name === 'variant')?.default).toBe("'solid'")

		expect(chip.props.find((prop) => prop.name === 'color')?.default).toBe("'zinc'")
	})

	it('prefers a destructured binding default over the seam value', () => {
		expect(chip.props.find((prop) => prop.name === 'size')?.default).toBe("'lg'")
	})

	it('does not surface the extra defaults as a component field', () => {
		expect(chip).not.toHaveProperty('variantDefaults')
	})
})
