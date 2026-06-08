import { describe, expect, it } from 'vitest'
import { buildTaggedBarrel, parseReExports } from '../../../docs/plugins/docs'

// Representative public barrels: a component (value + type specifiers) and a
// provider (a PascalCase context alongside non-PascalCase hooks).
const BUTTON_BARREL = `
export type { ButtonVariants } from '../../recipes/kata/button'
export { Button, type ButtonProps } from './button'
export { ButtonSkeleton, type ButtonSkeletonProps } from './button-skeleton'
`

const GLASS_BARREL = `
export { GlassContext, useGlass, useResolvedSurface } from './context'
export { GlassProvider, type GlassProviderProps } from './glass'
`

function rewrite(source: string, moduleName: string): string {
	return buildTaggedBarrel(parseReExports(source, 'index.ts'), moduleName) ?? ''
}

describe('buildTaggedBarrel', () => {
	it('returns null when nothing is taggable', () => {
		const onlyTypes = `export type { ButtonVariants } from '../../recipes/kata/button'`

		expect(buildTaggedBarrel(parseReExports(onlyTypes, 'index.ts'), 'button')).toBeNull()

		const onlyHooks = `export { useGlass } from './context'`

		expect(buildTaggedBarrel(parseReExports(onlyHooks, 'index.ts'), 'providers/glass')).toBeNull()
	})

	it('re-binds each PascalCase value export through the tagger', () => {
		const out = rewrite(BUTTON_BARREL, 'button')

		expect(out).toContain('export const Button = __ct_tag(__ct_0, "Button")')

		expect(out).toContain('export const ButtonSkeleton = __ct_tag(__ct_1, "ButtonSkeleton")')

		// The decoration the runtime walker reads, carrying this barrel's module.
		expect(out).toContain('__module: "button"')
	})

	// The load-bearing invariant. The tag MUST ride inside a consumed export's
	// initializer. A standalone `__ct_tag(...)` statement is a bare side effect
	// that the production build (the library declares `sideEffects: false`)
	// tree-shakes away — silently emptying every derived "Show code" block while
	// dev, which never tree-shakes, stays green. If a refactor reverts to an
	// appended suffix, this fails instead of the breakage reaching prod unseen.
	it('never emits a standalone (tree-shakeable) tag statement', () => {
		const out = rewrite(BUTTON_BARREL, 'button')

		const standalone = out
			.split('\n')
			.map((line) => line.trimStart())
			.filter((line) => line.startsWith('__ct_tag('))

		expect(standalone).toEqual([])

		// Every tag call that exists is the initializer of an exported binding.
		const calls = out.match(/__ct_tag\(__ct_/g) ?? []

		const exportInitializers = out.match(/export const \w+ = __ct_tag\(/g) ?? []

		expect(calls.length).toBeGreaterThan(0)

		expect(exportInitializers).toHaveLength(calls.length)
	})

	it('passes through type and non-PascalCase specifiers untouched', () => {
		const out = rewrite(GLASS_BARREL, 'providers/glass')

		// Hooks (non-PascalCase) stay plain re-exports and are never tagged.
		expect(out).toContain('export { useGlass, useResolvedSurface } from "./context"')

		expect(out).not.toMatch(/export const useGlass/)

		// Type-only specifiers are preserved as type re-exports.
		expect(out).toContain('export { type GlassProviderProps } from "./glass"')

		// Both PascalCase values — the component and the context — are tagged.
		expect(out).toContain('export const GlassProvider = __ct_tag(')

		expect(out).toContain('export const GlassContext = __ct_tag(')
	})
})
