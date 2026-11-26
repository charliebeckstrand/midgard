import { act, screen } from '@testing-library/react'
import { Outlet } from 'react-router'
import { describe, expect, it } from 'vitest'
import { it as clockIt, type FakeClock } from '../../__tests__/helpers/fake-clock'
import { FIRST_WRITE_DELAY_MS } from '../../core/announcer.ts'
import { PageTabs } from '../kit/page-tabs.tsx'
import { renderShell } from './helpers/render-shell.tsx'

// Each tab of a page has its own address, so each tab has its own title
// (WCAG 2.4.2). A move to a new page announces the title of the new page,
// because the focus stays on the link in the sidebar.

function Loading() {
	return (
		<PageTabs tabs={['Spinner', 'Dots']}>
			<p>Spinner tab</p>
		</PageTabs>
	)
}

function renderLoading(path: string) {
	return renderShell(path, {
		children: [
			{
				id: '/loading',
				path: 'loading',
				Component: Loading,
				children: [{ path: 'dots', Component: () => <p>Dots tab</p> }],
			},
			{ id: '/button', path: 'button', Component: () => <p>Button page</p> },
			{ path: '*', Component: Outlet },
		],
	})
}

/** The text of the polite live region, after its first write lands. */
async function politeText(clock: FakeClock): Promise<string | undefined> {
	await clock.nextFrame()

	await clock.advance(FIRST_WRITE_DELAY_MS)

	return politeRegion()?.textContent ?? undefined
}

function politeRegion(): Element | null {
	return document.querySelector('[data-slot="live-region"][aria-live="polite"]')
}

describe('docs page title', () => {
	it('puts the name of the tab before the name of the page', () => {
		renderLoading('/loading/dots')

		expect(screen.getByText('Dots tab')).toBeTruthy()

		expect(document.title).toBe('Dots · Loading · Docs')
	})

	it('names the first tab at the path of the page', () => {
		renderLoading('/loading')

		expect(document.title).toBe('Spinner · Loading · Docs')
	})
})

describe('docs page announcement', () => {
	clockIt(
		'announces the title of a new page, and not the first page or a new tab',
		async ({ clock, signal }) => {
			const router = renderLoading('/button')

			expect(await politeText(clock)).toBeFalsy()

			await act(() => router.navigate('/loading'))

			expect(await politeText(clock)).toBe('Loading')

			signal.throwIfAborted()

			const region = politeRegion()

			if (region) region.textContent = ''

			await act(() => router.navigate('/loading/dots'))

			expect(await politeText(clock)).toBeFalsy()
		},
	)
})
