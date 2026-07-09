import { describe, expect, it } from 'vitest'
import { demoHref, parseDemoGlobKey, parseLayoutGlobKey, parsePathname, slugify } from '../routes'

// The pure route model maps demo glob keys and pathnames to route coordinates;
// these pin the id scheme (registry and API-reference keys), the path scheme
// (the URLs the router serves), and the tab derivation behind routed demos.

describe('parseDemoGlobKey', () => {
	it('places a top-level file in the components category', () => {
		expect(parseDemoGlobKey('./demos/button.tsx')).toEqual({
			id: 'button',
			category: 'components',
			label: 'button',
			tab: '',
		})
	})

	it('keeps components ids bare and namespaces other categories', () => {
		expect(parseDemoGlobKey('./demos/components/button.tsx')?.id).toBe('button')

		expect(parseDemoGlobKey('./demos/providers/toast.tsx')?.id).toBe('providers-toast')

		expect(parseDemoGlobKey('./demos/modules/chat.tsx')?.id).toBe('modules-chat')
	})

	it('treats a folder index as the demo itself with the empty tab', () => {
		expect(parseDemoGlobKey('./demos/modules/grid/index.tsx')).toEqual({
			id: 'modules-grid',
			category: 'modules',
			label: 'grid',
			tab: '',
		})
	})

	it('treats a non-index folder page as a tab of the folder demo', () => {
		expect(parseDemoGlobKey('./demos/modules/grid/sorting.tsx')).toEqual({
			id: 'modules-grid',
			category: 'modules',
			label: 'grid',
			tab: 'sorting',
		})
	})

	it('places a folder demo at category depth in the default category', () => {
		expect(parseDemoGlobKey('./demos/grid/index.tsx')).toEqual({
			id: 'grid',
			category: 'components',
			label: 'grid',
			tab: '',
		})
	})

	it('declines pages deeper than the tab level', () => {
		expect(parseDemoGlobKey('./demos/modules/grid/nested/page.tsx')).toBeNull()
	})
})

describe('parseLayoutGlobKey', () => {
	it('names the demo a folder layout wraps', () => {
		expect(parseLayoutGlobKey('./demos/modules/grid/layout.tsx')).toBe('modules-grid')

		expect(parseLayoutGlobKey('./demos/grid/layout.tsx')).toBe('grid')
	})

	it('declines a layout with no folder to wrap, or one too deep', () => {
		expect(parseLayoutGlobKey('./demos/layout.tsx')).toBeNull()

		expect(parseLayoutGlobKey('./demos/modules/grid/nested/layout.tsx')).toBeNull()
	})
})

describe('parsePathname and demoHref', () => {
	it('round-trips a demo path with and without a tab', () => {
		const demo = { path: 'modules/grid' }

		expect(parsePathname(demoHref(demo))).toEqual({ demoPath: 'modules/grid', tab: '' })

		expect(parsePathname(demoHref(demo, 'sorting'))).toEqual({
			demoPath: 'modules/grid',
			tab: 'sorting',
		})
	})

	it('parses the root to the empty demo path (the default-demo cue)', () => {
		expect(parsePathname('/')).toEqual({ demoPath: '', tab: '' })

		expect(parsePathname('')).toEqual({ demoPath: '', tab: '' })
	})

	it('resolves a single segment in the components category', () => {
		expect(parsePathname('/button')).toEqual({ demoPath: 'components/button', tab: '' })
	})

	it('declines paths deeper than a tab', () => {
		expect(parsePathname('/modules/grid/sorting/extra')).toBeNull()
	})
})

describe('slugify', () => {
	it('lowercases and hyphenates non-alphanumeric runs without edge hyphens', () => {
		expect(slugify('Server grouping')).toBe('server-grouping')

		expect(slugify('Date, number & boolean filters')).toBe('date-number-boolean-filters')

		expect(slugify('  Padded — title!  ')).toBe('padded-title')
	})
})
