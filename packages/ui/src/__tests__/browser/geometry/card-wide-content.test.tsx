import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Card, CardBody, CardFooter } from '../../../components/card'
import { Stat, StatLabel, StatValue } from '../../../components/stat'
import { getSlot, renderUI, screen } from '../../helpers'

/**
 * Content wider than a card stays inside the card.
 *
 * The card clips its overflow, because media fills the card to its rounded
 * edge. Thus content that runs past the edge of the card is hidden, and the
 * user cannot scroll to it. The footer wraps a row of actions that is wider
 * than the card. The body breaks a token that is wider than the card.
 *
 * The clip is not a scroll container. Thus a card in a flex row is at least as
 * wide as its widest word, and the body does not break a word to fit a row.
 *
 * Rides the real browser because the claim is a computed one: jsdom lays out no
 * box.
 */

/** The width of the box around the card. */
const WIDTH = 240

/** Four actions. Their row is wider than {@link WIDTH}. */
const ACTIONS = ['Save changes', 'Cancel', 'Archive', 'Delete'] as const

/** A SHA-256 digest: one token with no break opportunity, wider than {@link WIDTH}. */
const TOKEN = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

describe('content wider than a card (real browser)', () => {
	it('wraps a row of actions in the footer', () => {
		const { container } = renderUI(
			<div style={{ width: WIDTH }}>
				<Card>
					<CardFooter>
						{ACTIONS.map((label) => (
							<Button key={label}>{label}</Button>
						))}
					</CardFooter>
				</Card>
			</div>,
		)

		const card = getSlot(container, 'card')

		const footer = getSlot(container, 'card-footer')

		for (const label of ACTIONS) {
			expect(footer).toContainBox(screen.getByRole('button', { name: label }))
		}

		const top = (label: string) =>
			screen.getByRole('button', { name: label }).getBoundingClientRect().top

		expect(top('Delete')).toBeGreaterThan(top('Save changes'))

		// The clip of the card hides no part of the row.
		expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth)
	})

	it('breaks a long token in the body', () => {
		const { container } = renderUI(
			<div style={{ width: WIDTH }}>
				<Card>
					<CardBody>
						<span>{TOKEN}</span>
					</CardBody>
				</Card>
			</div>,
		)

		const card = getSlot(container, 'card')

		const body = getSlot(container, 'card-body')

		expect(body).toContainBox(screen.getByText(TOKEN))

		// The clip of the card hides no part of the token.
		expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth)
	})

	it('does not shrink below its widest word in a flex row', () => {
		const { container } = renderUI(
			<div style={{ display: 'flex', width: WIDTH }}>
				{['$12,345', '8,421', '2.4%'].map((value) => (
					<Card key={value} className="flex-1">
						<CardBody>
							<Stat>
								<StatLabel>Metric</StatLabel>
								<StatValue>{value}</StatValue>
							</Stat>
						</CardBody>
					</Card>
				))}
			</div>,
		)

		const value = getSlot(container, 'stat-value')

		// One line: the value is no taller than its line box.
		const line = Number.parseFloat(getComputedStyle(value).lineHeight)

		expect(value.getBoundingClientRect().height).toBeLessThanOrEqual(line)

		expect(getSlot(container, 'card').scrollWidth).toBeLessThanOrEqual(
			getSlot(container, 'card').clientWidth,
		)
	})
})
