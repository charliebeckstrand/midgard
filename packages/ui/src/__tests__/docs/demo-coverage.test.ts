// @vitest-environment node
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// This file lives at packages/ui/src/__tests__/docs/; climb to src/.
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const COMPONENTS = join(SRC, 'components')

const STRUCTURE = join(SRC, 'structure')

const DEMOS = join(SRC, 'docs', 'demos')

// Components intentionally shipped without a dedicated demo. Keep this empty;
// add an entry with a reason only when a component is deliberately undemoed.
const ALLOW_NO_DEMO = new Set<string>([])

function directoryNames(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
}

/**
 * Demo file basenames (sans `.tsx`). A component demo is
 * `demos/components/<name>.tsx`; a few provider-like components (e.g.
 * `headless`, `toast`) are namespaced under `demos/providers/<name>.tsx`, so
 * both directories count toward coverage. A structure demo is
 * `demos/structure/<name>.tsx`.
 */
function demoBasenames(dirs: readonly string[]): Set<string> {
	const names = new Set<string>()

	for (const dir of dirs.map((name) => join(DEMOS, name))) {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isFile() && entry.name.endsWith('.tsx')) names.add(entry.name.replace(/\.tsx$/, ''))
		}
	}

	return names
}

/**
 * Guards demo coverage: a component added under `src/components/` without a
 * docs demo fails here rather than silently missing from the docs site. The
 * docs app discovers demos by glob, so an undemoed component is invisible with
 * no other signal.
 */
describe('demo coverage', () => {
	it('every component directory has a demo', () => {
		const components = directoryNames(COMPONENTS)

		expect(components.length, 'no component directories found').toBeGreaterThan(0)

		const demos = demoBasenames(['components', 'providers'])

		const missing = components.filter((name) => !demos.has(name) && !ALLOW_NO_DEMO.has(name))

		expect(
			missing,
			'components without a demo (add one under src/docs/demos/components/, or allowlist)',
		).toEqual([])
	})

	it('every structure directory has a demo', () => {
		const structure = directoryNames(STRUCTURE)

		expect(structure.length, 'no structure directories found').toBeGreaterThan(0)

		const demos = demoBasenames(['structure'])

		const missing = structure.filter((name) => !demos.has(name))

		expect(
			missing,
			'structure units without a demo (add one under src/docs/demos/structure/)',
		).toEqual([])
	})
})
