import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GameCard } from '../components/game-card'
import { PickLine } from '../components/pick-line'
import { game } from './fixtures'

// A postponed game, and a pick saved before the line posted.
const postponed = game({ id: 'g1', state: 'postponed' })

const pick = { team: '2', line: null }

describe('a postponed or a canceled game', () => {
	it('does not say that the closing line scores the pick', () => {
		const lined = { ...postponed, spread: { favorite: '12', points: 7 } }

		const html = renderToStaticMarkup(createElement(PickLine, { game: lined, pick, team: 'BUF' }))

		expect(html).not.toContain('closing line')
	})

	it('shows no pending line, because no line scores the pick', () => {
		const html = renderToStaticMarkup(
			createElement(PickLine, { game: postponed, pick, team: 'BUF' }),
		)

		expect(html).not.toContain('Line pending')
	})

	it('gives the mark of the pick no points', () => {
		const lined = { ...postponed, spread: { favorite: '12', points: 7 } }

		const html = renderToStaticMarkup(createElement(GameCard, { game: lined, pick }))

		expect(html).not.toContain('point')
	})
})
