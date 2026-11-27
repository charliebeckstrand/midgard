// @vitest-environment node
import { Fragment, isValidElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
	flattenFragments,
	hasChildOfType,
	hasContent,
	isElementOfType,
	partitionByType,
} from '../../utilities/children'

function Slot({ children }: { children?: ReactNode }) {
	return <span>{children}</span>
}

function Other() {
	return null
}

describe('flattenFragments', () => {
	it('walks into each Fragment and keys each child by its path', () => {
		const flat = flattenFragments([
			<Other key="a" />,
			<>
				<Slot />
				{false}
			</>,
		])

		expect(flat.map(({ key }) => key)).toEqual(['$a', '1.0', '1.1'])
	})

	it('keeps an explicit key apart from the index of an unkeyed sibling', () => {
		const { children } = (
			<Slot>
				<Other key="1" />
				<Other key="0" />
				<Other />
				<Other />
			</Slot>
		).props

		const flat = flattenFragments(children)

		expect(flat.map(({ key }) => key)).toEqual(['$1', '$0', '2', '3'])
	})

	it('carries the key of a keyed Fragment, so its children keep their keys when it moves', () => {
		const keys = (order: string[]) =>
			flattenFragments(
				order.map((id) => (
					<Fragment key={id}>
						<Slot />
					</Fragment>
				)),
			).map(({ key }) => key)

		expect(keys(['a', 'b'])).toEqual(['$a.0', '$b.0'])

		expect(keys(['b', 'a'])).toEqual(['$b.0', '$a.0'])
	})

	it('escapes a dot in an explicit key, so it cannot read as a Fragment path', () => {
		const flat = flattenFragments([
			<Other key="a.0" />,
			<Fragment key="a">
				<Slot />
			</Fragment>,
		])

		expect(new Set(flat.map(({ key }) => key)).size).toBe(2)
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

describe('hasContent', () => {
	it.each<[string, ReactNode]>([
		['undefined', undefined],
		['null', null],
		['true', true],
		['false', false],
		["''", ''],
		['an empty array', []],
		['an array of empty nodes', [null, false, '']],
		[
			'a Fragment of empty nodes',
			<Fragment key="f">
				{false}
				{''}
			</Fragment>,
		],
		['a nested Fragment of empty nodes', <>{[<Fragment key="f">{null}</Fragment>]}</>],
	])('reads %s as empty', (_, node) => {
		expect(hasContent(node)).toBe(false)
	})

	it.each<[string, ReactNode]>([
		['0', 0],
		['a string', 'Note'],
		['an element', <Other key="o" />],
		['an element with no children', <span key="s" />],
		[
			'a Fragment with an element',
			<>
				{false}
				<Other />
			</>,
		],
		['an array with one string', [null, 'Note']],
	])('reads %s as content', (_, node) => {
		expect(hasContent(node)).toBe(true)
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

		expect(isValidElement(rest[1]) && rest[1].key).toBe('$o')
	})
})
