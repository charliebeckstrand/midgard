import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Rating } from '../../components/rating'
import { frames, present, renderUI } from '../helpers'

/**
 * The focus ring of an interactive Rating goes around the star, not around the
 * wider cell of its hit area (real paint). jsdom compiles no Tailwind, so only
 * a real browser reads the outline back.
 */
describe('Rating focus ring (real browser)', () => {
	it.each([
		['a whole step', 1],
		['a half step', 0.5],
	] as const)('draws one ring, around the star, at %s', async (_name, step) => {
		renderUI(
			<>
				<button type="button">Before</button>
				<Rating defaultValue={2} step={step} size="sm" />
			</>,
		)

		present<HTMLElement>(document.querySelector('button'), 'button').focus()

		await userEvent.keyboard('{Tab}')

		await frames(2)

		const ringed = [...document.querySelectorAll<HTMLElement>('[data-slot="rating"] *')].filter(
			(element) => getComputedStyle(element).outlineStyle === 'solid',
		)

		expect(ringed).toHaveLength(1)

		const [star] = ringed as [HTMLElement]

		const glyph = present<SVGElement>(star.querySelector('svg'), 'svg')

		expect(star.getBoundingClientRect().width).toBe(glyph.getBoundingClientRect().width)
	})

	// `overflow-y-auto` clips an outset outline, so inside a scroll region each
	// step draws the ring as a 2 px border of the star.
	it.each([
		['a whole step', 1],
		['a half step', 0.5],
	] as const)('draws a border, not an outline, in a scroll region at %s', async (_name, step) => {
		renderUI(
			<div data-scroll-region="" className="overflow-y-auto">
				<button type="button">Before</button>
				<Rating defaultValue={2} step={step} size="sm" />
			</div>,
		)

		present<HTMLElement>(document.querySelector('button'), 'button').focus()

		await userEvent.keyboard('{Tab}')

		await frames(2)

		const stars = [...document.querySelectorAll<HTMLElement>('[data-slot="rating"] *')]

		expect(stars.filter((element) => getComputedStyle(element).outlineStyle === 'solid')).toEqual(
			[],
		)

		expect(
			stars.filter((element) => getComputedStyle(element).borderTopWidth === '2px'),
		).toHaveLength(1)
	})
})
