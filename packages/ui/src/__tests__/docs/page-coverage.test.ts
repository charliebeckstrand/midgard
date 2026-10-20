// @vitest-environment node
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir } from '../helpers/walk-source'

const PAGES = join(srcDir, 'docs', 'pages')

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
 *
 * The layouts and the primitives have no pages yet, so this test does not ask
 * for them. The page smoke test (`docs/__tests__/page-smoke.tsx`) asks that
 * each page shows an example.
 */
describe('page coverage', () => {
	it.each(['components', 'structure', 'modules', 'providers'])(
		'every %s directory has a page',
		(section) => {
			const units = directoryNames(join(srcDir, section))

			expect(units.length, `no directories found under src/${section}`).toBeGreaterThan(0)

			const missing = units.filter((name) => !existsSync(join(PAGES, section, name, 'index.tsx')))

			expect(missing, `units with no page (add one under src/docs/pages/${section}/)`).toEqual([])
		},
	)
})
