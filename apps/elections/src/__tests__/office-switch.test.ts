// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Activity, createElement as h, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OfficeSwitch } from '../components/office-switch'
import type { OfficeItem } from '../utilities/trail'

/** The route that a pick of the switch goes to, as the router of the test holds it. */
let navigate: (href: string) => void = () => {}

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: (href: string) => navigate(href), prefetch: () => {} }),
}))

afterEach(cleanup)

// jsdom has no `ResizeObserver`, and the tab list watches its tabs with one.
beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

const items: OfficeItem[] = [
	{ value: 'overview', label: 'Overview', href: '/overview', disabled: false },
	{ value: 'senate', label: 'Senate', href: '/senate', disabled: false },
]

/** A view of each item with its own switch, as the layout of an election renders them. */
function Views() {
	const [current, setCurrent] = useState('/overview')

	navigate = setCurrent

	return items.map((item) =>
		h(Activity, {
			key: item.value,
			mode: item.href === current ? 'visible' : 'hidden',
			children: h(
				'div',
				{ 'data-view': item.value },
				h(OfficeSwitch, { items, value: item.value }),
			),
		}),
	)
}

describe('OfficeSwitch', () => {
	it('gives the focus to the switch of the view that a pick shows', async () => {
		render(h(Views))

		const shown = () => document.querySelector('[data-view="overview"]')

		const senate = screen
			.getAllByRole('tab', { name: 'Senate' })
			.find((element) => shown()?.contains(element))

		if (senate === undefined) throw new Error('The overview has no Senate tab.')

		await act(async () => {
			senate.focus()

			fireEvent.click(senate)
		})

		const view = document.querySelector('[data-view="senate"]')

		expect(view?.contains(document.activeElement)).toBe(true)

		expect(document.activeElement?.getAttribute('aria-selected')).toBe('true')
	})
})
