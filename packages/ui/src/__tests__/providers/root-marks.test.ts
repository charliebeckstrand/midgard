// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hasRootTag, markRoot, rootMarks } from '../../providers/ui/root-marks'

// A server writes the stored settings of the reader on the root element of a
// page from the cookies of the request (CONVENTIONS §3.13).

describe('rootMarks', () => {
	it('reads the stored settings of the reader from the cookies of the request', () => {
		expect(rootMarks()).toEqual({ classes: [], attributes: [] })

		expect(
			rootMarks('locale=es; theme=system; density=snug; motion=system; sidebar=locked; glass=on'),
		).toEqual({
			classes: [],
			attributes: [],
		})

		expect(
			rootMarks(
				'theme=dark; density=compact; motion=reduced; sidebar=offcanvas; glass=off; events-on=1; events-pinned=1',
			),
		).toEqual({
			classes: ['dark', 'density-root-sm', 'reduced-motion', 'sidebar-offcanvas', 'glass-off'],
			attributes: ['data-events', 'data-events-pinned'],
		})

		// A light theme on a dark OS needs its own class, and a pin with the events
		// off shows no panel.
		expect(rootMarks('theme=light; density=loose; events-on=0; events-pinned=1')).toEqual({
			classes: ['light', 'density-root-lg'],
			attributes: [],
		})

		// A value that is not one of the values of a setting reads as the default.
		expect(rootMarks('theme=%3Cscript%3E; density=__proto__')).toEqual({
			classes: [],
			attributes: [],
		})
	})
})

describe('markRoot', () => {
	const html = '<!DOCTYPE html><html lang="en" class="antialiased"><head></head></html>'

	it('adds the classes after the classes of the build, and the attributes after them', () => {
		expect(
			markRoot(html, { classes: ['dark', 'reduced-motion'], attributes: ['data-events'] }),
		).toBe(
			'<!DOCTYPE html><html lang="en" class="antialiased dark reduced-motion" data-events=""><head></head></html>',
		)
	})

	it('adds a class attribute to a root that has none, and leaves a page with no marks as it is', () => {
		expect(markRoot('<html lang="es">', { classes: ['light'], attributes: [] })).toBe(
			'<html lang="es" class="light">',
		)

		expect(markRoot(html, { classes: [], attributes: [] })).toBe(html)
	})
})

describe('hasRootTag', () => {
	it('is true only once the opening tag of the root is whole', () => {
		expect(hasRootTag('<!DOCTYPE html><html lang="e')).toBe(false)

		expect(hasRootTag('<!DOCTYPE html><html lang="en">')).toBe(true)
	})
})
