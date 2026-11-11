// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ElectionsHeader } from '../components/elections-header'
import { type Election, findElection } from '../utilities/registry'
import { electionCrumbs } from '../utilities/trail'

/** The path of the page that the header is on. */
let pathname = '/'

vi.mock('next/navigation', () => ({
	usePathname: () => pathname,
	useRouter: () => ({ push: () => {}, prefetch: () => {} }),
}))

afterEach(cleanup)

// jsdom has no `ResizeObserver` and no layout, and the trail measures its crumbs.
beforeEach(() => {
	Range.prototype.getBoundingClientRect = () => new DOMRect()

	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

const midterms = findElection('2026', 'us', 'midterms')

if (midterms === undefined) throw new Error('The registry has no 2026 midterms.')

const election: Election = midterms

describe('ElectionsHeader', () => {
	it('links each crumb to its own level', () => {
		pathname = '/2026/us/midterms/senate'

		render(h(ElectionsHeader, { crumbs: electionCrumbs(election) }))

		const hrefs = ['Elections', '2026', 'United States', 'Midterms'].map((name) =>
			screen.getByRole('link', { name }).getAttribute('href'),
		)

		expect(hrefs).toEqual(['/', '/2026', '/2026/us', '/2026/us/midterms'])

		expect(screen.queryByRole('button', { name: /Midterms/ })).toBeNull()
	})

	it('marks the election crumb as the current page only on the overview', () => {
		pathname = '/2026/us/midterms/senate'

		render(h(ElectionsHeader, { crumbs: electionCrumbs(election) }))

		expect(screen.getByRole('link', { name: 'Midterms' }).getAttribute('aria-current')).toBeNull()

		cleanup()

		pathname = '/2026/us/midterms'

		render(h(ElectionsHeader, { crumbs: electionCrumbs(election) }))

		expect(screen.queryByRole('link', { name: 'Midterms' })).toBeNull()

		expect(
			screen.getByText('Midterms').closest('[aria-current]')?.getAttribute('aria-current'),
		).toBe('page')
	})
})
