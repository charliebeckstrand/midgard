// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { pageAt, pageOf } from '../pages'

describe('pageOf', () => {
	it('puts a component page at its file name', () => {
		expect(pageOf('demos/components/copy-button.tsx')).toEqual({
			id: 'copy-button',
			path: '/copy-button',
			name: 'CopyButton',
			category: 'components',
		})
	})

	it('puts a page in another folder below that folder, and joins its id with a hyphen', () => {
		expect(pageOf('../demos/structure/box.tsx')).toMatchObject({
			id: 'structure-box',
			path: '/structure/box',
			category: 'structure',
		})
	})

	it('reads a folder page from its index file', () => {
		expect(pageOf('demos/modules/grid/index.tsx')).toMatchObject({
			id: 'modules-grid',
			path: '/modules/grid',
			name: 'Grid',
		})
	})

	it('takes the name and the section from the handle of the demo', () => {
		expect(pageOf('demos/providers/ui.tsx', { name: 'UI' }).name).toBe('UI')

		expect(pageOf('demos/components/input.tsx', { category: 'input' }).category).toBe('input')
	})
})

describe('pageAt', () => {
	const pages = [pageOf('demos/components/alert.tsx'), pageOf('demos/components/progress.tsx')]

	it('finds the page at a path, and the page of a tab below it', () => {
		expect(pageAt(pages, '/progress')?.id).toBe('progress')

		expect(pageAt(pages, '/progress/gauge')?.id).toBe('progress')
	})

	it('shows the first page at the root path, and no page at another path', () => {
		expect(pageAt(pages, '/')?.id).toBe('alert')

		expect(pageAt(pages, '/progressive')).toBeUndefined()
	})
})
