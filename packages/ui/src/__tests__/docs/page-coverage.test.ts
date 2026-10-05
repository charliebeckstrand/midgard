// @vitest-environment node
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// This file lives at packages/ui/src/__tests__/docs/; climb to src/.
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const PAGES = join(SRC, 'docs', 'pages')

function directoryNames(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
}

/**
 * Guards the coverage of the docs. A unit in `src/<section>/<name>/` has a
 * page at `src/docs/pages/<section>/<name>/index.tsx`. The docs app finds its
 * pages by glob (`findPages`), so a unit with no page is not in the docs, and
 * no other check tells you.
 */
describe('page coverage', () => {
	it.each(['components', 'structure'])('every %s directory has a page', (section) => {
		const units = directoryNames(join(SRC, section))

		expect(units.length, `no directories found under src/${section}`).toBeGreaterThan(0)

		const missing = units.filter((name) => !existsSync(join(PAGES, section, name, 'index.tsx')))

		expect(missing, `units with no page (add one under src/docs/pages/${section}/)`).toEqual([])
	})
})
