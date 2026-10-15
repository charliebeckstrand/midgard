// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
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

// A class selects a density step through the stepped utilities, which read
// the weights of the nearest scope. A `data-[density=…]` selector has no
// proximity, so an outer scope can win over the nearest one. The source
// therefore writes no such selector.

const DENSITY_SELECTOR = /data-\[density=/

describe('density selectors', () => {
	it('no source file selects a step with a data-[density=…] class', () => {
		expect(filesMatching(DENSITY_SELECTOR)).toEqual([])
	})
})

// A step variant, such as `density-md:p-3` or `density-[xs,sm]:p-2`, has no
// plugin, so Tailwind writes no CSS for it and gives no error. This test is the
// guard. The source writes each step in a stepped class, which takes the step
// of its nearest scope at each depth. A stepped class after a pseudo-element,
// such as `before:density-rounded-ring-[1,1.5,2,2.5,3]`, takes the custom
// properties that the pseudo-element inherits. `density-any` is not a step
// variant, and the source can use it.

const STEP_VARIANT = /(?<![\w-])density-(?:xs|sm|md|lg|xl|\[[a-z,]+\]):/

/** The root of the repository. */
const repoRoot = join(srcDir, '..', '..', '..')

/**
 * The code of each file that uses the classes of `ui` outside `ui/src`, with
 * the comments removed: the source of each app and of `shared`, and the
 * stylesheets of `ui`, such as the `@source inline` lists of `tailwind.css`.
 */
const consumers: { file: string; code: string }[] = []

const isConsumer = (file: string) => /\.(?:tsx?|mts|css|mdx)$/.test(file)

const visitConsumer = (file: string, content: string) => {
	if (!isConsumer(file)) return

	const code = file.endsWith('.css')
		? content.replace(/\/\*[\s\S]*?\*\//g, '')
		: stripSourceComments(content)

	consumers.push({ file: file.slice(repoRoot.length + 1), code })
}

for (const app of readdirSync(join(repoRoot, 'apps')))
	walkSource(join(repoRoot, 'apps', app), visitConsumer)

walkSource(join(repoRoot, 'packages', 'shared', 'src'), visitConsumer)

for (const file of readdirSync(join(srcDir, '..')).filter((name) => name.endsWith('.css'))) {
	const path = join(srcDir, '..', file)

	visitConsumer(path, readFileSync(path, 'utf8'))
}

describe('density step variants', () => {
	it('no source file uses a step variant', () => {
		expect(filesMatching(STEP_VARIANT)).toEqual([])
	})

	it('no app, shared source, or ui stylesheet uses a step variant', () => {
		expect(consumers.length).toBeGreaterThan(100)

		expect(consumers.filter(({ code }) => STEP_VARIANT.test(code)).map(({ file }) => file)).toEqual(
			[],
		)
	})

	it('finds a step variant, and no stepped class', () => {
		expect(STEP_VARIANT.test('density-md:p-3')).toBe(true)

		expect(STEP_VARIANT.test('max-sm:density-[xs,sm]:pb-2')).toBe(true)

		expect(STEP_VARIANT.test('density-xs:before:rounded-ring-1')).toBe(true)

		expect(STEP_VARIANT.test('before:density-rounded-ring-[1,1.5,2,2.5,3]')).toBe(false)

		expect(STEP_VARIANT.test('max-sm:density-set-[4,5,6,7,8]/[--ui-panel-bottom]')).toBe(false)

		expect(STEP_VARIANT.test('density-any:h-4')).toBe(false)
	})
})

// A stepped class reads the custom properties that its element inherits.
// Before Chrome 122, `::backdrop` does not inherit from its element, so a
// density class after `backdrop:` takes no step there.

const BACKDROP_DENSITY = /(?<![\w-])backdrop:[^\s'"`]*?density-/

describe('density after backdrop', () => {
	it('no source file puts a density class after the backdrop variant', () => {
		expect(filesMatching(BACKDROP_DENSITY)).toEqual([])
	})
})

// A component that reads the step as a JS value paints the `md` step on the
// server and in the hydration render, so the markup is wrong at the first
// paint. Only the files below may read it. Each uses the value only for work
// after mount, or for a context that a client descendant reads after mount.
//
//   - GridData: the virtualizer estimate, the autosizer refit key, and the
//     step of the overlays that the grid opens.
//   - The docs playground: the step of the page, to mark the option of a
//     `size` field that the omitted prop renders. The docs app only.
//   - The density primitive and its barrel: `useDensityStep` itself.
//
// The check reads each name, not only each call, so an aliased import fails it.

const STEP_READERS = [
	'docs/kit/playground.tsx',
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
