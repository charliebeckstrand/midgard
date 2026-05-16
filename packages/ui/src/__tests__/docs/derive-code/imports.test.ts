import { describe, expect, it } from 'vitest'
import { addImport, assemble } from '../../../docs/derive-code/imports'
import type { Ctx } from '../../../docs/derive-code/types'

function emptyCtx(): Ctx {
	return {
		registry: { byType: { get: () => undefined }, byName: new Map() },
		imports: new Map(),
	}
}

describe('addImport', () => {
	it('records a single name under its module', () => {
		const ctx = emptyCtx()

		addImport(ctx, 'button', 'Button')

		expect(ctx.imports.get('button')).toEqual(new Set(['Button']))
	})

	it('dedupes repeated names within a module', () => {
		const ctx = emptyCtx()

		addImport(ctx, 'button', 'Button')
		addImport(ctx, 'button', 'Button')

		expect(ctx.imports.get('button')?.size).toBe(1)
	})

	it('keeps names from different modules separate', () => {
		const ctx = emptyCtx()

		addImport(ctx, 'button', 'Button')
		addImport(ctx, 'icon', 'Icon')

		expect(ctx.imports.get('button')).toEqual(new Set(['Button']))
		expect(ctx.imports.get('icon')).toEqual(new Set(['Icon']))
	})

	it('accumulates multiple names for the same module', () => {
		const ctx = emptyCtx()

		addImport(ctx, 'group', 'Group')
		addImport(ctx, 'group', 'GroupItem')

		expect(ctx.imports.get('group')).toEqual(new Set(['Group', 'GroupItem']))
	})
})

describe('assemble', () => {
	it('emits imports + a blank line + jsx', () => {
		const ctx = emptyCtx()

		addImport(ctx, 'button', 'Button')

		const result = assemble(ctx, '<Button />')

		expect(result).toBe(`import { Button } from 'ui/button'\n\n<Button />`)
	})

	it('returns just the imports when jsx is empty', () => {
		const ctx = emptyCtx()

		addImport(ctx, 'button', 'Button')

		expect(assemble(ctx, '')).toBe(`import { Button } from 'ui/button'`)
	})

	it("uses a bare 'react' specifier for react imports", () => {
		const ctx = emptyCtx()

		addImport(ctx, 'react', 'useState')

		expect(assemble(ctx, '')).toBe(`import { useState } from 'react'`)
	})

	it("prefixes non-react modules with 'ui/'", () => {
		const ctx = emptyCtx()

		addImport(ctx, 'file-upload', 'FileUpload')

		expect(assemble(ctx, '')).toBe(`import { FileUpload } from 'ui/file-upload'`)
	})

	it('sorts modules alphabetically across the emitted lines', () => {
		const ctx = emptyCtx()

		addImport(ctx, 'icon', 'Icon')
		addImport(ctx, 'button', 'Button')
		addImport(ctx, 'avatar', 'Avatar')

		const lines = assemble(ctx, '').split('\n')

		expect(lines).toEqual([
			`import { Avatar } from 'ui/avatar'`,
			`import { Button } from 'ui/button'`,
			`import { Icon } from 'ui/icon'`,
		])
	})

	it('sorts names alphabetically within a single import statement', () => {
		const ctx = emptyCtx()

		addImport(ctx, 'group', 'GroupItem')
		addImport(ctx, 'group', 'Group')

		expect(assemble(ctx, '')).toBe(`import { Group, GroupItem } from 'ui/group'`)
	})
})
