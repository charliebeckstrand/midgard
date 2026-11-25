// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { createElement as h } from 'react'
import { describe, expect, it } from 'vitest'
import { CountryFlag } from '../components/country-flag'

describe('CountryFlag', () => {
	// The SVG of a flag has no size of its own. Safari before 17.2 and Chrome
	// before 118 have no `cap` unit and drop a `1cap` height, so the flag then
	// grows to the width of its line.
	it('gives the flag a height that a browser with no cap unit can read', () => {
		const { container } = render(h(CountryFlag, { country: 'us' }))

		const classes = container.querySelector('svg')?.getAttribute('class')?.split(' ') ?? []

		expect(classes).toContain('h-[0.7em]')

		expect(classes).toContain('supports-[height:1cap]:h-[1cap]')
	})
})
