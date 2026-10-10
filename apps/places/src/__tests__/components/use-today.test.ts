import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useToday } from '../../components/place-form-drawer/use-today'

/** Renders whether `useToday` gives a day. */
function Today() {
	return useToday() === null ? 'pending' : 'known'
}

describe('useToday', () => {
	it('gives no day on the server, so the server never draws a day of its own clock', () => {
		expect(renderToString(h(Today))).toBe('pending')
	})
})
