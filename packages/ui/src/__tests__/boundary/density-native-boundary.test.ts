// @vitest-environment node
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// A density-native component takes its step from the nearest density scope.
// Its kata writes each step in a stepped `density-*` utility, so the DOM selects the
// step and no JS code selects it. Two rules hold that design:
//
//   - No recipe of the component has a `size` or a `density` axis. The walk
//     below reads each recipe of each kata and each layout variant module, so a
//     new kata is native by default.
//   - The component reads no density context. An explicit `size` becomes a
//     scope (the `density` prop of PolymorphicStatic or Box), not a lookup. The
//     reader allowlists at the end of this file hold this rule for each file.
//
// The recipes below keep a `size` axis on purpose. Each names its reason. A
// recipe that drops its axis must leave the list too.

const INERT: Record<string, string> = {
	'avatar:k': 'An avatar is content. Its box is explicit, and a host projects a size onto it.',
	'code:k': 'Inline code keeps the mark size that the caller gives it.',
	'kbd:k':
		'A key keeps the mark size that the caller gives it. A host, such as Button, projects one.',
	'stat:k.value': 'A figure takes its size from the layout of the dashboard, not from density.',
	'stat:k.skeleton.value': 'The silhouette of a figure has the axis of the figure.',
	'swatch:k': 'A chart gives each legend dot one size, not a density step.',
	'text:k': 'Text keeps the size around it. Its `size` sets the type scale explicitly.',
}

const srcDir = join(import.meta.dirname, '..', '..')

/** The kata modules and the layout variant modules, by the path under `src`. */
function recipeFiles(): string[] {
	const kata = readdirSync(join(srcDir, 'recipes', 'kata'))
		.filter((file) => file.endsWith('.ts'))
		.map((file) => `recipes/kata/${file}`)

	const layouts = readdirSync(join(srcDir, 'layouts'), { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isDirectory() && existsSync(join(srcDir, 'layouts', entry.name, 'variants.ts')),
		)
		.map((entry) => `layouts/${entry.name}/variants.ts`)

	return [...kata, ...layouts].sort()
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

	it('no kata or layout recipe has a size or density axis, except the listed ones', async () => {
		const found: string[] = []

		for (const file of files) {
			const module: Record<string, unknown> = await import(join(srcDir, file))

			const name = file.replace(/^(?:recipes\/kata|layouts)\//, '').replace(/\.ts$/, '')

			const seen = new Set<unknown>()

			for (const [key, value] of Object.entries(module)) {
				steppedAxes(value, `${name}:${key}`, seen, found)
			}
		}

		expect(found.sort()).toEqual(Object.keys(INERT).sort())
	})

	it('walks the recipes of each kata and each layout', () => {
		// A walk that read no file would pass the case above with an empty list.
		expect(files.length).toBeGreaterThan(50)

		expect(files).toContain('layouts/sidebar/variants.ts')
	})
})

/** The source files whose code, with the comments removed, matches `pattern`. */
function filesMatching(pattern: RegExp): string[] {
	const files: string[] = []

	walkSource(srcDir, (file, content) => {
		if (/\.tsx?$/.test(file) && pattern.test(stripSourceComments(content))) {
			files.push(srcRelative(file))
		}
	})

	return files.sort()
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
//
//   - Chart and scatter chart: the tick cap. With no `width`, the server
//     renders an empty frame, and the chart measures before the first paint.
//   - GridData: the virtualizer estimate, the autosizer refit key, and the
//     step of the overlays that the grid opens.
//   - The density primitive and its barrel: the hook itself.
//
// The check reads each name, not only each call, so an aliased import fails it.

const STEP_READERS = [
	'modules/chart/engine/use-chart-cartesian.ts',
	'modules/chart/scatter-chart/scatter-chart.tsx',
	'modules/grid/grid-data.tsx',
	'primitives/density/density.tsx',
	'primitives/density/index.ts',
]

const STEP_READ = /\buseDensityStep\b/

// `useDensityScope` gives the nearest explicit scope, or `null` at the root. A
// portal root writes that scope on its element, so a portaled panel keeps the
// step of the tree that opened it. Only the portal roots and the primitive may
// read it: Overlay, FloatingSurface, and the Listbox and Combobox panels, which
// portal through their own wrappers.

const SCOPE_READERS = [
	'components/combobox/combobox-panel.tsx',
	'components/listbox/listbox-panel.tsx',
	'primitives/density/density.tsx',
	'primitives/density/index.ts',
	'primitives/floating-surface/floating-surface.tsx',
	'primitives/overlay/overlay.tsx',
]

const SCOPE_READ = /\buseDensityScope\b/

describe('density readers', () => {
	it('only the listed files read the density step in JS', () => {
		expect(filesMatching(STEP_READ)).toEqual(STEP_READERS)
	})

	it('only the portal roots read the nearest density scope', () => {
		expect(filesMatching(SCOPE_READ)).toEqual(SCOPE_READERS)
	})
})
