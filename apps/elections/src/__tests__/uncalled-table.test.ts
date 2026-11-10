// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UncalledTable } from '../components/uncalled-table'
import { ELECTIONS } from '../elections/registry'

vi.mock('next/navigation', () => ({
	usePathname: () => '/2026/us/midterms',
	useSearchParams: () => new URLSearchParams(),
}))

afterEach(cleanup)

const [election] = ELECTIONS

describe('UncalledTable', () => {
	it('shows nothing once each race is called', () => {
		if (election === undefined) throw new Error('The registry holds no election.')

		const { container } = render(h(UncalledTable, { election, entries: [] }))

		expect(screen.queryByRole('button', { name: /Every race not called/ })).toBeNull()

		expect(container.childElementCount).toBe(0)
	})
})
