import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { readPublicExports } from '../../../docs/component-api/find-components'

function indexFile(text: string): ts.SourceFile {
	return ts.createSourceFile('index.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
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
