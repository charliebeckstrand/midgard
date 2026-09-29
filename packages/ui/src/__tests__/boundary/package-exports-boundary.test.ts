import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir } from '../helpers/walk-source'

// A module and a structure unit each have a bare `ui/<name>` path beside the
// nested one. Next.js resolves only the first target of an `exports` fallback
// array, so the `./*` key has one target, the components. Each bare module and
// structure path is therefore an exact key. This test holds the keys to the
// directories, so a new unit cannot ship with a nested path only.

type Target = { types: string; default: string }

const pkg = JSON.parse(readFileSync(join(srcDir, '..', 'package.json'), 'utf8')) as {
	exports: Record<string, Target | Target[] | string>
}

/** The directories of a layer that hold a barrel. */
function units(layer: string): string[] {
	return readdirSync(join(srcDir, layer), { withFileTypes: true })
		.filter(
			(entry) => entry.isDirectory() && existsSync(join(srcDir, layer, entry.name, 'index.ts')),
		)
		.map((entry) => entry.name)
		.sort()
}

describe('package exports', () => {
	it('gives the ./* fallback one target, because Next.js resolves only the first', () => {
		expect(Array.isArray(pkg.exports['./*'])).toBe(false)
	})

	it.each(['modules', 'structure'])('gives each %s unit an exact bare key', (layer) => {
		const expected = units(layer).map((name) => {
			const barrel = `./src/${layer}/${name}/index.ts`

			return [`./${name}`, { types: barrel, default: barrel }]
		})

		const actual = units(layer).map((name) => [`./${name}`, pkg.exports[`./${name}`]])

		expect(actual).toEqual(expected)
	})

	it('lets no bare module or structure key shadow a component', () => {
		const components = new Set(units('components'))

		const shadowed = [...units('modules'), ...units('structure')].filter((name) =>
			components.has(name),
		)

		expect(shadowed).toEqual([])
	})
})
