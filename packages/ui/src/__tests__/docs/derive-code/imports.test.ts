import { describe, expect, it } from 'vitest'
import { addImport, assemble } from '../../../docs/derive-code/imports'
import type { Context } from '../../../docs/derive-code/types'

function emptyContext(): Context {
	return {
		registry: { byType: { get: () => undefined }, byName: new Map() },
		imports: new Map(),
	}
}

describe('addImport', () => {
	it('records a single name under its module', () => {
		const context = emptyContext()

		addImport(context, 'button', 'Button')

		expect(context.imports.get('button')).toEqual(new Set(['Button']))
	})

	it('dedupes repeated names within a module', () => {
		const context = emptyContext()

		addImport(context, 'button', 'Button')
		addImport(context, 'button', 'Button')

		expect(context.imports.get('button')?.size).toBe(1)
	})

	it('keeps names from different modules separate', () => {
		const context = emptyContext()

		addImport(context, 'button', 'Button')
		addImport(context, 'icon', 'Icon')

		expect(context.imports.get('button')).toEqual(new Set(['Button']))
		expect(context.imports.get('icon')).toEqual(new Set(['Icon']))
	})

	it('accumulates multiple names for the same module', () => {
		const context = emptyContext()

		addImport(context, 'group', 'Group')
		addImport(context, 'group', 'GroupItem')

		expect(context.imports.get('group')).toEqual(new Set(['Group', 'GroupItem']))
	})
})

describe('assemble', () => {
	it('emits imports + a blank line + jsx', () => {
		const context = emptyContext()

		addImport(context, 'button', 'Button')

		const result = assemble(context, '<Button />')

		expect(result).toBe(`import { Button } from 'ui/button'\n\n<Button />`)
	})

	it('returns just the imports when jsx is empty', () => {
		const context = emptyContext()

		addImport(context, 'button', 'Button')

		expect(assemble(context, '')).toBe(`import { Button } from 'ui/button'`)
	})

	it("uses a bare 'react' specifier for react imports", () => {
		const context = emptyContext()

		addImport(context, 'react', 'useState')

		expect(assemble(context, '')).toBe(`import { useState } from 'react'`)
	})

	it("prefixes non-react modules with 'ui/'", () => {
		const context = emptyContext()

		addImport(context, 'file-upload', 'FileUpload')

		expect(assemble(context, '')).toBe(`import { FileUpload } from 'ui/file-upload'`)
	})

	it('sorts modules alphabetically across the emitted lines', () => {
		const context = emptyContext()

		addImport(context, 'icon', 'Icon')
		addImport(context, 'button', 'Button')
		addImport(context, 'avatar', 'Avatar')

		const lines = assemble(context, '').split('\n')

		expect(lines).toEqual([
			`import { Avatar } from 'ui/avatar'`,
			`import { Button } from 'ui/button'`,
			`import { Icon } from 'ui/icon'`,
		])
	})

	it('sorts names alphabetically within a single import statement', () => {
		const context = emptyContext()

		addImport(context, 'group', 'GroupItem')
		addImport(context, 'group', 'Group')

		expect(assemble(context, '')).toBe(`import { Group, GroupItem } from 'ui/group'`)
	})
})
