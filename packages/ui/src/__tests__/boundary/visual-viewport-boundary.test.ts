import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, stripSourceComments, walkSource } from '../helpers/walk-source'

// Visual-viewport boundary.
//
// Chrome on iOS lays the page out under its toolbars, and an iOS keyboard
// covers the bottom of the screen. A surface with `position: fixed` and
// `bottom: 0` then sits behind either. `useVisualViewport` reads the part of the
// screen that the reader sees, and a surface fixed to the viewport takes that
// frame as its box: `recipes/kata/overlay.ts` `frame` for an overlay root, and
// the same two properties for the toast stack.
//
// One rule keeps every surface on the frame: no class string fixes an element to
// the bottom of the full viewport. The rule reads each string literal for an
// unprefixed `fixed` with an unprefixed `bottom-0`, `inset-0`, or `inset-y-0`.
// A variant prefix such as `lg:` is a layout where no toolbar covers the page,
// and it is not read.

const REPO = join(srcDir, '..', '..', '..')

// Every layer that spells Tailwind classes, in the library and in the apps.
const SCAN_ROOTS = [
	srcDir,
	join(REPO, 'apps', 'admin', 'app'),
	join(REPO, 'apps', 'admin', 'src'),
	join(REPO, 'apps', 'places', 'app'),
	join(REPO, 'apps', 'places', 'src'),
].filter((root) => existsSync(root))

/**
 * The surfaces that are fixed to the full viewport for a reason, and why.
 *
 * Each entry is a path from the repository root and the class string it holds.
 */
const ALLOWED: ReadonlyMap<string, string> = new Map([
	// The hot zone that opens the floating sidebar. It shows only from `lg` up,
	// where no browser toolbar covers the page.
	['packages/ui/src/layouts/sidebar/variants.ts', 'fixed top-0 bottom-0 w-10 max-lg:hidden'],
])

/** A string literal on one line, with no interpolation. */
const LITERAL = /'([^'\n]*)'|"([^"\n]*)"|`([^`$\n]*)`/g

/** The class names of a string, without a variant prefix. */
function unprefixed(value: string): Set<string> {
	return new Set(value.split(/\s+/).filter((name) => name !== '' && !name.includes(':')))
}

/** Tells whether a class string fixes an element to the bottom of the full viewport. */
function fixesToBottom(value: string): boolean {
	const names = unprefixed(value)

	return names.has('fixed') && ['bottom-0', 'inset-0', 'inset-y-0'].some((name) => names.has(name))
}

describe('visual-viewport boundary', () => {
	it('reads a fixed surface on the bottom edge of the full viewport', () => {
		expect(fixesToBottom('fixed inset-x-0 bottom-0')).toBe(true)

		expect(fixesToBottom('fixed inset-0 z-50')).toBe(true)

		expect(fixesToBottom('lg:fixed lg:inset-0')).toBe(false)

		expect(fixesToBottom('absolute inset-0')).toBe(false)

		expect(
			fixesToBottom(
				'fixed inset-x-0 top-[var(--visual-viewport-top,0px)] h-[var(--visual-viewport-height,100%)]',
			),
		).toBe(false)
	})

	it('fixes no surface to the bottom of the full viewport', () => {
		const violations: string[] = []

		for (const root of SCAN_ROOTS) {
			walkSource(root, (path, source) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(path) || path.includes('__tests__')) return

				const rel = relative(REPO, path)

				for (const match of stripSourceComments(source).matchAll(LITERAL)) {
					const value = match[1] ?? match[2] ?? match[3] ?? ''

					if (!fixesToBottom(value) || ALLOWED.get(rel) === value) continue

					violations.push(`${rel}: '${value}'`)
				}
			})
		}

		expect(
			violations,
			`class strings that fix an element to the bottom of the full viewport (take the frame of \`useVisualViewport\`, as \`recipes/kata/overlay.ts\` \`frame\` does):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
