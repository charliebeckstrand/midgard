import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Card, CardBody, CardFooter, CardHeader, type CardProps } from '../../../components/card'
import { getSlot, present, renderUI } from '../../helpers'

/**
 * Each block edge of a card has one source of padding. The frame pads the
 * outer edges. A section pads only an inner edge that it shares with a
 * sibling. Thus a header at the bottom edge and a footer at the top edge add
 * no pad, and a header and a footer with no body between them share one pad.
 *
 * Each case runs in the scope of the root and in the scope of a sized card,
 * because a section pad is a stepped class behind a variant.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no
 * stylesheet.
 */

/** A block of fixed height, so that each edge of the content is a whole pixel. */
const content = <div className="h-5" />

/**
 * The space on each block edge of the content of a card: above the first
 * section, between each two sections, and below the last section.
 */
function spaces(size: CardProps['size'], sections: ReactNode): number[] {
	const card = getSlot(renderUI(<Card size={size}>{sections}</Card>).container, 'card')

	const frame = card.getBoundingClientRect()

	const result: number[] = []

	let edge = frame.top

	for (const section of card.children) {
		const box = present(
			section.firstElementChild,
			'the content of a section',
		).getBoundingClientRect()

		result.push(box.top - edge)

		edge = box.bottom
	}

	result.push(frame.bottom - edge)

	return result
}

/** The padding of the frame on its top edge: the one pad that each edge takes. */
function framePad(size: CardProps['size']): number {
	const card = getSlot(renderUI(<Card size={size}>{content}</Card>).container, 'card')

	return Number.parseFloat(getComputedStyle(card).paddingTop)
}

describe.each([undefined, 'sm', 'lg'] as const)('Card section edges at size %s', (size) => {
	it('pads each edge of a card with a header, a body, and a footer once', () => {
		const pad = framePad(size)

		expect(pad).toBeGreaterThan(0)

		expect(
			spaces(
				size,
				<>
					<CardHeader>{content}</CardHeader>
					<CardBody>{content}</CardBody>
					<CardFooter>{content}</CardFooter>
				</>,
			),
		).toEqual([pad, pad, pad, pad])
	})

	it('pads the bottom edge of a card with only a header once', () => {
		const pad = framePad(size)

		expect(spaces(size, <CardHeader>{content}</CardHeader>)).toEqual([pad, pad])
	})

	it('pads the top edge of a card with only a footer once', () => {
		const pad = framePad(size)

		expect(spaces(size, <CardFooter>{content}</CardFooter>)).toEqual([pad, pad])
	})

	it('pads the edge between a header and a footer with no body once', () => {
		const pad = framePad(size)

		expect(
			spaces(
				size,
				<>
					<CardHeader>{content}</CardHeader>
					<CardFooter>{content}</CardFooter>
				</>,
			),
		).toEqual([pad, pad, pad])
	})
})
