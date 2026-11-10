// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ElectionViews } from '../components/election-views'
import { OfficeSwitch } from '../components/office-switch'
import type { OfficeItem } from '../utilities/trail'

// The router stays at the overview, as a router transition that waits for a
// request in flight does.
vi.mock('next/navigation', () => ({ usePathname: () => '/e' }))

afterEach(() => {
	cleanup()

	window.history.replaceState(null, '', '/e')
})

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
	{ value: 'overview', label: 'Overview', href: '/e', disabled: false },
	{ value: 'senate', label: 'Senate', href: '/e/senate', disabled: false },
]

/** A view of each item with its own switch, as the layout of an election renders them. */
function Views() {
	return h(ElectionViews, {
		base: '/e',
		views: Object.fromEntries(
			items.map((item) => [
				item.value,
				{
					title: item.label,
					view: h(
						'div',
						{ 'data-view': item.value },
						h(OfficeSwitch, { items, value: item.value }),
					),
				},
			]),
		),
	})
}

/** The tab of `name` in the view of `view`. */
function tabIn(view: string, name: string): HTMLElement {
	const tab = screen
		.getAllByRole('tab', { name })
		.find((element) => document.querySelector(`[data-view="${view}"]`)?.contains(element))

	if (tab === undefined) throw new Error(`The ${view} view has no ${name} tab.`)

	return tab
}

/** Whether the view of `view` shows. */
function shows(view: string): boolean {
	return document.querySelector<HTMLElement>(`[data-view="${view}"]`)?.style.display !== 'none'
}

describe('OfficeSwitch', () => {
	it('shows the view of a pick at once while the router is behind, and writes its address', async () => {
		window.history.replaceState(null, '', '/e')

		render(h(Views))

		expect(shows('overview')).toBe(true)

		await act(async () => {
			fireEvent.click(tabIn('overview', 'Senate'))
		})

		expect(shows('senate')).toBe(true)

		expect(shows('overview')).toBe(false)

		expect(window.location.pathname).toBe('/e/senate')

		expect(document.title).toBe('Senate')

		// Back shows the overview at once too.
		await act(async () => {
			window.history.back()

			await new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }))
		})

		expect(shows('overview')).toBe(true)
	})

	it('gives the focus to the switch of the view that a pick shows', async () => {
		window.history.replaceState(null, '', '/e')

		render(h(Views))

		const senate = tabIn('overview', 'Senate')

		await act(async () => {
			senate.focus()

			fireEvent.click(senate)
		})

		const view = document.querySelector('[data-view="senate"]')

		expect(view?.contains(document.activeElement)).toBe(true)

		expect(document.activeElement?.getAttribute('aria-selected')).toBe('true')
	})
})
