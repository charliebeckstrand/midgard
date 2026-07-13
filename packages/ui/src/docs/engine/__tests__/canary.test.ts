import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type ComponentApi, createExtractor } from '../extractor'
import { readRecipeDefaults } from '../recipe-defaults'

const UI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

// Loose assertions by design: this suite proves the extractor holds against
// the real `ui` package without pinning its evolving surface.
describe('canary: ui/button over the real ui package', () => {
	it('extracts Button and ButtonSkeleton with component fidelity', { timeout: 120_000 }, () => {
		const extractor = createExtractor({
			packageDir: UI_DIR,
			packageName: 'ui',
			extraDefaults: readRecipeDefaults,
		})

		const exports = extractor.extract(['ui/button']).modules['ui/button']?.exports ?? []

		const button = exports.find((entry) => entry.name === 'Button')

		expect(button?.kind).toBe('component')

		const buttonApi = button as ComponentApi

		expect(buttonApi.description).toBeTruthy()

		const variant = buttonApi.props.find((prop) => prop.name === 'variant')

		expect(variant?.type).toContain("'solid'")

		expect(variant?.default).toContain('solid')

		expect(buttonApi.props.some((prop) => prop.shape?.k === 'literal-union')).toBe(true)

		expect(buttonApi.passThrough?.some((entry) => entry.element === 'button')).toBe(true)

		// Part 1 proof: the `createSkeleton(…)` factory export classifies as a
		// component, its props read from the resolved call signature.
		const skeleton = exports.find((entry) => entry.name === 'ButtonSkeleton')

		expect(skeleton?.kind).toBe('component')

		expect((skeleton as ComponentApi).props.some((prop) => prop.name === 'size')).toBe(true)
	})
})
