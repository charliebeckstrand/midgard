import { Node, Project, ScriptKind, type SourceFile } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { findComponent, readPublicExports } from '../../api-reference/engine/find-components'

function indexFile(text: string) {
	// Barrel scanning reads export declarations, never lib types; skipping lib
	// loading cuts most of the Project construction cost.
	const project = new Project({ useInMemoryFileSystem: true, skipLoadingLibFiles: true })

	return project.createSourceFile('index.ts', text, { scriptKind: ScriptKind.TS })
}

/**
 * Two-file barrel: `index.ts` re-exports from `<component>.tsx`. Returns the
 * barrel source file so `findComponent` can resolve the re-export across files,
 * exercising the same cross-file path {@link openProject} builds.
 */
function barrel(componentSource: string): SourceFile {
	const project = new Project({ useInMemoryFileSystem: true, skipLoadingLibFiles: true })

	project.createSourceFile('component.tsx', componentSource, { scriptKind: ScriptKind.TSX })

	return project.createSourceFile('index.ts', `export { Widget } from './component'`, {
		scriptKind: ScriptKind.TS,
	})
}

describe('readPublicExports', () => {
	it('lists every PascalCase value re-export from a barrel', () => {
		const sf = indexFile(`export { Button, Badge } from './button'`)

		expect(readPublicExports(sf)).toEqual(['Button', 'Badge'])
	})

	it('skips non-PascalCase exports (hooks, utilities)', () => {
		const sf = indexFile(`export { Button, useButton, buttonRecipe } from './button'`)

		expect(readPublicExports(sf)).toEqual(['Button'])
	})

	it('skips per-specifier type-only exports', () => {
		const sf = indexFile(`export { Button, type ButtonProps } from './button'`)

		expect(readPublicExports(sf)).toEqual(['Button'])
	})

	it('skips whole-statement `export type { ... }` re-exports', () => {
		const sf = indexFile(`export type { ButtonProps, ButtonVariants } from './button'`)

		expect(readPublicExports(sf)).toEqual([])
	})

	it('aggregates across multiple export statements in declaration order', () => {
		const sf = indexFile(
			[
				`export { Button } from './button'`,
				`export { Badge, BadgeGroup } from './badge'`,
				`export { Icon } from './icon'`,
			].join('\n'),
		)

		expect(readPublicExports(sf)).toEqual(['Button', 'Badge', 'BadgeGroup', 'Icon'])
	})

	it('dedupes a name re-exported from more than one source', () => {
		const sf = indexFile(
			[`export { Button } from './button'`, `export { Button } from './also-button'`].join('\n'),
		)

		expect(readPublicExports(sf)).toEqual(['Button'])
	})

	it('returns an empty array for an unrelated module shape', () => {
		const sf = indexFile(`export const x = 1`)

		expect(readPublicExports(sf)).toEqual([])
	})

	it('ignores `export * from` re-exports (only named clauses are surfaced)', () => {
		const sf = indexFile(`export * from './button'`)

		expect(readPublicExports(sf)).toEqual([])
	})

	it('records the renamed (alias) name, not the local name', () => {
		const sf = indexFile(`export { InternalButton as Button } from './button'`)

		expect(readPublicExports(sf)).toEqual(['Button'])
	})
})

/** Name of the props-bearing first parameter on the resolved callable. */
function firstParamName(sf: SourceFile): string | undefined {
	const decl = findComponent('Widget', sf)

	return decl?.callable.getParameters()[0]?.getName()
}

describe('findComponent', () => {
	it('resolves a plain `export function` component', () => {
		const sf = barrel(`export function Widget(props: { label?: string }) { return null }`)

		expect(firstParamName(sf)).toBe('props')
	})

	it('unwraps an inline `memo(function () {})` argument', () => {
		const sf = barrel(
			`import { memo } from 'react'
			export const Widget = memo(function Widget(props: { label?: string }) { return null })`,
		)

		expect(firstParamName(sf)).toBe('props')
	})

	it('resolves a `memo(Impl)` reference argument to its declaration', () => {
		const sf = barrel(
			`import { memo } from 'react'
			function WidgetImpl(props: { label?: string }) { return null }
			export const Widget = memo(WidgetImpl)`,
		)

		expect(firstParamName(sf)).toBe('props')
	})

	it('peels a `memo(Impl) as typeof Impl` cast — the shape Grid ships', () => {
		const sf = barrel(
			`import { memo } from 'react'
			function WidgetImpl<T>(props: { rows: T[] }) { return null }
			export const Widget = memo(WidgetImpl) as typeof WidgetImpl`,
		)

		const decl = findComponent('Widget', sf)

		expect(decl?.callable && Node.isFunctionDeclaration(decl.callable)).toBe(true)

		expect(decl?.callable.getParameters()[0]?.getName()).toBe('props')
	})

	it('returns null when no export names the component', () => {
		const sf = barrel(`export const notAComponent = 1`)

		expect(findComponent('Widget', sf)).toBeNull()
	})
})
