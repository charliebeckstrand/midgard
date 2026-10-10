import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useToday } from '../../components/place-form-drawer/use-today'
import { toDay } from '../../utilities/places-filter'

/** Renders the day that `useToday` gives, as the server or the hydration render does. */
function Today() {
	return toDay(useToday().today)
}

/** The day in a render with the process clock in `zone`. */
function renderIn(zone: string): string {
	vi.stubEnv('TZ', zone)

	return renderToString(h(Today))
}

describe('useToday', () => {
	afterEach(() => {
		vi.unstubAllEnvs()

		vi.useRealTimers()
	})

	it('gives the server and the hydration render the same day in every time zone', () => {
		// The evening of 9 October in Denver, and already 10 October in UTC.
		vi.useFakeTimers({ now: new Date('2026-10-10T02:35:00Z'), toFake: ['Date'] })

		const server = renderIn('UTC')

		expect(server).toBe('2026-10-10')

		expect(renderIn('America/Denver')).toBe(server)

		expect(renderIn('Asia/Tokyo')).toBe(server)
	})
})
