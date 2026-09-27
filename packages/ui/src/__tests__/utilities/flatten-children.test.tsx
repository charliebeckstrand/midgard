// @vitest-environment node
import { isValidElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
	flattenChildren,
	hasChildOfType,
	isElementOfType,
	partitionByType,
} from '../../utilities/flatten-children'

function Slot({ children }: { children?: ReactNode }) {
	return <span>{children}</span>
}

function Other() {
	return null
}

describe('flattenChildren', () => {
	it('walks into each Fragment and keys each child by its path', () => {
		const flat = flattenChildren([
			<Other key="a" />,
			<>
				<Slot />
				{false}
			</>,
		])

		expect(flat.map(({ key }) => key)).toEqual(['a', '1.0', '1.1'])
	})
})

describe('isElementOfType', () => {
	it('matches an element of the type only', () => {
		expect(isElementOfType(<Slot />, Slot)).toBe(true)

		expect(isElementOfType(<Other />, Slot)).toBe(false)

		expect(isElementOfType('text', Slot)).toBe(false)
	})
})

describe('hasChildOfType', () => {
	it('finds a slot inside a Fragment', () => {
		expect(
			hasChildOfType(
				<>
					<Other />
					<Slot />
				</>,
				Slot,
			),
		).toBe(true)

		expect(hasChildOfType(<Other />, Slot)).toBe(false)
	})
})

describe('partitionByType', () => {
	it('splits through a Fragment and gives each element a unique key', () => {
		const { matched, rest } = partitionByType(
			[
				'lead',
				<Other key="o" />,
				<>
					<Slot>one</Slot>
					<Slot>two</Slot>
				</>,
			],
			Slot,
		)

		expect(matched).toHaveLength(2)

		expect(matched.map((element) => element.key)).toEqual(['2.0', '2.1'])

		expect(rest[0]).toBe('lead')

		expect(isValidElement(rest[1]) && rest[1].key).toBe('o')
	})
})
