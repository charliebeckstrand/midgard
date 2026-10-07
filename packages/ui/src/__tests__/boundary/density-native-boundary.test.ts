// @vitest-environment node
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A density-native component takes its step from the nearest density scope.
// Its kata writes each step in a stepped `density-*` utility, so the DOM selects the
// step and no JS code selects it. Two rules hold that design:
//
//   - No recipe of the component has a `size` or a `density` axis. The walk
//     below reads each recipe of each kata, so a new kata is native by default.
//   - The component reads no density context. An explicit `size` becomes a
//     scope (the `density` prop of PolymorphicStatic or Box), not a lookup. The
//     reader allowlists at the end of this file hold this rule for each file.

/** The kata modules, by the path under `src`. */
function recipeFiles(): string[] {
	return readdirSync(join(srcDir, 'recipes', 'kata'))
		.filter((file) => file.endsWith('.ts'))
		.map((file) => `recipes/kata/${file}`)
		.sort()
}

/** A recipe: a callable with the config it was defined from. */
type Recipe = { config: { variants?: Record<string, unknown> } }

function isRecipe(value: unknown): value is Recipe {
	return typeof value === 'function' && 'config' in value
}

/** The path of each recipe under `value` that has a `size` or a `density` axis. */
function steppedAxes(value: unknown, path: string, seen: Set<unknown>, found: string[]) {
	if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return

	if (seen.has(value)) return

	seen.add(value)

	if (isRecipe(value)) {
		const axes = Object.keys(value.config.variants ?? {})

		if (axes.includes('size') || axes.includes('density')) found.push(path)
	}

	for (const [key, child] of Object.entries(value)) {
		if (key !== 'config') steppedAxes(child, `${path}.${key}`, seen, found)
	}
}

describe('density-native boundary', () => {
	const files = recipeFiles()

	it('no kata recipe has a size or density axis', async () => {
		const found: string[] = []

		// The modules are independent, so they load at once.
		const modules: Record<string, unknown>[] = await Promise.all(
			files.map((file) => import(join(srcDir, file))),
		)

		for (const [index, file] of files.entries()) {
			const module = modules[index] ?? {}

			const name = file.replace(/^recipes\/kata\//, '').replace(/\.ts$/, '')

			const seen = new Set<unknown>()

			for (const [key, value] of Object.entries(module)) {
				steppedAxes(value, `${name}:${key}`, seen, found)
			}
		}

		expect(found).toEqual([])
	})

	it('walks the recipes of each kata', () => {
		// A walk that read no file would pass the case above with an empty list.
		expect(files.length).toBeGreaterThan(50)

		expect(files).toContain('recipes/kata/sidebar-layout.ts')
	})
})

/** The code of each source file, with the comments removed, read once for each scan below. */
const sources: { file: string; code: string }[] = []

walkSource(srcDir, (file, content) => {
	if (isSourceFile(file))
		sources.push({ file: srcRelative(file), code: stripSourceComments(content) })
})

/** The source files whose code, with the comments removed, matches `pattern`. */
function filesMatching(pattern: RegExp): string[] {
	return sources
		.filter(({ code }) => pattern.test(code))
		.map(({ file }) => file)
		.sort()
}

// A density scope has two channels: `data-density` for the stepped classes and
// the density context for a client reader. A scope is the `density` prop of the
// host primitive (PolymorphicStatic, Box, ControlFrame, PopoverPanel, or
// FloatingSurface), which writes both channels in one place. Only the files
// below open the context by hand:
//
//   - The primitives that own the prop.
//   - Button, whose element is the registered link or a `<button>`, and Drawer,
//     whose element is a `motion.div`. Each writes both channels itself.
//   - The grid's `GridOverlayDensity`, a context-only relay around a surface
//     that writes its own `data-density`. Its context is private to its file.

const CONTEXT_OPENERS = [
	'components/button/button.tsx',
	'components/drawer/drawer.tsx',
	'modules/grid/grid-region.tsx',
	'primitives/floating-surface/floating-surface.tsx',
	'primitives/polymorphic/polymorphic-static.tsx',
	'primitives/popover/popover-panel.tsx',
]

const CONTEXT_OPEN = /<Density\b/

describe('density scopes', () => {
	it('only the listed files open the density context by hand', () => {
		expect(filesMatching(CONTEXT_OPEN)).toEqual(CONTEXT_OPENERS)
	})
})

// A class selects a density step through the `density-*` variants and the
// stepped utilities. Those rank each match by the depth of its scope. A
// `data-[density=…]` selector has no rank, so an outer scope can win over the
// nearest one. The source therefore writes no such selector.

const DENSITY_SELECTOR = /data-\[density=/

describe('density selectors', () => {
	it('no source file selects a step with a data-[density=…] class', () => {
		expect(filesMatching(DENSITY_SELECTOR)).toEqual([])
	})
})

// A pseudo-element ends a selector. A density class after a pseudo-element
// variant, such as `before:density-p-[2,3,4]`, therefore writes rules that no
// browser can match: the rung of the element itself puts an attribute after the
// pseudo-element. The density variant comes first, as in
// `density-md:before:p-3` or `density-[xs,sm]:before:p-2`.

const PSEUDO_THEN_DENSITY =
	/(?<![\w-])(?:before|after|placeholder|file|marker|selection|backdrop|first-line|first-letter|\[&::[^\]\s]+\]):[^\s'"`]*?density-/

describe('density after a pseudo-element', () => {
	it('no source file puts a density class after a pseudo-element variant', () => {
		expect(filesMatching(PSEUDO_THEN_DENSITY)).toEqual([])
	})
})

// A component that reads the step as a JS value paints the `md` step on the
// server and in the hydration render, so the markup is wrong at the first
// paint. Only the files below may read it. Each uses the value only for work
// after mount, or for a context that a client descendant reads after mount.
// Calendar reads it at the first paint, because its test needs no root step.
//
//   - Calendar: a test for `xs`, which opens a scope at `sm`. Only a `size` or
//     a scope sets `xs`, and the server reads both, so the first paint is right.
//   - GridData: the virtualizer estimate, the autosizer refit key, and the
//     step of the overlays that the grid opens.
//   - The density primitive and its barrel: `useDensityStep` itself.
//
// The check reads each name, not only each call, so an aliased import fails it.

const STEP_READERS = [
	'components/calendar/calendar.tsx',
	'modules/grid/grid-data.tsx',
	'primitives/density/density.tsx',
	'primitives/density/index.ts',
]

const STEP_READ = /\buse(?:Density)?Step\b/

// `useDensityScope` gives the nearest explicit scope, or `null` at the root.
// `Portal` writes that scope on its host, so a portaled panel keeps the step of
// the tree that opened it. Only `Portal` and the primitive may read it. A
// surface that portals goes through `Portal`, and writes no scope of its own.

const SCOPE_READERS = [
	'primitives/density/density.tsx',
	'primitives/density/index.ts',
	'primitives/portal/portal.tsx',
]

const SCOPE_READ = /\buseDensityScope\b/

describe('density readers', () => {
	it('only the listed files read the density step in JS', () => {
		expect(filesMatching(STEP_READ)).toEqual(STEP_READERS)
	})

	it('only the portal reads the nearest density scope', () => {
		expect(filesMatching(SCOPE_READ)).toEqual(SCOPE_READERS)
	})
})
