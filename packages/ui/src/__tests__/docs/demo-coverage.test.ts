import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// This file lives at packages/ui/src/__tests__/docs/; climb to src/.
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const COMPONENTS = join(SRC, 'components')

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
 * Demo file basenames (sans `.tsx`). A component demo is `demos/<name>.tsx`; a
 * few provider-like components (e.g. `headless`, `toast`) are namespaced under
 * `demos/providers/<name>.tsx`, so both directories count toward coverage.
 */
function demoBasenames(): Set<string> {
	const names = new Set<string>()

	for (const dir of [DEMOS, join(DEMOS, 'providers')]) {
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

		const demos = demoBasenames()

		const missing = components.filter((name) => !demos.has(name) && !ALLOW_NO_DEMO.has(name))

		expect(
			missing,
			'components without a demo (add one under src/docs/demos/, or allowlist)',
		).toEqual([])
	})
})
