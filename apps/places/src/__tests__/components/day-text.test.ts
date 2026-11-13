// @vitest-environment jsdom
import { act, cleanup } from '@testing-library/react'
import { createElement as h } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DayText, DayTextProvider } from '../../components/day-text'
import { DaySpan } from '../../components/summary-drawer'
import { dayTexts } from '../../utilities/day-text'
import { placeOn, trip } from '../fixtures'

afterEach(cleanup)

const texts = dayTexts([placeOn('a', '2026-08-15')], [trip('t')])

describe('dayTexts', () => {
	it('writes each day of a visit and each span of a trip', () => {
		expect(texts).toEqual({
			'2026-08-15': 'Aug 15, 2026',
			'2026-09-25/2026-09-28': expect.stringMatching(/^Sep 25\s–\s28, 2026$/),
		})
	})
})

describe('DayText', () => {
	it('hydrates with the text of the server when the browser writes other text', async () => {
		const tree = () =>
			h(DayTextProvider, {
				texts,
				children: [
					h(DayText, { key: 'day', value: '2026-08-15' }),
					h(DaySpan, { key: 'span', from: '2026-09-25', to: '2026-09-28' }),
				],
			})

		const container = document.body.appendChild(document.createElement('div'))

		container.innerHTML = renderToString(tree())

		// The date data of the engine of a browser can give other text than the
		// date data of the server. The days that the page read keep the text of the
		// server, so the hydration render has the text of the HTML.
		const prototype: { format: unknown; formatRange: unknown } = Intl.DateTimeFormat.prototype

		vi.spyOn(prototype, 'format', 'get').mockReturnValue(() => 'other')

		vi.spyOn(prototype, 'formatRange', 'get').mockReturnValue(() => 'other')

		const errors: unknown[] = []

		let root: Root | undefined

		await act(async () => {
			root = hydrateRoot(container, tree(), { onRecoverableError: (error) => errors.push(error) })
		})

		vi.restoreAllMocks()

		expect(errors).toEqual([])

		expect(container.querySelector('time')?.textContent).toBe('Aug 15, 2026')

		expect(container.textContent).toContain(texts['2026-09-25/2026-09-28'])

		act(() => root?.unmount())
	})

	it('writes a day that the page did not read in the browser', async () => {
		const container = document.body.appendChild(document.createElement('div'))

		const tree = () => h(DayTextProvider, { texts, children: h(DayText, { value: '2026-10-04' }) })

		container.innerHTML = renderToString(tree())

		expect(container.querySelector('[data-slot="placeholder"]')).not.toBeNull()

		let root: Root | undefined

		await act(async () => {
			root = hydrateRoot(container, tree())
		})

		expect(container.querySelector('time')?.textContent).toBe('Oct 4, 2026')

		act(() => root?.unmount())
	})
})
